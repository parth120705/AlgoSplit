import express from 'express';
import { getGroupMessages, sendMessage } from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/:groupId')
  .get(protect, getGroupMessages)
  .post(protect, sendMessage);

export default router;
