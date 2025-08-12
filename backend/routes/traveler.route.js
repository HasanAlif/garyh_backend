import express from "express";

const router = express.Router();
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  addRating,
  getLandRatings,
  //   updateRating,
  //   removeRating,
  getAvailableLand,
  getAllLands,
} from "../controller/land.controller.js";

// Rating operations
router.post("/rating/:id", protectRoute, addRating);
router.get("/rating/:id", getLandRatings);

// router.put("/rating/:id", protectRoute, updateRating);
// router.delete("/rating/:id", protectRoute, removeRating);

router.get("/available-lands", protectRoute, getAvailableLand);
router.get("/all-lands", protectRoute, getAllLands);

export default router;
