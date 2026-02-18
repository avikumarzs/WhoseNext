const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path'); // 1. Added path module
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const DATA_FILE = 'placement_data.json';

// --- DATA STORE ---
let placementQueue = [];   // Candidates currently in the process
let masterDatabase = [];   // All candidates history
let companyName = "Placement Drive";

app.use(express.static('public'));
app.use(express.json());

// --- 2. FIX FOR "Cannot GET /" ---
// This tells the server: "When user visits /, show them user.html"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

// This makes accessing admin easier (http://localhost:3001/admin)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- PERSISTENCE ---
if (fs.existsSync(DATA_FILE)) {
    try {
        const raw = fs.readFileSync(DATA_FILE);
        const data = JSON.parse(raw);
        placementQueue = data.queue || [];
        masterDatabase = data.master || [];
        companyName = data.company || "Placement Drive";
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

function saveData() {
    const payload = { queue: placementQueue, master: masterDatabase, company: companyName };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
}

// --- ROUTES ---

app.get('/get-queue', (req, res) => res.json(placementQueue));
app.get('/get-company', (req, res) => res.json({ company: companyName }));

app.post('/set-company', (req, res) => {
    companyName = req.body.company;
    saveData();
    io.emit('queueUpdated');
    res.json({ message: "Updated" });
});

app.post('/add-student', (req, res) => {
    const { name, room } = req.body;
    let pathArray = room.includes(',') ? room.split(',').map(s => s.trim()) : [room.trim()];
    
    const newStudent = {
        id: Date.now().toString(),
        name: name.trim(),
        path: pathArray,
        currentStep: 0,
        status: 'waiting', 
        history: [],       
        finalVerdict: 'Pending' 
    };

    placementQueue.push(newStudent);
    masterDatabase.push(newStudent);
    saveData();
    io.emit('queueUpdated');
    res.json({ message: "Added" });
});

app.post('/edit-student', (req, res) => {
    const { index, newPath } = req.body;
    const student = placementQueue[index];
    if (student) {
        let pathArray = [];
        if (newPath.includes(',')) pathArray = newPath.split(',').map(s => s.trim());
        else pathArray = [newPath.trim()];

        student.path = pathArray;
        // Sync master
        const masterRecord = masterDatabase.find(s => s.id === student.id);
        if (masterRecord) masterRecord.path = pathArray;

        saveData();
        io.emit('queueUpdated');
        res.json({ message: "Updated" });
    } else {
        res.status(404).json({ message: "Not found" });
    }
});

app.delete('/remove-student/:index', (req, res) => {
    const index = req.params.index;
    const student = placementQueue[index];
    if (student) {
        const masterRecord = masterDatabase.find(s => s.id === student.id);
        if (masterRecord) masterRecord.finalVerdict = 'Removed by Admin';
        placementQueue.splice(index, 1);
        saveData();
        io.emit('queueUpdated');
    }
    res.json({ message: "Removed" });
});

app.post('/reset-all', (req, res) => {
    placementQueue = [];
    masterDatabase = [];
    saveData();
    io.emit('queueUpdated');
    res.json({ message: "Reset" });
});

// --- CORE LOGIC: NON-KNOCKOUT SYSTEM ---
app.post('/update-status', (req, res) => {
    const { index, action } = req.body;
    const student = placementQueue[index];
    
    if (!student) return res.status(404).json({ error: "Student not found" });

    const currentRoom = student.path[student.currentStep] || "Unknown";

    if (action === 'call') {
        student.status = 'interviewing';
    } 
    else {
        // ACTION IS EITHER 'pass' OR 'fail'
        // Both actions now move the student FORWARD.
        
        const resultString = (action === 'pass') ? 'Selected' : 'Rejected';
        
        // 1. Record Result
        student.history.push({ room: currentRoom, result: resultString });

        // 2. Move to Next Round (Regardless of Pass/Fail)
        if (student.currentStep < student.path.length - 1) {
            student.currentStep++;
            student.status = 'waiting'; 
        } else {
            // 3. If Last Round -> Finish
            student.status = 'finished';
            
            // Auto-calculate final verdict: 
            // If they were rejected in ANY round, Final Status = Rejected.
            // If they were Selected in ALL rounds, Final Status = Selected.
            const hasRejection = student.history.some(h => h.result === 'Rejected');
            student.finalVerdict = hasRejection ? 'Rejected' : 'Selected';
            
            // Sync Master Record
            const masterRecord = masterDatabase.find(s => s.id === student.id);
            if(masterRecord) {
                masterRecord.history = student.history;
                masterRecord.finalVerdict = student.finalVerdict;
            }

            // Remove from Active Queue (Process Complete)
            placementQueue.splice(index, 1);
        }
    }

    saveData();
    io.emit('queueUpdated');
    res.json({ success: true });
});

// --- EXCEL REPORT ---
app.get('/download-excel', (req, res) => {
    const excelData = masterDatabase.map((s, i) => {
        let row = {
            "ID": i + 1,
            "Name": s.name,
            "Path": s.path.join(' -> '),
            "Final Status": s.finalVerdict || s.status
        };

        s.history.forEach((round, index) => {
            row[`Round ${index + 1}`] = `${round.room}: ${round.result}`;
        });

        return row;
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(excelData);
    
    // Auto-width columns
    const wscols = [{wch: 5}, {wch: 20}, {wch: 30}, {wch: 15}, {wch: 25}, {wch: 25}, {wch: 25}];
    ws['!cols'] = wscols;

    xlsx.utils.book_append_sheet(wb, ws, "Placement Report");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Final_Report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

server.listen(3001, () => {
    console.log('🚀 Server running at http://localhost:3001');
});