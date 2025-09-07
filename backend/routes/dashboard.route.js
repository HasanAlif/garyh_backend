import express from "express";
import multer from "multer";
import path from "path";
import { landOwnerRoute, protectRoute } from "../middleware/auth.middleware.js";
import { getUserBookings } from "../controller/booking.controller.js";
import {
  updatePassword,
  updateProfile,
} from "../controller/auth.controller.js";
import {
  AllBookingLand,
  allRatingReviews,
  getEarnings,
  getTransactions
} from "../controller/landowner dashboard.controller.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/temp/') 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const router = express.Router();

router.get("/my-bookings", protectRoute, getUserBookings);
router.put("/change-password", protectRoute, updatePassword);
router.patch("/update-profile", protectRoute, upload.single('image'), updateProfile);

router.get("/overview", protectRoute, landOwnerRoute, AllBookingLand);
router.get("/all-reviews", protectRoute, landOwnerRoute, allRatingReviews);

router.get("/earnings", protectRoute, landOwnerRoute, getEarnings);
router.get("/transactions", protectRoute, landOwnerRoute, getTransactions);

export default router;
