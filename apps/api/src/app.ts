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
import markSubmissionsRoutes from './modules/mark-submissions/markSubmissions.routes.js';
import examsRoutes from './modules/exams/exams.routes.js';
import academicAllocationsRoutes from './modules/academic-allocations/academicAllocations.routes.js';
import reportLocksRoutes from './modules/report-locks/reportLocks.routes.js';
import dosRoutes from './modules/dos/dos.routes.js';
import financeRoutes from './modules/finance/finance.routes.js';
import teacherRoutes from './modules/teacher/teacher.routes.js';
import timetableRoutes from './modules/timetable/timetable.routes.js';

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://sms-eldoret.pages.dev', 
  process.env.FRONTEND_URL?.replace(/\/$/, '') || '',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server, health checks)
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    return callback(new Error(`Blocked by CORS policy: Origin ${origin} is not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
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
app.use('/api/mark-submissions', markSubmissionsRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/academic-allocations', academicAllocationsRoutes);
app.use('/api/report-card-locks', reportLocksRoutes);
app.use('/api/dos', dosRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/timetable', timetableRoutes);

export default app;
