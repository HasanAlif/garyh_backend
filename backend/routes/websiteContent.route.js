import express from "express";
import { 
  updateAboutUs, 
  updatePrivacyPolicy, 
  updateTermsandConditions,
  getAboutUs,
  getPrivacyPolicy,
  getTermsAndConditions,
  getAllWebsiteContent
} from "../controller/admin.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Update routes (Admin only)
router.put("/content/about-us", protectRoute, updateAboutUs);
router.put("/content/privacy-policy", protectRoute, updatePrivacyPolicy);
router.put("/content/terms-conditions", protectRoute, updateTermsandConditions);

// Get routes (Public access)
router.get("/content/about-us", getAboutUs);
router.get("/content/privacy-policy", getPrivacyPolicy);
router.get("/content/terms-conditions", getTermsAndConditions);

// Get all content (Admin only)
router.get("/content/all", protectRoute, getAllWebsiteContent);

export default router;
