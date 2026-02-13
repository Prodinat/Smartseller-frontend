import { Router } from 'express';
import { createMarketItem, deleteMarketItem, getMarketItems, updateMarketItem } from '../controllers/market.controller';

const router = Router();

router.get('/', getMarketItems);
router.post('/', createMarketItem);
router.put('/:id', updateMarketItem);
router.delete('/:id', deleteMarketItem);

export default router;

