import express from 'express';
import { createGroup, getGroups, getGroupById, addMember } from '../controllers/groupController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createGroup)
  .get(protect, getGroups);

router.route('/:id')
  .get(protect, getGroupById);

router.route('/:id/members')
  .put(protect, addMember);

export default router;
