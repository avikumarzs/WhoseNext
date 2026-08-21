const Student = require('../models/Student');

// Helper Function
const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

exports.getQueue = async (req, res) => {
    const students = await Student.find();
    res.json(students);
};

exports.addStudent = async (req, res) => {
    const { prn, name, branch, room, status } = req.body;
    const pathArray = room.includes(',') ? room.split(',').map(s => s.trim()) : [room.trim()];
    
    await Student.create({
        prn: prn ? prn.trim() : 'N/A',
        name: toTitleCase(name.trim()),
        branch: branch ? branch.trim() : 'N/A',
        path: pathArray,
        status: status || 'unmarked'
    });

    req.app.get('io').emit('queueUpdated');
    res.json({ message: "Added" });
};

exports.addBulkStudents = async (req, res) => {
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
                name: toTitleCase(String(st.name).trim()),
                branch: String(st.branch || 'N/A').trim(),
                path: pathArray,
                status: st.status || 'unmarked'
            };
        });

        await Student.insertMany(formattedStudents);
        req.app.get('io').emit('queueUpdated');
        res.json({ message: "Bulk upload successful", count: formattedStudents.length });
    } catch (err) {
        console.error("Bulk Upload Error:", err);
        res.status(500).json({ error: "Failed to process excel data" });
    }
};

exports.editStudent = async (req, res) => {
    const { index, newPath } = req.body;
    const pathArray = newPath.includes(',') ? newPath.split(',').map(s => s.trim()) : [newPath.trim()];
    const students = await Student.find({ status: { $ne: 'finished' } });
    const student = students[index];
    
    if (student) {
        student.path = pathArray;
        await student.save();
        req.app.get('io').emit('queueUpdated');
        res.json({ message: "Updated" });
    } else {
        res.status(404).json({ message: "Not found" });
    }
};

exports.updateStatus = async (req, res) => {
    const { index, action } = req.body;
    const students = await Student.find({ status: { $ne: 'finished' } });
    const student = students[index];

    if (!student) return res.status(404).json({ error: "Student not found" });

    const currentRoom = student.path[student.currentStep] || "Unknown";

    if (action === 'call') {
        student.status = 'interviewing';
        req.app.get('io').emit('playChime'); 
    } else if (action === 'absent') {
        student.status = 'absent';
    } else if (action === 'waiting') {
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
    req.app.get('io').emit('queueUpdated');
    res.json({ success: true });
};

exports.updateFinalStatus = async (req, res) => {
    const { index, finalStatus } = req.body;
    const students = await Student.find({ status: { $ne: 'finished' } });
    const student = students[index];

    if (student) {
        student.finalStatus = finalStatus;
        await student.save();
        req.app.get('io').emit('queueUpdated');
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Student not found" });
    }
};

exports.removeStudent = async (req, res) => {
    const students = await Student.find({ status: { $ne: 'finished' } });
    const student = students[req.params.index];
    if (student) {
        await Student.deleteOne({ _id: student._id });
        req.app.get('io').emit('queueUpdated');
    }
    res.json({ message: "Removed" });
};

exports.resetAll = async (req, res) => {
    await Student.deleteMany({});
    req.app.get('io').emit('queueUpdated');
    res.json({ message: "Reset" });
};

// --- NEW MASTER OVERRIDE FUNCTION ---
exports.overrideStatus = async (req, res) => {
    try {
        const { index, target, newStatus } = req.body;
        const students = await Student.find({ status: { $ne: 'finished' } });
        const student = students[index];

        if (!student) return res.status(404).json({ error: "Student not found" });

        // OVERRIDE FINAL VERDICT
        if (target === 'final') {
            if (newStatus === 'pending') student.finalStatus = 'Pending';
            else if (newStatus === 'passed') student.finalStatus = 'Selected';
            else if (newStatus === 'failed') student.finalStatus = 'Rejected';
            else if (newStatus === 'hold') student.finalStatus = 'Put on Hold';
        } 
        // OVERRIDE A SPECIFIC INTERVIEW ROUND
        else {
            const roundIdx = parseInt(target);
            
            // "Time Travel" logic: Wipes out history that happened AFTER this specific round
            if (student.history && student.history.length > roundIdx) {
                student.history = student.history.slice(0, roundIdx);
            }
            
            // Reset Final Verdict to ensure data consistency
            student.finalStatus = 'Pending';
            
            if (newStatus === 'pending') {
                student.currentStep = roundIdx;
                student.status = 'waiting';
            } else if (newStatus === 'hold') {
                student.currentStep = roundIdx;
                student.status = 'hold';
            } else if (newStatus === 'passed') {
                // Mark this round as passed
                student.history[roundIdx] = { room: student.path[roundIdx], result: 'Selected' };
                // Move them forward
                if (roundIdx < student.path.length - 1) {
                    student.currentStep = roundIdx + 1;
                    student.status = 'waiting';
                } else {
                    student.currentStep = roundIdx + 1;
                    student.status = 'completed'; // Passed the very last round
                }
            } else if (newStatus === 'failed') {
                // Mark this round as failed and reject them
                student.history[roundIdx] = { room: student.path[roundIdx], result: 'Rejected' };
                student.currentStep = roundIdx;
                student.status = 'rejected';
            }
            
            student.markModified('history'); 
        }

        await student.save();
        req.app.get('io').emit('queueUpdated');
        res.json({ success: true });
        
    } catch (err) {
        console.error("Override Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};