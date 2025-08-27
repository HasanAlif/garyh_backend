import express from "express";

const router = express.Router();
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  addRating,
  getLandRatings,
  getAvailableLand,
  getAllLands,
} from "../controller/land.controller.js";
import {
  saveLand,
  unsaveLand,
  getSavedLands,
} from "../controller/saveland.controller.js";

router.post("/rating/:id", protectRoute, addRating);
router.get("/rating/:id", getLandRatings);

router.get("/available-lands", protectRoute, getAvailableLand);
router.get("/all-lands", getAllLands);

router.post("/save/:landId", protectRoute, saveLand);
router.delete("/unsave/:landId", protectRoute, unsaveLand);
router.get("/saved-lands", protectRoute, getSavedLands);

export default router;
