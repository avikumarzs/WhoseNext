const Config = require('../models/Config');
const Student = require('../models/Student');
const xlsx = require('xlsx');

exports.getCompany = async (req, res) => {
    let config = await Config.findOne();
    if (!config) config = await Config.create({ companyName: "Placement Drive", driveDate: "" });
    res.json({ company: config.companyName, date: config.driveDate });
};

exports.setCompany = async (req, res) => {
    const { company, date } = req.body;
    await Config.findOneAndUpdate({}, { companyName: company, driveDate: date }, { upsert: true });
    req.app.get('io').emit('queueUpdated');
    res.json({ message: "Updated" });
};

exports.downloadExcel = async (req, res) => {
    try {
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
            
            // Feature 2 Logic: If absent, completely skip adding round details to the row
            if (s.status !== 'absent') {
                s.history.forEach((round, index) => {
                    row[`Round ${index + 1} Room`] = round.room;
                    row[`Round ${index + 1} Status`] = round.result;
                });
                row["Final Status"] = s.finalStatus || 'Pending';
            } else {
                // Ensure Final Status is N/A for absent students instead of 'Pending'
                row["Final Status"] = 'N/A';
            }

            return row;
        });

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(excelData, { origin: "A3" });
        
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
};
