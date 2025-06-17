const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper function to generate a JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
    // --- FIX: Destructure 'location' from the request body ---
    const { name, email, password, userType, location, skills, requirements } = req.body;

    if (!name || !email || !password || !userType) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    try {
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // --- FIX: Update the SQL query to include the 'location' column ---
        const newUserQuery = `
            INSERT INTO users (name, email, password_hash, user_type, location, skills, requirements)
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING id, name, email, user_type, location;
        `;
        
        // --- FIX: Pass 'location' as the 5th parameter to the query ---
        const newUser = await pool.query(
            newUserQuery, 
            [name, email, passwordHash, userType, location || null, skills, requirements]
        );
        
        const user = newUser.rows[0];

        if (user) {
            res.status(201).json({
                id: user.id,
                name: user.name,
                email: user.email,
                user_type: user.user_type,
                location: user.location, // Also return the location in the response
                token: generateToken(user.id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (user && (await bcrypt.compare(password, user.password_hash))) {
            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                user_type: user.user_type,
                location: user.location,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
};