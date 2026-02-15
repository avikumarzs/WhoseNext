const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DATA_FILE = './placement_data.json';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- PERSISTENCE LOGIC ---

const saveData = () => {
    try {
        const data = { placementQueue, masterDatabase, companyName };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("❌ Failed to save data:", err);
    }
};

const loadData = () => {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const rawData = fs.readFileSync(DATA_FILE);
            return JSON.parse(rawData);
        } catch (err) {
            console.error("❌ Failed to load data:", err);
            return null;
        }
    }
    return null;
};

// --- INITIALIZE DATA (Corrected Logic) ---
const savedState = loadData();

let placementQueue = savedState ? savedState.placementQueue : [];
let masterDatabase = savedState ? savedState.masterDatabase : []; 
let companyName = savedState ? savedState.companyName : "PLACEMENT DRIVE 2026";

if (savedState) console.log("💾 Persistent storage loaded successfully.");

// --- PAGE ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/results', (req, res) => res.sendFile(path.join(__dirname, 'public', 'results.html')));
// --- API ROUTES ---

app.post('/set-company', (req, res) => { 
    companyName = req.body.company; 
    saveData(); // Save change
    io.emit('queueUpdated');
    res.json({ message: "Updated" }); 
});

app.get('/get-company', (req, res) => { 
    res.json({ company: companyName }); 
});

app.get('/get-queue', (req, res) => { 
    res.json(placementQueue); 
});

app.post('/add-student', (req, res) => {
    const name = req.body.name || "Unknown Candidate"; 
    const room = req.body.room || "Waiting Area";
    
    let pathArray = [];
    if (room.includes('➜')) pathArray = room.split('➜').map(s => s.trim());
    else if (room.includes(',')) pathArray = room.split(',').map(s => s.trim());
    else pathArray = [room.trim()];

    const newStudent = { 
        name, 
        path: pathArray, 
        currentStep: 0, 
        status: 'waiting', 
        decision: 'Pending',
        id: Date.now() 
    };

    placementQueue.push(newStudent);
    masterDatabase.push(newStudent);
    
    saveData(); // Save change
    io.emit('queueUpdated');
    res.json({ message: "Added" });
});

app.post('/update-status', (req, res) => {
    const { index, action } = req.body;
    const student = placementQueue[index];

    if (student) {
        const masterRecord = masterDatabase.find(s => s.id === student.id);

        if (action === 'call') {
            student.status = 'Interviewing'; 
            if(masterRecord) masterRecord.status = 'Interviewing';
        } 
        else if (action === 'next') {
            student.currentStep++;
            student.status = 'waiting';
            if(masterRecord) masterRecord.status = 'Waiting';
        } 
        else if (action === 'finish') {
            if(masterRecord) masterRecord.status = 'Finished';
            placementQueue.splice(index, 1);
        }
        
        saveData(); // Save change
        io.emit('queueUpdated');
    }
    res.json({ message: "Updated" });
});

app.delete('/remove-student/:index', (req, res) => {
    const student = placementQueue[req.params.index];
    if (student) {
        const masterRecord = masterDatabase.find(s => s.id === student.id);
        if(masterRecord) {
            masterRecord.status = 'Removed';
            masterRecord.decision = 'Removed from Queue';
        }
        placementQueue.splice(req.params.index, 1);
        saveData(); // Save change
        io.emit('queueUpdated');
    }
    res.json({ message: "Removed" });
});

app.get('/get-results', (req, res) => {
    const pending = masterDatabase.filter(s => s.status === 'Finished' && s.decision === 'Pending');
    res.json(pending);
});

app.post('/process-decision', (req, res) => {
    const { id, decision } = req.body;

    // FIX: Convert the incoming string ID to a Number
    const student = masterDatabase.find(s => s.id === Number(id)); 
    
    if (student) {
        student.decision = decision; 
        saveData(); // Save the "Shortlisted" or "Rejected" status to the JSON file
        
        console.log(`✅ Decision updated for ${student.name}: ${decision}`);
        
        // Notify all pages (including the results page) to refresh
        io.emit('queueUpdated'); 
        res.json({ message: "Saved successfully" });
    } else {
        console.log(`❌ Could not find student with ID: ${id}`);
        res.status(404).json({ message: "Student not found" });
    }
});

app.post('/reset-all', (req, res) => {
    placementQueue = [];
    masterDatabase = [];
    companyName = "PLACEMENT DRIVE 2026";
    saveData(); // Overwrites the file with empty data
    io.emit('queueUpdated'); // Clears all screens instantly
    res.json({ message: "System Reset Successful" });
});

app.get('/download-excel', (req, res) => {
    const dataForExcel = masterDatabase.map(s => ({
        "Candidate Name": s.name,
        "Room / Path": s.path.join(' -> '),
        "Final Status": s.status,
        "Selection Decision": s.decision
    }));

    const workSheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "Candidates");

    const buffer = XLSX.write(workBook, { bookType: "xlsx", type: "buffer" });
    res.setHeader('Content-Disposition', 'attachment; filename="Final_Placement_Report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

server.listen(3001, () => {
    console.log("\n🚀 REAL-TIME PERSISTENT SERVER STARTED");
    console.log("-----------------------------------------------");
    console.log("📺 User Display:   http://localhost:3001/");
    console.log("⚙️  Admin Panel:    http://localhost:3001/admin");
    console.log("📋 Selection Brd:  http://localhost:3001/results");
    console.log("-----------------------------------------------");
});