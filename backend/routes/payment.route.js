import express from "express";
import { landOwnerRoute, protectRoute } from "../middleware/auth.middleware.js";
import {
  createCheckoutSession,
  getSessionStatus,
  setOwnerStripeAccountId,
  stripeSuccessAndUpdate,
} from "../controller/payment.controller.js";

const router = express.Router();

router.post("/checkout/:bookingId", protectRoute, createCheckoutSession);
router.get("/session/:sessionId", protectRoute, getSessionStatus);

// Success handler (no auth) to mark booking paid; triggered by Stripe success redirect
router.get("/success", stripeSuccessAndUpdate);


// Stripe Connect account management for land owners
// Landowner payout account: set Stripe Connect account ID (provided by landowner via website)
router.post("/connect/set", protectRoute, landOwnerRoute, setOwnerStripeAccountId);

export default router;
