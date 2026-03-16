require('dotenv').config(); // MUST BE AT THE TOP
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// --- 1. DATABASE CONNECTION ---
const MONGO_URI = process.env.MONGO_URI || "your_mongodb_atlas_connection_string_here";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- 2. DATA SCHEMAS ---
const StudentSchema = new mongoose.Schema({
    name: String,
    path: [String],
    currentStep: { type: Number, default: 0 },
    status: { type: String, default: 'waiting' },
    history: [{ room: String, result: String }],
    finalVerdict: { type: String, default: 'Pending' }
});

const ConfigSchema = new mongoose.Schema({
    companyName: { type: String, default: "Placement Drive" }
});

const Student = mongoose.model('Student', StudentSchema);
const Config = mongoose.model('Config', ConfigSchema);

app.use(express.static('public'));
app.use(express.json());

// --- 3. PAGE ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// --- 4. API ROUTES (Database Driven) ---

// Health Check for Render
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/get-queue', async (req, res) => {
    try {
        const queue = await Student.find({ status: { $ne: 'finished' } });
        res.json(queue);
    } catch (err) {
        res.status(500).json({ error: "DB Error" });
    }
});

app.get('/get-company', async (req, res) => {
    let config = await Config.findOne();
    if (!config) config = await Config.create({ companyName: "Placement Drive" });
    res.json({ company: config.companyName });
});

app.post('/set-company', async (req, res) => {
    const { company } = req.body;
    await Config.findOneAndUpdate({}, { companyName: company }, { upsert: true });
    io.emit('queueUpdated');
    res.json({ message: "Updated" });
});

app.post('/add-student', async (req, res) => {
    const { name, room } = req.body;
    const pathArray = room.includes(',') ? room.split(',').map(s => s.trim()) : [room.trim()];
    
    await Student.create({
        name: name.trim(),
        path: pathArray,
        status: 'waiting'
    });

    io.emit('queueUpdated');
    res.json({ message: "Added" });
});

// NEW: Bulk Add Route for Excel Uploads
app.post('/add-bulk-students', async (req, res) => {
    try {
        const { students } = req.body; // Expects an array of { name, room }
        
        if (!students || students.length === 0) {
            return res.status(400).json({ error: "No students provided" });
        }

        // Format data for MongoDB
        const formattedStudents = students.map(st => {
            const roomStr = String(st.room || "Waiting Area");
            const pathArray = roomStr.includes(',') ? roomStr.split(',').map(s => s.trim()) : [roomStr.trim()];
            
            return {
                name: String(st.name).trim(),
                path: pathArray,
                status: 'waiting'
            };
        });

        // Insert all at once
        await Student.insertMany(formattedStudents);

        io.emit('queueUpdated');
        res.json({ message: "Bulk upload successful", count: formattedStudents.length });
    } catch (err) {
        console.error("Bulk Upload Error:", err);
        res.status(500).json({ error: "Failed to process excel data" });
    }
});

app.post('/edit-student', async (req, res) => {
    const { index, newPath } = req.body;
    const pathArray = newPath.includes(',') ? newPath.split(',').map(s => s.trim()) : [newPath.trim()];
    
    const students = await Student.find({ status: { $ne: 'finished' } });
    const student = students[index];
    
    if (student) {
        student.path = pathArray;
        await student.save();
        io.emit('queueUpdated');
        res.json({ message: "Updated" });
    } else {
        res.status(404).json({ message: "Not found" });
    }
});

app.post('/update-status', async (req, res) => {
    const { index, action } = req.body;
    const students = await Student.find({ status: { $ne: 'finished' } });
    const student = students[index];

    if (!student) return res.status(404).json({ error: "Student not found" });

    const currentRoom = student.path[student.currentStep] || "Unknown";

    if (action === 'call') {
        student.status = 'interviewing';
        io.emit('playChime'); // Broadcasts the chime signal
    } else {
        const resultString = (action === 'pass') ? 'Selected' : 'Rejected';
        student.history.push({ room: currentRoom, result: resultString });

        if (student.currentStep < student.path.length - 1) {
            student.currentStep++;
            student.status = 'waiting';
        } else {
            student.status = 'finished';
            const hasRejection = student.history.some(h => h.result === 'Rejected');
            student.finalVerdict = hasRejection ? 'Rejected' : 'Selected';
        }
    }

    await student.save();
    io.emit('queueUpdated');
    res.json({ success: true });
});

app.delete('/remove-student/:index', async (req, res) => {
    const students = await Student.find({ status: { $ne: 'finished' } });
    const student = students[req.params.index];
    if (student) {
        await Student.deleteOne({ _id: student._id });
        io.emit('queueUpdated');
    }
    res.json({ message: "Removed" });
});

app.post('/reset-all', async (req, res) => {
    await Student.deleteMany({});
    io.emit('queueUpdated');
    res.json({ message: "Reset" });
});

app.get('/download-excel', async (req, res) => {
    try {
        const allStudents = await Student.find();
        const excelData = allStudents.map((s, i) => {
            let row = {
                "ID": i + 1,
                "Name": s.name,
                "Path": s.path.join(' -> ')
            };
            
            // Split history into separate columns
            s.history.forEach((round, index) => {
                row[`Round ${index + 1} Room`] = round.room;
                row[`Round ${index + 1} Status`] = round.result;
            });
            
            return row;
        });

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(excelData);
        xlsx.utils.book_append_sheet(wb, ws, "Placement Report");
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="Final_Report.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error("Excel Download Error:", err);
        res.status(500).send("Error generating excel");
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Live on port ${PORT}`));