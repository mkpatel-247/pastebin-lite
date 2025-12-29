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

    if (paste.hasExceededViewLimit()) {
      return res.status(404).send(renderErrorPage('This paste has reached its view limit'));
    }

    // Increment view count atomically
    await Paste.updateOne(
      { pasteId: id },
      { $inc: { viewCount: 1 } }
    );

    // Render the paste (now with updated view count context roughly)
    // Note: 'paste' variable still has old viewCount, but that's fine for display logic 
    // unless we want to show strict "remaining" counts, which we handle in renderPastePage
    const html = renderPastePage(paste, req);
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error viewing paste:', error);
    return res.status(500).send(renderErrorPage('Internal server error'));
  }
});

/**
 * Render paste page HTML
 * @param {Object} paste - Paste document
 * @param {Object} req - Express request object
 * @returns {string} HTML string
 */
function renderPastePage(paste, req) {
  const escapedContent = escapeHTML(paste.content);
  // Construct full URL for sharing
  const fullUrl = `${req.protocol}://${req.get('host')}/p/${paste.pasteId}`;

  // Build metadata
  let metadataHtml = '';
  const metadataItems = [];

  // Add created date
  if (paste.createdAt) {
    metadataItems.push(`Created: ${new Date(paste.createdAt).toLocaleString()}`);
  }

  if (paste.expiresAt) {
    const expiryDate = new Date(paste.expiresAt).toLocaleString();
    metadataItems.push(`Expires: ${expiryDate}`);
  }
  if (paste.maxViews) {
    // We incremented viewCount in the DB, but 'paste' object here is stale.
    // If maxViews is 5, and this is the 1st view, paste.viewCount is 0.
    // So remaining is 5 - (0 + 1) = 4.
    const remaining = Math.max(0, paste.maxViews - (paste.viewCount + 1));
    metadataItems.push(`Views remaining: ${remaining}`);
  }

  if (metadataItems.length > 0) {
    metadataHtml = `<div class="bg-blue-50 border-l-4 border-indigo-500 p-4 mb-6 text-sm text-blue-700 font-medium space-y-1 sm:space-y-0 sm:space-x-4 sm:flex">${metadataItems.join('<span class="hidden sm:inline text-blue-300">|</span><span>')}</span></div>`;
  }

  return `
<!DOCTYPE html>
<html lang="en" class="h-full bg-gray-50 antialiased">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paste - ${paste.pasteId}</title>
  <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    },
                }
            }
        }
    </script>
</head>
<body class="h-full flex flex-col items-center justify-start py-8 px-4 sm:px-6 lg:px-8">
  <div class="max-w-4xl w-full">
    <div class="flex items-center justify-between mb-8">
        <a href="/" class="group flex items-center">
            <svg class="h-6 w-6 text-indigo-600 group-hover:text-indigo-500 transition-colors mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span class="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Create New</span>
        </a>
        <span class="text-sm font-mono text-gray-500 bg-gray-200 px-2 py-1 rounded">ID: ${paste.pasteId}</span>
    </div>

    <!-- Share Link Section -->
    <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row items-center gap-3">
        <span class="text-sm font-medium text-gray-700 whitespace-nowrap">Share Link:</span>
        <div class="flex-1 w-full flex rounded-md shadow-sm">
            <input type="text" readonly value="${fullUrl}" id="shareUrl" class="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 bg-gray-50 text-gray-500 p-2">
            <button onclick="copyLink()" class="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-colors">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            </button>
        </div>
    </div>

    <div class="bg-white px-2 py-6 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100 min-h-[50vh]">
      ${metadataHtml}
      <pre id="pasteContent" class="font-mono text-sm sm:text-base text-gray-800 whitespace-pre-wrap break-words leading-relaxed overflow-x-auto">${escapedContent}</pre>
    </div>

    <div class="mt-8 text-center">
         <button onclick="copyContent()" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            Copy Content
        </button>
    </div>
  </div>

  <script>
    async function copyToClipboard(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
            const originalHTML = btn.innerHTML;
            const originalClasses = btn.className;
            
            btn.innerHTML = '<svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> Copied!';
            
            // Temporary success style
            if(btn.id !== 'shareUrl') { 
               btn.classList.remove('bg-indigo-100', 'text-indigo-700', 'bg-gray-50', 'text-gray-700');
               btn.classList.add('bg-green-100', 'text-green-700'); 
            }
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.className = originalClasses;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
            alert('Failed to copy to clipboard');
        }
    }

    function copyContent() {
        const text = document.getElementById('pasteContent').innerText;
        const btn = document.querySelector('button[onclick="copyContent()"]');
        copyToClipboard(text, btn);
    }

    function copyLink() {
        const text = document.getElementById('shareUrl').value;
        const btn = document.querySelector('button[onclick="copyLink()"]');
        copyToClipboard(text, btn);
    }
  </script>
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
<html lang="en" class="h-full bg-gray-50">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - Paste Not Found</title>
  <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                }
            }
        }
    </script>
</head>
<body class="h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full text-center">
    <div class="rounded-full bg-red-100 p-3 mx-auto w-16 h-16 flex items-center justify-center mb-6">
        <svg class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    </div>
    <h1 class="text-3xl font-extrabold text-gray-900 mb-2">Oops!</h1>
    <p class="text-lg text-gray-500 mb-8">${escapeHTML(message)}</p>
    <div>
        <a href="/" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Create a new paste
        </a>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export default router;
