# Quick Start Guide

## Setup (One-Time)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Edit .env with your MongoDB URI
# Option A: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/pastebin-lite

# Option B: MongoDB Atlas (free tier)
# Sign up at https://www.mongodb.com/cloud/atlas
# Get connection string and paste it in .env
```

## Running Locally

```bash
# Start development server with hot reload
npm run dev

# Server runs at http://localhost:3000
```

## Testing

```bash
# Run complete test suite (takes ~20 seconds)
./test.sh

# Test deterministic time mode
# First, set TEST_MODE=1 in .env
./test-time.sh
```

## Quick API Tests

```bash
# Health check
curl http://localhost:3000/api/healthz

# Create basic paste
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, World!"}'

# Create paste with TTL (60 seconds)
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Expires soon","ttl_seconds":60}'

# Create paste with view limit (5 views)
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Limited views","max_views":5}'

# Get paste (replace {id} with actual ID)
curl http://localhost:3000/api/pastes/{id}

# View in browser
open http://localhost:3000/p/{id}
```

## Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add MONGODB_URI
vercel env add BASE_URL

# Deploy to production
vercel --prod
```

## MongoDB Options

### Option 1: MongoDB Atlas (Recommended for Vercel)
1. Sign up: https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user
4. Whitelist IP: 0.0.0.0/0
5. Get connection string
6. Add to .env

### Option 2: Local MongoDB (for development)
```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Linux (Ubuntu)
sudo apt-get install mongodb
sudo systemctl start mongodb

# Connection string:
MONGODB_URI=mongodb://localhost:27017/pastebin-lite
```

## Troubleshooting

**"MongoServerError: bad auth"**
→ Check username/password in MongoDB connection string

**"Connection refused"**
→ Make sure MongoDB is running

**"EADDRINUSE: Port 3000 already in use"**
→ Change PORT in .env or kill process: `lsof -ti:3000 | xargs kill`

**Test Mode Not Working**
→ Ensure `TEST_MODE=1` is set in .env (no quotes)

## File Overview

- `index.js` - Main Express app
- `routes/` - API endpoints
- `models/` - Mongoose schemas
- `utils/time.js` - **Critical for grading** (time abstraction)
- `utils/sanitize.js` - XSS prevention
- `config/database.js` - MongoDB connection
- `test.sh` - Automated tests
- `test-time.sh` - Time testing
- `vercel.json` - Deployment config

## Key Environment Variables

```bash
# Required
MONGODB_URI=mongodb://...     # MongoDB connection string
BASE_URL=http://localhost:3000  # App base URL

# Optional
PORT=3000                      # Server port (default: 3000)
TEST_MODE=1                    # Enable deterministic time testing
```

---

For full documentation, see [README.md](file:///Users/meet-patel/Documents/Work%20Stuff/interview/pastebin-lite/README.md)
