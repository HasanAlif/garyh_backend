import express from 'express';
import { landOwnerRoute, protectRoute } from '../middleware/auth.middleware.js';
import { getUserBookings } from '../controller/booking.controller.js';
import { updatePassword, updateProfile } from '../controller/auth.controller.js';
import { AllBookingLand } from '../controller/landowner dashboard.controller.js';

const router = express.Router();

router.get('/my-bookings', protectRoute, getUserBookings);
router.post('/change-password', protectRoute, updatePassword);
router.post('/update-profile', protectRoute, updateProfile);


router.get('/overview', protectRoute, landOwnerRoute, AllBookingLand)

export default router;
