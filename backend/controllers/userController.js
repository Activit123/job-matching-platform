const pool = require('../db');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
    // Because our 'protect' middleware ran first,
    // the user's data is already attached to the request object (req.user).
    // We can just send it back.
    res.json(req.user);
};
exports.getNotifications = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 AND is_read = false ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching notifications.' });
    }
};
// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
    const userId = req.user.id;
    // Get location from the request body
    const { name, location, skills, requirements } = req.body;

    try {
        const currentUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (currentUserResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const currentUser = currentUserResult.rows[0];

        // Prepare updated data, falling back to current data if not provided
        const updatedName = name || currentUser.name;
        const updatedLocation = location || currentUser.location; // <-- Handle location
        const updatedSkills = (req.user.user_type === 'student') ? skills : currentUser.skills;
        const updatedRequirements = (req.user.user_type === 'employer') ? requirements : currentUser.requirements;

        // Update the user in the database with all fields
        const updatedUserResult = await pool.query(
            `UPDATE users 
             SET name = $1, skills = $2, requirements = $3, location = $4
             WHERE id = $5 
             RETURNING id, name, email, user_type, skills, requirements, location`,
            [updatedName, updatedSkills, updatedRequirements, updatedLocation, userId]
        );

        res.json(updatedUserResult.rows[0]);
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Server error while updating profile.' });
    }
};