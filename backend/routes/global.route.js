import express from "express";
import { handleContactFormSubmission } from "../controller/contact.controller.js";
import {
  filterLands,
  getAllLands,
  getAvailableLand,
  getFeaturedLand,
  searchByLocation,
} from "../controller/land.controller.js";
import {
  getAboutUs,
  getPrivacyPolicy,
  getTermsAndConditions,
} from "../controller/admin.controller.js";

const router = express.Router();

router.post("/contact", handleContactFormSubmission);
router.get("/search", searchByLocation);
router.get("/filter", filterLands);
router.get("/available-lands", getAvailableLand);
router.get("/all-lands", getAllLands);
router.get("/featured-lands", getFeaturedLand);

// Get website content routes (public access)
router.get("/about-us", getAboutUs);
router.get("/privacy-policy", getPrivacyPolicy);
router.get("/terms-conditions", getTermsAndConditions);

export default router;
