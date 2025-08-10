import express from "express";
import { landOwnerRoute, protectRoute } from "../middleware/auth.middleware.js";
import {
  createLand,
  getAllLand,
  deleteLand,
  updateLand,
  filterLands,
} from "../controller/land.controller.js";

const router = express.Router();

// Land CRUD operations
router.get("/lands", protectRoute, landOwnerRoute, getAllLand);
router.post("/addland", protectRoute, landOwnerRoute, createLand);
router.post("/updateland/:id", protectRoute, landOwnerRoute, updateLand);
router.delete("/deleteland/:id", protectRoute, landOwnerRoute, deleteLand);

// Filter lands using query parameters
router.get("/filter", filterLands);

export default router;
