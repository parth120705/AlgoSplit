import express from 'express';
import { addExpense, getGroupExpenses, getGroupBalances } from '../controllers/expenseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, addExpense);

router.route('/group/:groupId')
  .get(protect, getGroupExpenses);

router.route('/group/:groupId/balances')
  .get(protect, getGroupBalances);

export default router;
