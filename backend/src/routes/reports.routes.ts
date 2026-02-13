import { Router } from 'express';
import { getActiveReportSession, getDashboardStats, getDailySessionReport, getSalesReport, startReportSession, stopReportSession } from '../controllers/reports.controller';

const router = Router();

router.get('/dashboard', getDashboardStats);
router.get('/sales', getSalesReport);
router.get('/session', getActiveReportSession);
router.post('/session/stop', stopReportSession);
router.post('/session/start', startReportSession);
router.get('/daily', getDailySessionReport);

export default router;
