import express from "express";
import { landOwnerRoute, protectRoute } from "../middleware/auth.middleware.js";
import { getUserBookings } from "../controller/booking.controller.js";
import {
  updatePassword,
  updateProfile,
} from "../controller/auth.controller.js";
import {
  AllBookingLand,
  allRatingReviews,
  getEarnings,
  getTransactions
} from "../controller/landowner dashboard.controller.js";

const router = express.Router();

router.get("/my-bookings", protectRoute, getUserBookings);
router.put("/change-password", protectRoute, updatePassword);
router.patch("/update-profile", protectRoute, updateProfile);

router.get("/overview", protectRoute, landOwnerRoute, AllBookingLand);
router.get("/all-reviews", protectRoute, landOwnerRoute, allRatingReviews);

router.get("/earnings", protectRoute, landOwnerRoute, getEarnings);
router.get("/transactions", protectRoute, landOwnerRoute, getTransactions);

export default router;
