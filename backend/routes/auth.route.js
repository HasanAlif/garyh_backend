import express from "express";
import {
  Signup,
  Login,
  Logout,
  RefreshToken,
} from "../controller/auth.controller.js";

const router = express.Router();

router.post("/signup", Signup);
router.post("/login", Login);
router.post("/logout", Logout);
router.post("/refresh-token", RefreshToken);

export default router;
