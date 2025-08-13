import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { getUserBookings } from '../controller/booking.controller.js';

const router = express.Router();

router.get('/my-bookings', protectRoute, getUserBookings);

export default router;
