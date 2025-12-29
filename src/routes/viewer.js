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
    const remaining = paste.maxViews - paste.viewCount;
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

    <div class="bg-white px-2 py-6 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100 min-h-[50vh]">
      ${metadataHtml}
      <pre class="font-mono text-sm sm:text-base text-gray-800 whitespace-pre-wrap break-words leading-relaxed overflow-x-auto">${escapedContent}</pre>
    </div>

    <div class="mt-8 text-center">
         <button onclick="copyToClipboard()" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy Content
        </button>
    </div>
  </div>

  <script>
    async function copyToClipboard() {
        const text = document.querySelector('pre').innerText;
        try {
            await navigator.clipboard.writeText(text);
            const btn = document.querySelector('button');
            const originalHTML = btn.innerHTML;
            btn.textContent = 'Copied!';
            btn.classList.remove('bg-indigo-100', 'text-indigo-700');
            btn.classList.add('bg-green-100', 'text-green-700');
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.add('bg-indigo-100', 'text-indigo-700');
                btn.classList.remove('bg-green-100', 'text-green-700');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
            alert('Failed to copy to clipboard');
        }
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
