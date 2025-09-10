import express from "express";
import {
  Signup,
  Login,
  Logout,
  verifyEmail,
  resendVerificationCode,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  
  resendPasswordResetCode,
  checkAuth,
  getProfile,
} from "../controller/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/check-auth", protectRoute, checkAuth);
router.get("/profile", protectRoute, getProfile);

router.post("/signup", Signup);
router.post("/login", Login);
router.post("/logout", Logout);
//router.post("/refresh-token", RefreshToken);

router.post("/verify-email", verifyEmail);
router.post("/resend-verification-code", resendVerificationCode);

router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);
router.post("/resend-password-reset-code", resendPasswordResetCode);

export default router;
