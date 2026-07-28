import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://eldoret-muslim-academy.vercel.app',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  credentials: true,
}));
app.use(compression());
app.use(express.json());
app.use(pinoHttp({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, ignore: 'pid,hostname' }
  }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);

export default app;
