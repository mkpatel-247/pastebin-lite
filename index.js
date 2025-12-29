/**
 * Pastebin-Lite Application
 * 
 * A serverless-ready Express application for storing and sharing text pastes
 * with TTL and view limit support
 */

import 'dotenv/config';
import express from 'express';
import ejs from 'ejs';
import { connectDB } from './src/config/database.js';
import healthRouter from './src/routes/health.js';
import pastesRouter from './src/routes/pastes.js';
import viewerRouter from './src/routes/viewer.js';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

// EJS Configuration
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

// Cache the layout template for performance
const layoutPath = path.join(process.cwd(), 'views', 'layout.ejs');

/**
 * Render a page using the shared layout
 * @param {Object} res - Express response object
 * @param {string} viewName - Name of the view file (without .ejs)
 * @param {Object} data - Data to pass to the template
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export function renderPage(res, viewName, data = {}, statusCode = 200) {
    const viewPath = path.join(process.cwd(), 'views', `${viewName}.ejs`);

    // Render the view content
    ejs.renderFile(viewPath, data, (err, body) => {
        if (err) {
            console.error('Error rendering view:', err);
            return res.status(500).send('Internal server error');
        }

        // Render with layout
        ejs.renderFile(layoutPath, { ...data, body }, (err, html) => {
            if (err) {
                console.error('Error rendering layout:', err);
                return res.status(500).send('Internal server error');
            }
            res.status(statusCode).send(html);
        });
    });
}

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

// Home route - render the paste creation form
app.get('/', (req, res) => {
    const extraStyles = `
        /* Custom scrollbar for textarea */
        textarea::-webkit-scrollbar { width: 8px; }
        textarea::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        textarea::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        textarea::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
    `;
    const scripts = `
    <script
    >
        const form = document.getElementById('pasteForm');
        const submitBtn = document.getElementById('submitBtn');
        const loadingBtn = document.getElementById('loadingBtn');
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessage.classList.add('hidden');
            submitBtn.classList.add('hidden');
            loadingBtn.classList.remove('hidden');

            const formData = new FormData(form);
            const content = formData.get('content');
            const ttl = formData.get('ttl');
            const maxViews = formData.get('max_views');

            const payload = { content };
            if (ttl) payload.ttl_seconds = parseInt(ttl, 10);
            if (maxViews) payload.max_views = parseInt(maxViews, 10);

            try {
                const response = await fetch('/api/pastes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Something went wrong');
                window.location.href = data.url;
            } catch (error) {
                console.error('Error:', error);
                errorText.textContent = error.message;
                errorMessage.classList.remove('hidden');
                submitBtn.classList.remove('hidden');
                loadingBtn.classList.add('hidden');
            }
        });
    </script>`;

    renderPage(res, 'index', {
        title: 'Pastebin Lite',
        bodyClass: 'h-full flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-shadow-grey-900',
        extraStyles,
        scripts
    });
});

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
        renderPage(res, '404', {
            title: 'Page Not Found',
            bodyClass: 'h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-shadow-grey-900'
        }, 404);
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
