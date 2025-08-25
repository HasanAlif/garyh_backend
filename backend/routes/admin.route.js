import express from "express";
import { getDashboardStats, getBookingStats } from "../controller/admin.controller.js";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/dashboard-stats", protectRoute, adminRoute, getDashboardStats);
router.get("/booking-stats", protectRoute, adminRoute, getBookingStats);

export default router;