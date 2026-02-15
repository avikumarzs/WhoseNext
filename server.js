const express = require('express');
const app = express();
const path = require('path');
const XLSX = require('xlsx'); 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DATA STORES
let placementQueue = [];
let masterDatabase = []; 
let companyName = "PLACEMENT DRIVE 2026";

// --- ROUTES ---

// 1. Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/results', (req, res) => res.sendFile(path.join(__dirname, 'public', 'results.html')));

// 2. Company Info
app.post('/set-company', (req, res) => { companyName = req.body.company; res.json({ message: "Updated" }); });
app.get('/get-company', (req, res) => { res.json({ company: companyName }); });

// 3. Get Queue
app.get('/get-queue', (req, res) => { 
    res.json(placementQueue); 
});

// 4. Add Student
app.post('/add-student', (req, res) => {
    console.log("📥 Receiving Add Request:", req.body); // DEBUG LOG

    const name = req.body.name || "Unknown Candidate"; 
    const room = req.body.room || "Waiting Area";
    
    let pathArray = [];
    if (room.includes('➜')) pathArray = room.split('➜').map(s => s.trim());
    else if (room.includes(',')) pathArray = room.split(',').map(s => s.trim());
    else pathArray = [room.trim()];

    const newStudent = { 
        name, path: pathArray, currentStep: 0, status: 'waiting', decision: 'Pending', id: Date.now() 
    };

    placementQueue.push(newStudent);
    masterDatabase.push(newStudent);
    
    console.log("✅ Student Added:", newStudent.name); // DEBUG LOG
    res.json({ message: "Added" });
});

// 5. Update Status (THE CRITICAL PART)
app.post('/update-status', (req, res) => {
    const { index, action } = req.body;
    
    console.log(`🔄 Update Request received for Index: ${index}, Action: ${action}`); // DEBUG LOG

    if (!placementQueue[index]) {
        console.error("❌ ERROR: Student not found at index " + index);
        console.error("   -> Did you restart the server? The queue might be empty.");
        return res.json({ message: "Student not found" });
    }

    const student = placementQueue[index];
    const masterRecord = masterDatabase.find(s => s.id === student.id);

    if (action === 'call') {
        student.status = 'interviewing';
        if(masterRecord) masterRecord.status = 'Interviewing';
        console.log(`📢 Status changed to INTERVIEWING for ${student.name}`); // DEBUG LOG
    } 
    else if (action === 'next') {
        student.currentStep++;
        student.status = 'waiting';
        console.log(`➡️ Moved ${student.name} to next room`); // DEBUG LOG
    } 
    else if (action === 'finish') {
        if(masterRecord) masterRecord.status = 'Finished';
        placementQueue.splice(index, 1);
        console.log(`✅ Finished interview for ${student.name}`); // DEBUG LOG
    }

    res.json({ message: "Updated" });
});

app.delete('/remove-student/:index', (req, res) => {
    placementQueue.splice(req.params.index, 1);
    res.json({ message: "Removed" });
});

app.get('/get-results', (req, res) => {
    const pending = masterDatabase.filter(s => s.status === 'Finished' && s.decision === 'Pending');
    res.json(pending);
});

app.post('/process-decision', (req, res) => {
    const { id, decision } = req.body;
    const student = masterDatabase.find(s => s.id === id);
    if (student) student.decision = decision; 
    res.json({ message: "Saved" });
});

app.get('/download-excel', (req, res) => {
    const dataForExcel = masterDatabase.map(s => ({
        "Candidate Name": s.name,
        "Room / Path": s.path.join(' -> '),
        "Current Status": s.status,
        "Selection Decision": s.decision
    }));
    const workSheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "Candidates");
    const buffer = XLSX.write(workBook, { bookType: "xlsx", type: "buffer" });
    res.setHeader('Content-Disposition', 'attachment; filename="Final_Shortlist_Report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

app.listen(3001, () => {
    console.log("🚀 SERVER STARTED. Waiting for requests...");
});