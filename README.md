# Smart Grocery AI
A hackathon-level full-stack AI grocery assistant.

## Features
- **Smart Parsing**: Extracts item names and quantities from raw text (e.g., "2 milk, eggs 12").
- **Price Estimation**: Estimates costs based on a built-in database.
- **Store Recommendation**: Suggests the best store (Local Market, SuperMart, Wholesale Club) based on total cost, bulk discounts, and user history.
- **History Tracking**: Visualizes spending trends and store preferences.
- **Authentication**: Secure JWT-based login and registration.

## Tech Stack
- **Frontend**: React, TailwindCSS, Recharts, Lucide React
- **Backend**: Node.js, Express, Better-SQLite3, JWT
- **Language**: TypeScript throughout

## Running Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000

## Architecture
- `server.ts`: Main entry point.
- `server/services/listProcessor.ts`: Core "AI" logic for parsing and recommendations.
- `server/db.ts`: SQLite database setup.
- `src/`: React frontend.
