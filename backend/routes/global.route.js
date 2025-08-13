import express from "express";
import { handleContactFormSubmission } from "../controller/contact.controller.js";
import {
  filterLands,
  getAllLands,
  getAvailableLand,
  searchByLocation,
} from "../controller/land.controller.js";

const router = express.Router();

router.post("/contact", handleContactFormSubmission);
router.get("/search", searchByLocation);
router.get("/filter", filterLands);
router.get("/available-lands", getAvailableLand);
router.get("/all-lands", getAllLands);

export default router;
