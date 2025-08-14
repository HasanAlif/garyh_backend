import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { getUserBookings } from '../controller/booking.controller.js';
import { updatePassword, updateProfile } from '../controller/auth.controller.js';

const router = express.Router();

router.get('/my-bookings', protectRoute, getUserBookings);
router.post('/change-password', protectRoute, updatePassword);
router.post('/update-profile', protectRoute, updateProfile);

export default router;
