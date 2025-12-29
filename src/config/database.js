/**
 * MongoDB Connection Manager
 * 
 * Handles database connections in a serverless-friendly way
 * Reuses existing connections to avoid exhausting connection pools
 */

import mongoose from 'mongoose';

// Cache the connection promise to reuse across serverless function invocations
let cachedConnection = null;

/**
 * Connect to MongoDB
 * @returns {Promise<mongoose.Connection>} MongoDB connection
 */
export async function connectDB() {
    // If we have a cached connection and it's ready, return it
    if (cachedConnection && mongoose.connection.readyState === 1) {
        return cachedConnection;
    }

    try {
        const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_CONN_MONGODB_URI;

        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }

        // Configure mongoose for serverless environment
        mongoose.set('strictQuery', false);

        // Connect with optimized settings for serverless
        const connection = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000,
            maxPoolSize: 10, // Limit connection pool size
            minPoolSize: 1,
        });

        cachedConnection = connection;
        console.log('MongoDB connected successfully');

        return connection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        cachedConnection = null;
        throw error;
    }
}

/**
 * Check if database is connected
 * @returns {boolean} Connection status
 */
export function isConnected() {
    return mongoose.connection.readyState === 1;
}

/**
 * Get connection state as string
 * @returns {string} Connection state
 */
export function getConnectionState() {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };
    return states[mongoose.connection.readyState] || 'unknown';
}
