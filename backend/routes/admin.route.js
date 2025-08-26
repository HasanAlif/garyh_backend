import express from "express";
import {
  getDashboardStats,
  getBookingStats,
  getRecentActivities,
  getUsers,
  getUserById,
  suspendUser,
  activateUser,
  deleteUser,
  searchUsers,
  getAllSpots,
  getAllBookingDetails,
} from "../controller/admin.controller.js";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/dashboard-stats", protectRoute, adminRoute, getDashboardStats);
router.get("/booking-stats", protectRoute, adminRoute, getBookingStats);
router.get("/recent-activities", protectRoute, adminRoute, getRecentActivities);

// User management routes
router.get("/users", protectRoute, adminRoute, getUsers);
router.get("/users/search", protectRoute, adminRoute, searchUsers);
router.get("/users/:userId", protectRoute, adminRoute, getUserById);
router.get("/users/search", protectRoute, adminRoute, searchUsers);
router.patch("/users/suspend/:userId", protectRoute, adminRoute, suspendUser);
router.patch("/users/activate/:userId", protectRoute, adminRoute, activateUser);
router.delete("/users/:userId", protectRoute, adminRoute, deleteUser);

//spot mangement routes
router.get("/spots", protectRoute, adminRoute, getAllSpots);

//Booking management routes
router.get("/all-bookings", protectRoute, adminRoute, getAllBookingDetails);

export default router;
