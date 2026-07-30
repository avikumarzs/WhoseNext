require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// --- HELPER FUNCTION: TITLE CASE ---
const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// --- 1. DATABASE CONNECTION ---
const MONGO_URI = process.env.MONGO_URI || "your_mongodb_atlas_connection_string_here";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- 2. DATA SCHEMAS (UPDATED) ---
const StudentSchema = new mongoose.Schema({
    prn: { type: String, default: 'N/A' },
    name: String,
    branch: { type: String, default: 'N/A' },
    path: [String],
    currentStep: { type: Number, default: 0 },
    status: { type: String, default: 'unmarked' }, // Changed default to unmarked
    history: [{ room: String, result: String }],
    finalStatus: { type: String, default: null } 
});

const ConfigSchema = new mongoose.Schema({
    companyName: { type: String, default: "Placement Drive" },
    driveDate: { type: String, default: "" } // NEW: Store the drive date
});

const Student = mongoose.model('Student', StudentSchema);
const Config = mongoose.model('Config', ConfigSchema);

app.use(express.static('public'));
app.use(express.json());

// --- 3. PAGE ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// --- 4. API ROUTES ---
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/get-company', async (req, res) => {
    let config = await Config.findOne();
    if (!config) config = await Config.create({ companyName: "Placement Drive", driveDate: "" });
    res.json({ company: config.companyName, date: config.driveDate });
});

app.post('/set-company', async (req, res) => {
    const { company, date } = req.body;
    await Config.findOneAndUpdate({}, { companyName: company, driveDate: date }, { upsert: true });
    io.emit('queueUpdated');
    res.json({ message: "Updated" });
});

// UPDATED: Accepts PRN, Branch, and dynamic status with Title Case mapping
app.post('/add-student', async (req, res) => {
    const { prn, name, branch, room, status } = req.body;
    const pathArray = room.includes(',') ? room.split(',').map(s => s.trim()) : [room.trim()];
    
    await Student.create({
        prn: prn ? prn.trim() : 'N/A',
        name: toTitleCase(name.trim()), // Failsafe formatting
        branch: branch ? branch.trim() : 'N/A',
        path: pathArray,
        status: status || 'unmarked' // Defaults to unmarked gatekeeper
    });

    io.emit('queueUpdated');
    res.json({ message: "Added" });
});

// UPDATED: Bulk Add maps PRN, Branch, and explicitly sets unmarked
app.post('/add-bulk-students', async (req, res) => {
    try {
        const { students } = req.body; 
        if (!students || students.length === 0) {
            return res.status(400).json({ error: "No students provided" });
        }

        const formattedStudents = students.map(st => {
            const roomStr = String(st.room || "Waiting Area");
            const pathArray = roomStr.includes(',') ? roomStr.split(',').map(s => s.trim()) : [roomStr.trim()];
            
            return {
                prn: String(st.prn || 'N/A').trim(),
                name: toTitleCase(String(st.name).trim()), // Failsafe formatting
                branch: String(st.branch || 'N/A').trim(),
                path: pathArray,
                status: st.status || 'unmarked' // Respects frontend state
            };
        });

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

// Handles Absent, Hold, Present, and UI flow mapping
app.post('/update-status', async (req, res) => {
    const { index, action } = req.body;
    const students = await Student.find({ status: { $ne: 'finished' } });
    const student = students[index];

    if (!student) return res.status(404).json({ error: "Student not found" });

    const currentRoom = student.path[student.currentStep] || "Unknown";

    if (action === 'call') {
        student.status = 'interviewing';
        io.emit('playChime'); 
    } else if (action === 'absent') {
        student.status = 'absent';
    } else if (action === 'waiting') { // Used for "Mark Present"
        student.status = 'waiting';
    } else if (action === 'hold') {
        student.status = 'hold';
    } else if (action === 'pass' || action === 'fail') {
        const resultString = (action === 'pass') ? 'Selected' : 'Rejected';
        student.history.push({ room: currentRoom, result: resultString });

        if (action === 'fail') {
            student.status = 'rejected';
        } else if (student.currentStep < student.path.length - 1) {
            student.currentStep++;
            student.status = 'waiting';
        } else {
            student.status = 'completed';
        }
    }

    await student.save();
    io.emit('queueUpdated');
    res.json({ success: true });
});

// Endpoint to save Final Status (e.g. Hired/Rejected)
app.post('/update-final-status', async (req, res) => {
    const { index, finalStatus } = req.body;
    const students = await Student.find({ status: { $ne: 'finished' } });
    const student = students[index];

    if (student) {
        student.finalStatus = finalStatus;
        await student.save();
        io.emit('queueUpdated');
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Student not found" });
    }
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

// UPDATED: Generates specific Headers for Excel and injects company details in rows 1 & 2
app.get('/download-excel', async (req, res) => {
    try {
        // Fetch config to get the company name and date
        let config = await Config.findOne();
        const compName = config ? config.companyName : "Placement Drive";
        const compDate = config && config.driveDate ? config.driveDate : "N/A";

        const allStudents = await Student.find();
        const excelData = allStudents.map(s => {
            
            let attendanceStatus = 'Present';
            if (s.status === 'absent') attendanceStatus = 'Absent';
            else if (s.status === 'unmarked') attendanceStatus = 'Unmarked';

            let row = {
                "Student Roll No": s.prn || 'N/A',
                "Student Name": s.name,
                "Branch": s.branch || 'N/A',
                "Present/Absent": attendanceStatus
            };
            
            s.history.forEach((round, index) => {
                row[`Round ${index + 1} Room`] = round.room;
                row[`Round ${index + 1} Status`] = round.result;
            });

            row["Final Status"] = s.finalStatus || 'Pending';
            return row;
        });

        const wb = xlsx.utils.book_new();
        // Shift the JSON data to start at row 3 (A3)
        const ws = xlsx.utils.json_to_sheet(excelData, { origin: "A3" });
        
        // Add the Company Details to the very top
        xlsx.utils.sheet_add_aoa(ws, [
            [`Company Name: ${compName}`],
            [`Drive Date: ${compDate}`]
        ], { origin: "A1" });

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