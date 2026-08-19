const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    prn: { type: String, default: 'N/A' },
    name: { type: String, required: true },
    branch: { type: String, default: 'N/A' },
    path: [String],
    currentStep: { type: Number, default: 0 },
    status: { type: String, default: 'unmarked' },
    history: [{ room: String, result: String }],
    finalStatus: { type: String, default: null } 
});

module.exports = mongoose.model('Student', StudentSchema);