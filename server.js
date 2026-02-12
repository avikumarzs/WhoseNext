const express = require('express');
const app = express();
const path = require('path');

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store
let placementQueue = [];

// Log every request to the console for debugging
app.use((req, res, next) => {
    console.log(`${req.method} request for '${req.url}'`);
    next();
});

// Route: Add a student
app.post('/add-student', (req, res) => {
    const { name, room } = req.body;
    console.log(`Adding Student: ${name}, Room: ${room}`);
    placementQueue.push({ name, room });
    res.json({ message: "Success", currentQueue: placementQueue });
});

// Route: Get the queue
app.get('/get-queue', (req, res) => {
    res.json(placementQueue);
});

// Route: Remove a student
app.delete('/remove-student/:index', (req, res) => {
    const index = req.params.index;
    if (index > -1 && index < placementQueue.length) {
        console.log(`Removing student at index: ${index}`);
        placementQueue.splice(index, 1);
    }
    res.json({ message: "Removed" });
});

// Route: Default Home Page (User View)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

// START SERVER ON PORT 3001
app.listen(3001, () => {
    console.log("--------------------------------------------------");
    console.log("✅ SERVER RUNNING ON PORT 3001 (New Port)");
    console.log("👉 Admin Dashboard: http://localhost:3001/admin.html");
    console.log("👉 User Dashboard:  http://localhost:3001/");
    console.log("--------------------------------------------------");
});