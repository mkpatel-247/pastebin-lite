/**
 * Paste Viewer Route
 * 
 * GET /p/:id - View paste as HTML
 */

import express from 'express';
import Paste from '../models/Paste.js';
import { getCurrentTime } from '../utils/time.js';
import { renderPage } from '../../index.js';

const router = express.Router();

/**
 * Copy scripts shared by paste and error pages
 */
const copyScripts = `
<script>
    async function copyToClipboard(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
            const originalHTML = btn.innerHTML;
            const originalClasses = btn.className;
            
            btn.innerHTML = '<svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> Copied!';
            
            if(btn.id !== 'shareUrl') { 
               btn.className = 'inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700'; 
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
</script>`;

/**
 * GET /p/:id
 * View paste content as HTML
 * 
 * Security: Content is escaped by EJS using <%= %> syntax
 */
router.get('/p/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { preview } = req.query; // Get preview token from query params

    // Find paste by ID
    const paste = await Paste.findOne({ pasteId: id });

    if (!paste) {
      return renderPage(res, 'error', {
        title: 'Error - Paste Not Found',
        bodyClass: 'h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-shadow-grey-900',
        message: 'Paste not found'
      }, 404);
    }

    // Check if paste has expired using time utility
    const currentTime = getCurrentTime(req);
    if (paste.isExpiredAt(currentTime)) {
      return renderPage(res, 'error', {
        title: 'Error - Paste Expired',
        bodyClass: 'h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-shadow-grey-900',
        message: 'This paste has expired'
      }, 404);
    }

    // Check for creator preview token
    let isCreatorPreview = false;
    if (preview && paste.creatorToken && preview === paste.creatorToken) {
      // Valid creator preview - clear the token (one-time use)
      await Paste.updateOne(
        { pasteId: id },
        { $set: { creatorToken: null } }
      );
      isCreatorPreview = true;
    } else {
      // Normal view - check view limit and increment
      if (paste.hasExceededViewLimit()) {
        return renderPage(res, 'error', {
          title: 'Error - View Limit Exceeded',
          bodyClass: 'h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-shadow-grey-900',
          message: 'This paste has reached its view limit'
        }, 404);
      }

      // Increment view count atomically
      await Paste.updateOne(
        { pasteId: id },
        { $inc: { viewCount: 1 } }
      );
    }

    // Build metadata
    const metadata = [];
    if (paste.createdAt) {
      metadata.push(`Created: ${new Date(paste.createdAt).toLocaleString()}`);
    }
    if (paste.expiresAt) {
      metadata.push(`Expires: ${new Date(paste.expiresAt).toLocaleString()}`);
    }
    if (paste.maxViews) {
      // Account for whether this is a creator preview or normal view
      const currentViewCount = isCreatorPreview ? paste.viewCount : (paste.viewCount + 1);
      const remaining = Math.max(0, paste.maxViews - currentViewCount);
      metadata.push(`Views remaining: ${remaining}`);
    }

    // Construct full URL for sharing (without preview token)
    const fullUrl = `${req.protocol}://${req.get('host')}/p/${paste.pasteId}`;

    return renderPage(res, 'paste', {
      title: `Paste - ${paste.pasteId}`,
      bodyClass: 'h-full flex flex-col items-center justify-start py-8 px-4 sm:px-6 lg:px-8 bg-shadow-grey-900',
      pasteId: paste.pasteId,
      content: paste.content,
      fullUrl,
      metadata,
      isCreatorPreview,
      scripts: copyScripts
    });

  } catch (error) {
    console.error('Error viewing paste:', error);
    return renderPage(res, 'error', {
      title: 'Error - Internal Server Error',
      bodyClass: 'h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-shadow-grey-900',
      message: 'Internal server error'
    }, 500);
  }
});

export default router;