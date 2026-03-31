import express from 'express';
import { createOrder, verifyPayment, getConfig } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/config', protect, getConfig);
router.post('/order', protect, createOrder);
router.post('/verify', protect, verifyPayment);

export default router;
