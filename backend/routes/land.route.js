import express from "express";
import { landOwnerRoute, protectRoute } from "../middleware/auth.middleware.js";
import {
  createLand,
  getOwnerAllLand,
  deleteLand,
  updateLand,
  filterLands,
  searchByLocation,
  searchAndFilterLands,
  getLandOwnerFeatured
} from "../controller/land.controller.js";

const router = express.Router();

// Land CRUD operations
router.get("/lands", protectRoute, landOwnerRoute, getOwnerAllLand);
router.post("/addland", protectRoute, landOwnerRoute, createLand);
router.post("/updateland/:id", protectRoute, landOwnerRoute, updateLand);
router.delete("/deleteland/:id", protectRoute, landOwnerRoute, deleteLand);

// Filter lands using query parameters
router.get("/filter", protectRoute, filterLands);
router.get("/search", protectRoute, searchByLocation);
router.get("/search-filter", searchAndFilterLands);
router.get("/feature-lands", protectRoute, landOwnerRoute, getLandOwnerFeatured);

export default router;
