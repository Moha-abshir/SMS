import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import authRoutes from './modules/auth/auth.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://eldoret-muslim-academy.vercel.app',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  credentials: true,
  maxAge: 86400, // Cache preflight OPTIONS request for 24 hours
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
app.use('/api/staff', staffRoutes);

export default app;
