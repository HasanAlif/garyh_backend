import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { getUserBookings } from '../controller/booking.controller.js';
import { updatePassword } from '../controller/auth.controller.js';

const router = express.Router();

router.get('/my-bookings', protectRoute, getUserBookings);
router.post('/change-password', protectRoute, updatePassword);

export default router;
