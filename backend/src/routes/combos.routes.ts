import { Router } from 'express';
import { createCombo, deleteCombo, getCombos, updateCombo } from '../controllers/combos.controller';

const router = Router();

router.get('/', getCombos);
router.post('/', createCombo);
router.put('/:id', updateCombo);
router.delete('/:id', deleteCombo);

export default router;

