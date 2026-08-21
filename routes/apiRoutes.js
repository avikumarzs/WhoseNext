const express = require('express');
const router = express.Router();

const adminController = require('../controllers/AdminController'); // Capital A fix for Render
const queueController = require('../controllers/queueController');

// Health Check
router.get('/health', (req, res) => res.status(200).send('OK'));

// Admin / Config Routes
router.get('/get-company', adminController.getCompany);
router.post('/set-company', adminController.setCompany);
router.get('/download-excel', adminController.downloadExcel);

// Queue / Candidate Routes
router.get('/get-queue', queueController.getQueue);
router.post('/add-student', queueController.addStudent);
router.post('/add-bulk-students', queueController.addBulkStudents);
router.post('/edit-student', queueController.editStudent);
router.post('/update-status', queueController.updateStatus);
router.post('/update-final-status', queueController.updateFinalStatus);
router.post('/override-status', queueController.overrideStatus); // New Override Endpoint
router.delete('/remove-student/:index', queueController.removeStudent);
router.post('/reset-all', queueController.resetAll);

module.exports = router;