import express from "express";
import multer from "multer";
import path from "path";
import {
  getDashboardStats,
  getBookingStats,
  getRecentActivities,
  getUsers,
  getUserById,
  suspendUser,
  activateUser,
  deleteUser,
  searchUsers,
  getAllSpots,
  getAllBookingDetails,
  getEarningStats,
  getTransactionDetails,
  updateAboutUs,
  updatePrivacyPolicy,
  updateTermsandConditions,
  getAboutUs,
  getPrivacyPolicy,
  getTermsAndConditions,
} from "../controller/admin.controller.js";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import {
  forgotPassword,
  Login,
  Logout,
  resendPasswordResetCode,
  resetPassword,
  updatePassword,
  updateProfile,
  verifyResetCode,
} from "../controller/auth.controller.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/temp/') // temporary folder for uploads
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check if the file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const router = express.Router();

//Admin Auth routes
router.post("/login", Login);
router.post("/logout", Logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);
router.post("/resend-password-reset-code", resendPasswordResetCode);

// Admin dashboard routes
router.get("/dashboard-stats", protectRoute, adminRoute, getDashboardStats);
router.get("/booking-stats", protectRoute, adminRoute, getBookingStats);
router.get("/recent-activities", protectRoute, adminRoute, getRecentActivities);

// User management routes
router.get("/users", protectRoute, adminRoute, getUsers);
router.get("/users/search", protectRoute, adminRoute, searchUsers);
router.get("/users/:userId", protectRoute, adminRoute, getUserById);
router.get("/users/search", protectRoute, adminRoute, searchUsers);
router.patch("/users/suspend/:userId", protectRoute, adminRoute, suspendUser);
router.patch("/users/activate/:userId", protectRoute, adminRoute, activateUser);
router.delete("/users/:userId", protectRoute, adminRoute, deleteUser);

//spot mangement routes
router.get("/spots", protectRoute, adminRoute, getAllSpots);

//Booking management routes
router.get("/all-bookings", protectRoute, adminRoute, getAllBookingDetails);

// Earning management routes
router.get("/earning-stats", protectRoute, adminRoute, getEarningStats);
router.get("/transactions", protectRoute, adminRoute, getTransactionDetails);

// Website content management routes
router.put("/about-us", protectRoute, adminRoute, updateAboutUs);
router.put("/privacy-policy", protectRoute, adminRoute, updatePrivacyPolicy);
router.put(
  "/terms-conditions",
  protectRoute,
  adminRoute,
  updateTermsandConditions
);

// Get website content routes (public access)
router.get("/about-us", getAboutUs);
router.get("/privacy-policy", getPrivacyPolicy);
router.get("/terms-conditions", getTermsAndConditions);

//Edit Profile
router.put("/change-password", protectRoute, adminRoute, updatePassword);
router.patch("/update-profile", protectRoute, adminRoute, upload.single('image'), updateProfile);

export default router;
