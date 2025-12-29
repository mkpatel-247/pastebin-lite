/**
 * Pastes API Routes
 * 
 * POST /api/pastes - Create a new paste
 * GET /api/pastes/:id - Get paste by ID (JSON response)
 */

import express from 'express';
import { nanoid } from 'nanoid';
import Paste from '../models/Paste.js';
import { getCurrentTime, calculateExpiryDate, isExpired } from '../utils/time.js';

const router = express.Router();

/**
 * POST /api/pastes
 * Create a new paste
 * 
 * Request body:
 * - content: string (required) - The paste content
 * - ttl_seconds: number (optional) - Time to live in seconds
 * - max_views: number (optional) - Maximum number of views
 * 
 * Response:
 * - id: string - The paste ID
 * - url: string - Full URL to view the paste
 */
router.post('/pastes', async (req, res) => {
    try {
        const { content, ttl_seconds, max_views } = req.body;

        // Validate content is present and non-empty
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({
                error: 'Content is required and must be a non-empty string'
            });
        }

        // Validate ttl_seconds if provided
        if (ttl_seconds !== undefined && ttl_seconds !== null) {
            if (typeof ttl_seconds !== 'number' || ttl_seconds <= 0 || !Number.isInteger(ttl_seconds)) {
                return res.status(400).json({
                    error: 'ttl_seconds must be a positive integer'
                });
            }
        }

        // Validate max_views if provided
        if (max_views !== undefined && max_views !== null) {
            if (typeof max_views !== 'number' || max_views <= 0 || !Number.isInteger(max_views)) {
                return res.status(400).json({
                    error: 'max_views must be a positive integer'
                });
            }
        }

        // Generate unique paste ID
        const pasteId = nanoid(10);

        // Calculate expiry date if TTL is provided
        const expiresAt = ttl_seconds
            ? calculateExpiryDate(ttl_seconds, req)
            : null;

        // Create paste document
        const paste = new Paste({
            pasteId,
            content,
            expiresAt,
            maxViews: max_views || null,
            viewCount: 0,
            createdAt: new Date(getCurrentTime(req)),
        });

        await paste.save();

        // Build the full URL strictly matching requirement format
        let baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        if (baseUrl && !baseUrl.startsWith('http')) {
            baseUrl = `${req.protocol || 'http'}://${baseUrl}`;
        }
        const url = `${baseUrl}/p/${pasteId}`;

        return res.status(201).json({
            id: pasteId,
            url,
        });

    } catch (error) {
        console.error('Error creating paste:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/pastes/:id
 * Get paste by ID and return JSON
 * 
 * This endpoint:
 * 1. Checks if paste exists
 * 2. Checks if paste has expired (using time utility)
 * 3. Checks if view limit has been exceeded
 * 4. Increments view count
 * 5. Returns paste data
 * 
 * Response:
 * - content: string - The paste content
 * - remaining_views: number|null - Views remaining (null if no limit)
 * - expires_at: string|null - ISO timestamp of expiry (null if no TTL)
 */
router.get('/pastes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const currentTime = getCurrentTime(req);

        // findOne check first to check for expiry without incrementing
        const paste = await Paste.findOne({ pasteId: id });

        if (!paste) {
            return res.status(404).json({ error: 'Paste not found' });
        }

        // Check if paste has expired
        if (paste.isExpiredAt(currentTime)) {
            return res.status(404).json({ error: 'Paste has expired' });
        }

        // Atomic increment with view limit check
        // We only increment if maxViews is null OR viewCount < maxViews
        const filter = {
            pasteId: id,
            $or: [
                { maxViews: null },
                { $expr: { $lt: ['$viewCount', '$maxViews'] } }
            ]
        };

        const updatedPaste = await Paste.findOneAndUpdate(
            filter,
            { $inc: { viewCount: 1 } },
            { new: true }
        );

        if (!updatedPaste) {
            // If findOne succeeded but findOneAndUpdate failed, it means view limit was hit
            return res.status(404).json({ error: 'Paste view limit exceeded' });
        }

        // Calculate remaining views
        const remainingViews = updatedPaste.maxViews
            ? Math.max(0, updatedPaste.maxViews - updatedPaste.viewCount)
            : null;

        // Return paste data
        return res.status(200).json({
            content: updatedPaste.content,
            remaining_views: remainingViews,
            expires_at: updatedPaste.expiresAt ? updatedPaste.expiresAt.toISOString() : null,
        });

    } catch (error) {
        console.error('Error retrieving paste:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
