import express from "express";
import { getDashboardStats } from "../controller/admin.controller.js";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/dashboard-stats", protectRoute, adminRoute, getDashboardStats);

export default router;