const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
    companyName: { type: String, default: "Placement Drive" },
    driveDate: { type: String, default: "" }
});

module.exports = mongoose.model('Config', ConfigSchema);