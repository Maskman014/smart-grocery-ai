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

1. **Create a `.env` file**:
   Create a file named `.env` in the root directory of the project.

2. **Add your Gemini API Key**:
   Open the `.env` file and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```
   You can get your API key from [Google AI Studio](https://aistudio.google.com/).

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open the app**:
   Visit http://localhost:3000 in your browser.

## Architecture
- `server.ts`: Main entry point.
- `server/services/listProcessor.ts`: Core "AI" logic for parsing and recommendations.
- `server/db.ts`: SQLite database setup.
- `src/`: React frontend.
