import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://eldoret-muslim-academy.vercel.app',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);

export default app;
