import express from "express";
import {
  Signup,
  Login,
  Logout,
  RefreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from "../controller/auth.controller.js";

const router = express.Router();

router.post("/signup", Signup);
router.post("/login", Login);
router.post("/logout", Logout);
router.post("/refresh-token", RefreshToken);

router.post("/verify-email", verifyEmail);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
