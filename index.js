/**
 * Pastebin-Lite Application
 * 
 * A serverless-ready Express application for storing and sharing text pastes
 * with TTL and view limit support
 */

import 'dotenv/config';
import express from 'express';
import { connectDB } from './src/config/database.js';
import healthRouter from './src/routes/health.js';
import pastesRouter from './src/routes/pastes.js';
import viewerRouter from './src/routes/viewer.js';
import path from 'path';

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

// Serve static files from 'public' directory
app.use(express.static(path.join(process.cwd(), 'public')));

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
app.get('/config', (req, res) => {
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
    if (req.accepts('html')) {
        res.status(404).sendFile(path.join(process.cwd(), 'public', '404.html'));
    } else {
        res.status(404).json({ error: 'Route not found' });
    }
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
