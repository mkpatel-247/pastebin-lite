/**
 * Paste Model
 * 
 * Mongoose schema for storing paste data with TTL and view limit support
 */

import mongoose from 'mongoose';

const pasteSchema = new mongoose.Schema({
    // Unique short ID for the paste (e.g., "abc123")
    pasteId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },

    // The actual paste content
    content: {
        type: String,
        required: true,
    },

    // When the paste was created
    createdAt: {
        type: Date,
        required: true,
        default: Date.now,
    },

    // When the paste expires (optional, set via TTL)
    expiresAt: {
        type: Date,
        default: null,
        index: true, // Index for efficient expiry queries
    },

    // Maximum number of views allowed (optional)
    maxViews: {
        type: Number,
        default: null,
    },

    // Current view count
    viewCount: {
        type: Number,
        default: 0,
        required: true,
    },

}, {
    // Add timestamps for createdAt and updatedAt
    timestamps: true,
});

// Create compound index for efficient queries
pasteSchema.index({ pasteId: 1, expiresAt: 1 });

// Instance method to check if paste is expired
pasteSchema.methods.isExpiredAt = function (currentTime) {
    if (!this.expiresAt) return false;
    return currentTime >= this.expiresAt.getTime();
};

// Instance method to check if view limit is exceeded
pasteSchema.methods.hasExceededViewLimit = function () {
    if (!this.maxViews) return false;
    return this.viewCount >= this.maxViews;
};

// Instance method to check if paste is available
pasteSchema.methods.isAvailableAt = function (currentTime) {
    return !this.isExpiredAt(currentTime) && !this.hasExceededViewLimit();
};

// Instance method to increment view count atomically
pasteSchema.methods.incrementViewCount = async function () {
    this.viewCount += 1;
    await this.save();
    return this.viewCount;
};

const Paste = mongoose.model('Paste', pasteSchema);

export default Paste;
