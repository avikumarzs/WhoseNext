require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');

// Import Routes
const viewRoutes = require('./routes/viewRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Make io accessible to our controllers
app.set('io', io);

// Connect to Database
connectDB();

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Mount Routes
app.use('/', viewRoutes);
app.use('/', apiRoutes);

// Start Server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Live on port ${PORT}`));