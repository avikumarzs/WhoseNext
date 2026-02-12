const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data Store
let placementQueue = [];
let companyName = "PLACEMENT DRIVE 2026"; // Default Title

// --- ROUTES ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

// 1. COMPANY NAME ROUTES
app.post('/set-company', (req, res) => {
    companyName = req.body.company;
    res.json({ message: "Updated" });
});

app.get('/get-company', (req, res) => {
    res.json({ company: companyName });
});

// 2. QUEUE ROUTES (Standard)
app.post('/add-student', (req, res) => {
    const { name, room } = req.body;
    let pathArray = [];
    
    // Parse Path
    if (room.includes('➜')) pathArray = room.split('➜').map(s => s.trim());
    else if (room.includes(',')) pathArray = room.split(',').map(s => s.trim());
    else pathArray = [room.trim()];

    placementQueue.push({ 
        name, path: pathArray, currentStep: 0, status: 'waiting', id: Date.now() 
    });
    res.json({ message: "Added" });
});

app.get('/get-queue', (req, res) => {
    res.json(placementQueue);
});

app.post('/update-status', (req, res) => {
    const { index, action } = req.body;
    const student = placementQueue[index];
    if (student) {
        if (action === 'call') student.status = 'interviewing';
        else if (action === 'next') { student.currentStep++; student.status = 'waiting'; }
        else if (action === 'finish') placementQueue.splice(index, 1);
    }
    res.json({ message: "Updated" });
});

app.delete('/remove-student/:index', (req, res) => {
    placementQueue.splice(req.params.index, 1);
    res.json({ message: "Removed" });
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));