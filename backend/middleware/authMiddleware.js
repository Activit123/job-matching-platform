const jwt = require('jsonwebtoken');
const pool = require('../db');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Get token from header (e.g., "Bearer <token>")
            token = req.headers.authorization.split(' ')[1];

            // 2. Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Get user from the database using the id from the token
            // We select everything EXCEPT the password hash for security
            const result = await pool.query(
                'SELECT id, name, email, user_type, skills, requirements FROM users WHERE id = $1', 
                [decoded.id]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // 4. Attach user to the request object
            req.user = result.rows[0];

            // 5. Call the next middleware/controller
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };