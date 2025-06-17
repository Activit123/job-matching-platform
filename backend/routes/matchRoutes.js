const express = require('express');
const router = express.Router();
const { getStandardMatches, getAiMatches } = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

// Standard match is still a GET request
router.get('/standard', protect, getStandardMatches);

// AI match is now a POST request to handle the search description in the body
router.post('/ai', protect, getAiMatches);

module.exports = router;