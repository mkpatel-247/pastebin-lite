/**
 * Health Check Route
 * 
 * GET /api/healthz
 * Returns the database connection status
 */

import express from 'express';
import { isConnected } from '../config/database.js';

const router = express.Router();

/**
 * Health check endpoint
 * Returns 200 if database is connected, 503 otherwise
 */
router.get('/healthz', (req, res) => {
    const dbConnected = isConnected();

    if (dbConnected) {
        return res.status(200).json({ ok: true });
    } else {
        return res.status(503).json({ ok: false });
    }
});

export default router;
