const pool = require('../db');

// Helper function to create a notification in the database
const createNotification = async (userId, message) => {
    try {
        await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [userId, message]);
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};

// @desc    Student creates or re-submits an application
// @route   POST /api/applications
exports.createApplication = async (req, res) => {
    // --- SOCKET.IO SETUP ---
    const io = req.app.get('socketio');
    const getUser = req.app.get('getUser');

    const studentId = req.user.id;
    const { employerId } = req.body;

    if (req.user.user_type !== 'student') {
        return res.status(403).json({ message: 'Only students can send applications.' });
    }

    try {
        const existingApp = await pool.query(
            'SELECT * FROM applications WHERE student_id = $1 AND employer_id = $2',
            [studentId, employerId]
        );

        if (existingApp.rows.length > 0) {
            const existingAppResult = existingApp.rows[0];

            if (existingAppResult.status === 'pending' || existingAppResult.status === 'approved') {
                return res.status(400).json({ message: 'You already have an active or approved application with this company.' });
            }

            if (existingAppResult.status === 'denied') {
                // Re-application logic
                const re_appliedApp = await pool.query(
                    `UPDATE applications SET status = 'pending', motivation = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
                    [existingAppResult.id]
                );
                
                const notificationMessage = `${req.user.name} has re-applied for a position.`;
                await createNotification(employerId, notificationMessage);

                // --- EMIT REAL-TIME NOTIFICATION ---
                const receiver = getUser(employerId);
                if (receiver) {
                    io.to(receiver.socketId).emit("getNotification", { message: notificationMessage });
                }

                return res.status(200).json(re_appliedApp.rows[0]);
            }
        }

        // New application logic
        const newApp = await pool.query(
            'INSERT INTO applications (student_id, employer_id) VALUES ($1, $2) RETURNING *',
            [studentId, employerId]
        );
        
        const notificationMessage = `You have a new job application from ${req.user.name}.`;
        await createNotification(employerId, notificationMessage);
        
        // --- EMIT REAL-TIME NOTIFICATION ---
        const receiver = getUser(employerId);
        if (receiver) {
            io.to(receiver.socketId).emit("getNotification", { message: notificationMessage });
        }

        res.status(201).json(newApp.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating application.' });
    }
};

// @desc    Get applications for the logged-in user
// @route   GET /api/applications
exports.getApplications = async (req, res) => {
    // This function does not need real-time updates as it's a fetch request
    const { id, user_type } = req.user;
    let query;

    try {
        if (user_type === 'student') {
            query = `SELECT a.id, a.status, a.motivation, u.name as employer_name, a.updated_at FROM applications a JOIN users u ON a.employer_id = u.id WHERE a.student_id = $1 ORDER BY a.updated_at DESC;`;
        } else { // 'employer'
            query = `SELECT a.id, a.status, u.name as student_name, u.skills, a.created_at FROM applications a JOIN users u ON a.student_id = u.id WHERE a.employer_id = $1 ORDER BY a.created_at DESC;`;
        }
        const { rows } = await pool.query(query, [id]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching applications.' });
    }
};

// @desc    Employer updates an application status
// @route   PUT /api/applications/:id
exports.updateApplicationStatus = async (req, res) => {
    // --- SOCKET.IO SETUP ---
    const io = req.app.get('socketio');
    const getUser = req.app.get('getUser');
    
    const { id: applicationId } = req.params;
    const { status, motivation } = req.body;
    const employerId = req.user.id;

    if (req.user.user_type !== 'employer') {
        return res.status(403).json({ message: 'Forbidden: Only employers can update applications.' });
    }
    if (status === 'denied' && !motivation) {
        return res.status(400).json({ message: 'A motivation/reason is required when denying an application.' });
    }
    if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided.' });
    }

    try {
        const result = await pool.query(
            `UPDATE applications SET status = $1, motivation = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND employer_id = $4 RETURNING student_id`,
            [status, motivation || null, applicationId, employerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Application not found or you are not authorized to update it.' });
        }
        
        const updatedApp = result.rows[0];

        const notificationMessage = status === 'approved' 
            ? `Congratulations! Your application to ${req.user.name} has been approved.`
            : `Your application to ${req.user.name} was updated to '${status}'.`;
        await createNotification(updatedApp.student_id, notificationMessage);
        
        // --- EMIT REAL-TIME NOTIFICATION ---
        const receiver = getUser(updatedApp.student_id);
        if (receiver) {
            io.to(receiver.socketId).emit("getNotification", { message: notificationMessage });
        }

        res.json({ message: `Application status updated to ${status}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating application.' });
    }
};