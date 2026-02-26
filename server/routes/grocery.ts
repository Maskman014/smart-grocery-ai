import express from 'express';
import db from '../db.js';
import { authenticateToken, AuthRequest } from '../auth.js';
import { processGroceryList } from '../services/listProcessor.js';

const router = express.Router();

router.post('/analyze-list', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { raw_text } = req.body;
    if (!raw_text) {
      return res.status(400).json({ error: 'Raw text is required' });
    }

    const result = processGroceryList(raw_text, req.user!.id);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to analyze list' });
  }
});

router.post('/save-list', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { raw_text, parsed_items, total_estimated_cost, recommended_store, confidence_score, explanation_text, status } = req.body;

    // Save to DB
    const stmt = db.prepare(`
      INSERT INTO grocery_lists (user_id, raw_text, parsed_items, total_cost, store_recommendation, confidence_score, explanation, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      req.user!.id,
      raw_text || '',
      JSON.stringify(parsed_items),
      total_estimated_cost,
      recommended_store,
      confidence_score,
      explanation_text,
      status || 'saved'
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save list' });
  }
});

router.get('/grocery-history', authenticateToken, (req: AuthRequest, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM grocery_lists WHERE user_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(req.user!.id);
    
    const history = rows.map((row: any) => ({
      ...row,
      recommended_store: row.store_recommendation,
      parsed_items: JSON.parse(row.parsed_items)
    }));

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
