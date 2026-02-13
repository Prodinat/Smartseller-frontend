import { Router } from 'express';
import { createOrder, deleteDeliveredOrder, getOrderById, getOrders, markCreditPaid, markDebtPaid, updateOrderStatus } from '../controllers/orders.controller';

const router = Router();

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus);
router.post('/:id/debt/paid', markDebtPaid);
router.post('/:id/credit/paid', markCreditPaid);
router.delete('/:id', deleteDeliveredOrder);

export default router;
