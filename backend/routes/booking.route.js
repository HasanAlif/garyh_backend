import express from 'express';
import { bookingLand } from '../controller/booking.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/:id', protectRoute, bookingLand);

export default router;