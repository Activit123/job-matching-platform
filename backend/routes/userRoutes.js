const express = require('express');
const router = express.Router();

// Import the new function
const { getUserProfile, getNotifications, updateUserProfile } = require('../controllers/userController');

const { protect } = require('../middleware/authMiddleware');

// Route for getting the profile
router.get('/profile', protect, getUserProfile);

// Route for updating the profile (NEW)
router.put('/profile', protect, updateUserProfile);

// Route for getting notifications
router.get('/notifications', protect, getNotifications);

module.exports = router;