const pool = require('../db');
const { findStandardMatches, findAiMatches } = require('../services/matchingService');

// Standard matching remains the same
// @desc    Get standard matches for the logged-in user, with optional filters
// @route   GET /api/match/standard
exports.getStandardMatches = async (req, res) => {
    try {
        // req.query will contain any query parameters from the URL
        // e.g., { location: 'New York', skill: 'React' }
        const filters = req.query; 

        const matches = await findStandardMatches(pool, req.user.id, req.user.user_type, filters);
        res.json(matches);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error finding standard matches' });
    }
};

// AI matching is now updated
exports.getAiMatches = async (req, res) => {
    const { description } = req.body; // Get the search text from the request

    if (!description) {
        return res.status(400).json({ message: 'A search description is required for AI matching.' });
    }

    try {
        const matches = await findAiMatches(pool, req.user.user_type, description);
        res.json(matches);
    } catch (error) {
        console.error(error);
        // Send the error message from the service layer to the frontend
        res.status(500).json({ message: error.message || 'Server error finding AI matches' });
    }
};