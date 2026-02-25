import express from 'express';
import { createServer as createViteServer } from 'vite';
import authRoutes from './server/routes/auth.js';
import groceryRoutes from './server/routes/grocery.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/grocery', groceryRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    // (This part is simplified for the dev environment context)
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
