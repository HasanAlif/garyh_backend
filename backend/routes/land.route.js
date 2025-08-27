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
  getLandOwnerFeatured,
  getLandDetails
} from "../controller/land.controller.js";

const router = express.Router();

// Land CRUD operations
router.get("/lands", protectRoute, landOwnerRoute, getOwnerAllLand);
router.post("/addland", protectRoute, landOwnerRoute, createLand);
router.patch("/updateland/:id", protectRoute, landOwnerRoute, updateLand);
router.delete("/deleteland/:id", protectRoute, landOwnerRoute, deleteLand);

// Filter lands using query parameters
router.get("/land-details/:id", protectRoute, getLandDetails);
router.get("/filter", filterLands);
router.get("/search", searchByLocation);
router.get("/search-filter", searchAndFilterLands);
router.get("/feature-lands", protectRoute, landOwnerRoute, getLandOwnerFeatured);

export default router;
