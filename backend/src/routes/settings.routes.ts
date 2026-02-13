import { Router } from 'express';
import { getSettings, resetSystem, updateSettings } from '../controllers/settings.controller';

const router = Router();

router.get('/', getSettings);
router.post('/', updateSettings);
router.post('/reset', resetSystem);

export default router;
