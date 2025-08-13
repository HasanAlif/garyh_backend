import express from 'express';
import { bookingLand, verifyBooking, getUserBookings } from '../controller/booking.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/:id', protectRoute, bookingLand);
router.post('/verifybooking/:bookingId', protectRoute, verifyBooking);

export default router;