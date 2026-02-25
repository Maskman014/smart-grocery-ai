import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { z } from 'zod';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

router.post('/register', (req, res) => {
  try {
    const { username, password } = registerSchema.parse(req.body);
    const hashedPassword = bcrypt.hashSync(password, 10);

    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const info = stmt.run(username, hashedPassword);

    res.status(201).json({ message: 'User registered successfully', userId: info.lastInsertRowid });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username) as any;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, username: user.username });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
