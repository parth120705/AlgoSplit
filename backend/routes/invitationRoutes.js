import express from 'express';
import { sendInvitation, getMyInvitations, respondToInvitation } from '../controllers/invitationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, sendInvitation)
  .get(protect, getMyInvitations);

router.put('/:id/respond', protect, respondToInvitation);

export default router;
