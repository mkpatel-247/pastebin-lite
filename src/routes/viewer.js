/**
 * Paste Viewer Route
 * 
 * GET /p/:id - View paste as HTML
 */

import express from 'express';
import Paste from '../models/Paste.js';
import { getCurrentTime } from '../utils/time.js';
import { escapeHTML } from '../utils/sanitize.js';

const router = express.Router();

/**
 * GET /p/:id
 * View paste content as HTML
 * 
 * IMPORTANT: This route does NOT increment view count
 * The view count is only incremented by the API route (/api/pastes/:id)
 * 
 * Security: Content is escaped to prevent XSS attacks
 */
router.get('/p/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Find paste by ID
        const paste = await Paste.findOne({ pasteId: id });

        if (!paste) {
            return res.status(404).send(renderErrorPage('Paste not found'));
        }

        // Check if paste has expired using time utility
        const currentTime = getCurrentTime(req);
        if (paste.isExpiredAt(currentTime)) {
            return res.status(404).send(renderErrorPage('This paste has expired'));
        }

        // Check if view limit has been exceeded
        if (paste.hasExceededViewLimit()) {
            return res.status(404).send(renderErrorPage('This paste has reached its view limit'));
        }

        // Render the paste
        const html = renderPastePage(paste);
        return res.status(200).send(html);

    } catch (error) {
        console.error('Error viewing paste:', error);
        return res.status(500).send(renderErrorPage('Internal server error'));
    }
});

/**
 * Render paste page HTML
 * @param {Object} paste - Paste document
 * @returns {string} HTML string
 */
function renderPastePage(paste) {
    const escapedContent = escapeHTML(paste.content);

    // Build metadata
    let metadata = [];
    if (paste.expiresAt) {
        const expiryDate = new Date(paste.expiresAt).toLocaleString();
        metadata.push(`Expires: ${expiryDate}`);
    }
    if (paste.maxViews) {
        const remaining = paste.maxViews - paste.viewCount;
        metadata.push(`Views remaining: ${remaining}`);
    }

    const metadataHtml = metadata.length > 0
        ? `<div class="metadata">${metadata.join(' | ')}</div>`
        : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paste - ${paste.pasteId}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 30px;
    }
    h1 {
      color: #333;
      margin-top: 0;
      font-size: 24px;
    }
    .metadata {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
      padding: 10px;
      background-color: #f9f9f9;
      border-left: 4px solid #4CAF50;
    }
    .content {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Courier New', monospace;
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 4px;
      border: 1px solid #ddd;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Paste</h1>
    ${metadataHtml}
    <div class="content">${escapedContent}</div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Render error page HTML
 * @param {string} message - Error message
 * @returns {string} HTML string
 */
function renderErrorPage(message) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - Paste Not Found</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 30px;
      text-align: center;
    }
    h1 {
      color: #d32f2f;
      font-size: 24px;
    }
    p {
      color: #666;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404 - Not Found</h1>
    <p>${escapeHTML(message)}</p>
  </div>
</body>
</html>
  `.trim();
}

export default router;
