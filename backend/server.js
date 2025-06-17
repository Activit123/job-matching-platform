require('dotenv').config();
const express = require('express');
const http = require('http'); // <-- Import Node's built-in HTTP module
const { Server } = require('socket.io'); // <-- Import the Socket.io Server class
const cors = require('cors');
const swaggerUi = require('swagger-ui-express'); // <-- Import swagger-ui-express
const swaggerSpec = require('./swaggerConfig'); // <-- Import our new config file
// Import routes (no changes here)
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const matchRoutes = require('./routes/matchRoutes');
const applicationRoutes = require('./routes/applicationRoutes');

const app = express();
const server = http.createServer(app); // <-- Create an HTTP server from our Express app

// --- Socket.io Setup ---
const io = new Server(server, { // <-- Attach Socket.io to the HTTP server
    cors: {
        origin: "http://localhost:3000", // Allow connections from our React frontend
        methods: ["GET", "POST"]
    }
});

// --- User Management for Sockets ---
// We need to know which user corresponds to which socket connection
let onlineUsers = [];

const addUser = (userId, socketId) => {
    !onlineUsers.some(user => user.userId === userId) &&
        onlineUsers.push({ userId, socketId });
};

const removeUser = (socketId) => {
    onlineUsers = onlineUsers.filter(user => user.socketId !== socketId);
};

const getUser = (userId) => {
    return onlineUsers.find(user => user.userId === userId);
};

// --- Socket.io Connection Logic ---
io.on("connection", (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Listen for a user to register their ID with their socket
    socket.on("addUser", (userId) => {
        addUser(userId, socket.id);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log(`A user disconnected: ${socket.id}`);
        removeUser(socket.id);
    });
});
// We will export 'io' so we can use it in our controllers
app.set('socketio', io);
app.set('getUser', getUser);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Middleware (no changes here)
app.use(cors());
app.use(express.json());

// API Routes (no changes here)

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/applications', applicationRoutes);

const PORT = process.env.PORT || 5001;
// IMPORTANT: We use `server.listen` now, not `app.listen`
server.listen(PORT, () => console.log(`Server with real-time support running on port ${PORT}`));