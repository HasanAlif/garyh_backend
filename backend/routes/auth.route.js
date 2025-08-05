import express from "express";
import {
  Signup,
  Login,
  Logout,
  RefreshToken,
  verifyEmail,
} from "../controller/auth.controller.js";

const router = express.Router();

router.post("/signup", Signup);
router.post("/login", Login);
router.post("/logout", Logout);
router.post("/refresh-token", RefreshToken);

router.post("/verify-email", verifyEmail);

export default router;
