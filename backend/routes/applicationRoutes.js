const express = require('express');
const router = express.Router();

// Make sure the functions are correctly de-structured from the controller
const { 
    createApplication, 
    getApplications, 
    updateApplicationStatus 
} = require('../controllers/applicationController');

const { protect } = require('../middleware/authMiddleware');

// This ensures all subsequent routes in this file are protected
router.use(protect);

// Route for POST /api/applications and GET /api/applications
// Each handler (createApplication, getApplications) must be a valid function
router.route('/')
    .post(createApplication)
    .get(getApplications);

// Route for PUT /api/applications/:id
router.route('/:id')
    .put(updateApplicationStatus);

module.exports = router;