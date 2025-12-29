/**
 * Pastebin-Lite Application
 * 
 * A serverless-ready Express application for storing and sharing text pastes
 * with TTL and view limit support
 */

import 'dotenv/config';
import express from 'express';
import { connectDB } from './config/database.js';
import healthRouter from './routes/health.js';
import pastesRouter from './routes/pastes.js';
import viewerRouter from './routes/viewer.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Connect to database on startup
let dbConnected = false;
connectDB()
    .then(() => {
        dbConnected = true;
        console.log('Database initialized');
    })
    .catch((error) => {
        console.error('Database initialization failed:', error);
    });

// Routes
app.use('/api', healthRouter);
app.use('/api', pastesRouter);
app.use('/', viewerRouter);

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        name: 'Pastebin-Lite',
        version: '1.0.0',
        endpoints: {
            health: '/api/healthz',
            createPaste: 'POST /api/pastes',
            getPaste: 'GET /api/pastes/:id',
            viewPaste: 'GET /p/:id',
        },
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server (only if not in serverless environment)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Local URL: http://localhost:${PORT}`);
    });
}

// Export for Vercel serverless
export default app;
