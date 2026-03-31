import express from 'express';
import { recordSettlement, getGroupSettlements } from '../controllers/settlementController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, recordSettlement);

router.route('/group/:groupId')
  .get(protect, getGroupSettlements);

export default router;
