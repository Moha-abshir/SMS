import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import authRoutes from './modules/auth/auth.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import subjectsRoutes from './modules/subjects/subjects.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import academicTermsRoutes from './modules/academic-terms/academicTerms.routes.js';
import feeStructuresRoutes from './modules/fee-structures/feeStructures.routes.js';
import admissionsRoutes from './modules/admissions/admissions.routes.js';
import officialLettersRoutes from './modules/official-letters/officialLetters.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import allocationsRoutes from './modules/allocations/allocations.routes.js';
import leaveRequestsRoutes from './modules/leave-requests/leaveRequests.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';

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
app.use('/api/subjects', subjectsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/academic-terms', academicTermsRoutes);
app.use('/api/fee-structures', feeStructuresRoutes);
app.use('/api/admissions', admissionsRoutes);
app.use('/api/official-letters', officialLettersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/allocations', allocationsRoutes);
app.use('/api/leave-requests', leaveRequestsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/attendance', attendanceRoutes);

export default app;
