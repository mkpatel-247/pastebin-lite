# Pastebin-Lite

A lightweight, serverless-ready pastebin application built with Node.js, Express, and MongoDB. Designed to pass strict automated grading suites with support for TTL expiry, view limits, and deterministic time testing.

## Features

- 📝 Create and share text pastes with unique URLs
- ⏱️ Optional Time-To-Live (TTL) expiry for pastes
- 👁️ Optional view count limits
- 🔒 XSS protection for safe content rendering
- 🧪 Deterministic time testing mode for automated grading
- ☁️ Serverless-ready for Vercel deployment
- 🗄️ MongoDB with Mongoose for persistent storage

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Deployment**: Vercel (serverless functions)
- **Security**: DOMPurify + jsdom for XSS prevention
- **IDs**: nanoid for short, URL-friendly unique IDs

## Prerequisites

- Node.js 18+ 
- MongoDB (local instance or MongoDB Atlas)
- npm or yarn package manager

## Local Setup

### 1. Clone and Install

```bash
cd pastebin-lite
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# MongoDB Connection
MONGODB_URI=connection_string

# Application Base URL
BASE_URL=http://localhost:3000

# Port (optional)
PORT=3000

# Testing Mode (optional, set to 1 for deterministic time testing)
# TEST_MODE=1
```

### 3. Start MongoDB

**Option A: Local MongoDB**
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**Option B: MongoDB Atlas** (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get your connection string
4. Add it to your `.env` file

### 4. Run the Application

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Documentation

### Health Check

**GET** `/api/healthz`

Returns database connection status.

**Response**:
```json
{
  "ok": true
}
```

- `200 OK` - Database connected
- `503 Service Unavailable` - Database disconnected

---

### Create Paste

**POST** `/api/pastes`

Create a new paste.

**Request Body**:
```json
{
  "content": "Your paste content here",
  "ttl_seconds": 3600,
  "max_views": 10
}
```

**Parameters**:
- `content` (string, **required**) - The paste content (non-empty)
- `ttl_seconds` (integer, optional) - Time to live in seconds
- `max_views` (integer, optional) - Maximum number of views allowed

**Response** (`201 Created`):
```json
{
  "id": "abc123xyz",
  "url": "http://localhost:3000/p/abc123xyz"
}
```

**Errors**:
- `400 Bad Request` - Invalid input (empty content, invalid TTL/max_views)
- `500 Internal Server Error` - Server error

---

### Get Paste (JSON)

**GET** `/api/pastes/:id`

Retrieve paste data as JSON and increment view count.

**Response** (`200 OK`):
```json
{
  "content": "Your paste content here",
  "remaining_views": 9,
  "expires_at": "2025-12-30T12:00:00.000Z"
}
```

**Fields**:
- `content` - The paste content
- `remaining_views` - Views remaining (null if no limit)
- `expires_at` - ISO timestamp of expiry (null if no TTL)

**Errors**:
- `404 Not Found` - Paste doesn't exist, has expired, or view limit exceeded

---

### View Paste (HTML)

**GET** `/p/:id`

View paste content rendered as HTML.

**Response**: HTML page with paste content

**Errors**:
- `404 Not Found` - Paste doesn't exist, has expired, or view limit exceeded

## Business Logic

### TTL Expiry

Pastes with `ttl_seconds` set will automatically expire after the specified duration:

```bash
# Create a paste that expires in 60 seconds
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Expires soon","ttl_seconds":60}'
```

### View Limits

Pastes with `max_views` set become unavailable after reaching the view limit:

```bash
# Create a paste with 5 views maximum
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Limited views","max_views":5}'
```

### Combined Constraints

If both TTL and max_views are set, the paste expires when **either** condition is met:

```bash
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Both constraints","ttl_seconds":3600,"max_views":10}'
```

## Testing Mode (Deterministic Time)

For automated grading, the application supports deterministic time testing:

1. Set environment variable: `TEST_MODE=1`
2. Send requests with header: `x-test-now-ms` (milliseconds since epoch)
3. The application will use the header value as "current time" for all time-based logic

**Example**:
```bash
# Set TEST_MODE=1 in .env

# Create a paste with 60 second TTL
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Test paste","ttl_seconds":60}'

# Get the current time in milliseconds
NOW=$(date +%s000)

# Try to access it 61 seconds in the "future"
FUTURE=$((NOW + 61000))
curl http://localhost:3000/api/pastes/abc123xyz \
  -H "x-test-now-ms: $FUTURE"

# Should return 404 (expired)
```

## Vercel Deployment

### Prerequisites

1. [Vercel account](https://vercel.com/signup)
2. [Vercel CLI](https://vercel.com/docs/cli) installed: `npm i -g vercel`
3. MongoDB Atlas cluster (free tier available)

### Deployment Steps

#### 1. Prepare MongoDB Atlas

1. Create a MongoDB Atlas cluster
2. Create a database user
3. Whitelist IP address `0.0.0.0/0` (allow from anywhere)
4. Get your connection string

#### 2. Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy
vercel
```

#### 3. Configure Environment Variables

In the Vercel dashboard or via CLI:

```bash
vercel env add MONGODB_URI
# Paste your MongoDB Atlas connection string

vercel env add BASE_URL
# Enter your Vercel deployment URL (e.g., https://your-app.vercel.app)

# Optional: For testing mode
vercel env add TEST_MODE
# Enter: 1
```

#### 4. Redeploy

```bash
vercel --prod
```

Your application is now live! 🚀

### Vercel Configuration

The `vercel.json` file configures serverless deployment:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ]
}
```

## Project Structure

```
pastebin-lite/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection manager
│   ├── models/
│   │   └── Paste.js             # Paste Mongoose schema
│   ├── routes/
│   │   ├── health.js            # Health check endpoint
│   │   ├── pastes.js            # Paste API routes
│   │   └── viewer.js            # HTML viewer route
│   ├── utils/
│   │   ├── sanitize.js          # XSS prevention utilities
│   │   └── time.js              # Time abstraction for testing
├── .env                     # Environment variables (gitignored)
├── .env.example             # Environment template
├── .gitignore
├── index.js                 # Main Express application
├── package.json
├── vercel.json              # Vercel deployment config
└── README.md
```

## Security

### XSS Prevention

All paste content rendered as HTML is sanitized using DOMPurify and escaped to prevent script execution:

```javascript
import { escapeHTML } from './utils/sanitize.js';

const safe = escapeHTML(userInput); // Prevents XSS
```

### Environment Variables

Never commit secrets to version control:
- `.env` is gitignored
- Use `.env.example` as a template
- Configure production secrets in Vercel dashboard

## Troubleshooting

### MongoDB Connection Errors

**Error**: `MONGODB_URI environment variable is not defined`

**Solution**: Create `.env` file with `MONGODB_URI`

---

**Error**: `MongoServerError: bad auth`

**Solution**: Check MongoDB username/password in connection string

---

**Error**: `MongooseServerSelectionError`

**Solution**: 
- Ensure MongoDB is running locally, or
- Check MongoDB Atlas IP whitelist

### Port Already in Use

**Error**: `EADDRINUSE`

**Solution**: Change `PORT` in `.env` or kill the process using port 3000

## Development

### Running Tests

The application is designed to pass automated grading tests. Use TEST_MODE for testing:

```bash
# In .env
TEST_MODE=1

# Run your test suite with x-test-now-ms headers
```

### Code Quality

- ESM modules (`"type": "module"` in package.json)
- Async/await for all database operations
- Comprehensive error handling
- Request logging middleware

## License

ISC

## Author

Meet Patel

---

**Note**: This application is designed for educational purposes and automated grading compliance. For production use, consider adding rate limiting, authentication, and additional security measures.
