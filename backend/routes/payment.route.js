import express from "express";
import { landOwnerRoute, protectRoute } from "../middleware/auth.middleware.js";
import {
  createCheckoutSession,
  getSessionStatus,
  setOwnerStripeAccountId,
  stripeSuccessAndUpdate,
  getMyTransactions,
  createAndUpdateConnectedAccount,
  saveStripeAccount,
  updateStripeAccount,
  getUserBankInfo,
} from "../controller/payment.controller.js";

const router = express.Router();

router.post("/checkout/:bookingId", protectRoute, createCheckoutSession);
router.get("/session/:sessionId", protectRoute, getSessionStatus);

// Success handler (no auth) to mark booking paid; triggered by Stripe success redirect
router.get("/success", stripeSuccessAndUpdate);

// Stripe Connect account management for land owners
// Landowner payout account: set Stripe Connect account ID (provided by landowner via website)
router.post("/connect/set", protectRoute, landOwnerRoute, setOwnerStripeAccountId);

// Transactions history for current user
router.get("/transactions/mine", protectRoute, getMyTransactions);

// Bank account management routes (Stripe Express onboarding only)
router.post("/stripe_bank/create", protectRoute, landOwnerRoute, createAndUpdateConnectedAccount);
router.get("/stripe_bank/success", saveStripeAccount);
router.get("/stripe_bank/success/update", updateStripeAccount);
router.get("/stripe_bank/get", protectRoute, landOwnerRoute, getUserBankInfo);

export default router;
