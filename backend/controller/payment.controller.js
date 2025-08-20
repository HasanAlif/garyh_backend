import { stripe, PLATFORM_FEE_PERCENT } from "../lib/stripe.js";
import Booking from "../models/booking.model.js";
import Land from "../models/land.model.js";
import User from "../models/user.model.js";
import Transaction from "../models/transaction.model.js";

// Create Checkout Session - traveler pays, platform takes 3%, rest to owner (if connected)
export const createCheckoutSession = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId); // keep LandId as ObjectId
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (String(booking.userId) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "You can only pay for your own booking" });
    }
    if (!booking.isVerified) {
      return res
        .status(400)
        .json({ message: "Booking must be verified before payment" });
    }

    const land = await Land.findById(booking.LandId).populate("owner");
    if (!land) return res.status(404).json({ message: "Land not found" });

    const price = booking.totalAmount ?? land.price; // Prefer snapshot saved at booking time
    if (!price || price <= 0)
      return res.status(400).json({ message: "Invalid land price" });

    const currency = (booking.currency || "usd").toLowerCase();
    const amountInCents = Math.round(Number(price) * 100);
    const applicationFeeAmount = Math.round(
      (amountInCents * PLATFORM_FEE_PERCENT) / 100
    );

    // Require a landowner Stripe Connect account to route funds (97% to owner, 3% platform)
    const ownerStripeAccount = land.owner?.stripeAccountId || null;
    if (!ownerStripeAccount) {
      return res.status(400).json({
        message:
          "Landowner payout account not configured. Please set stripeAccountId first.",
      });
    }

    // Optional: Validate the connected account can receive transfers
    try {
      const account = await stripe.accounts.retrieve(ownerStripeAccount);
      const transfersActive = account?.capabilities?.transfers === "active";
      if (!transfersActive) {
        return res.status(400).json({
          message:
            "Landowner payout account is not eligible for transfers yet. Please complete Stripe onboarding.",
        });
      }
    } catch (e) {
      return res.status(400).json({
        message: "Unable to validate landowner payout account",
        error: e.message,
      });
    }

    const bookingIdStr = String(booking._id);
    const userIdStr = String(booking.userId?._id || booking.userId);
    const landIdStr = String(land._id);

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const sessionParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Booking for ${land.spot || land.location}`,
              metadata: { landId: landIdStr },
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: bookingIdStr,
        userId: userIdStr,
        landId: landIdStr,
      },
      success_url: `${backendUrl}/api/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/payment-cancelled`,
    };

    // Use Connect destination charges with application fee
    sessionParams.payment_intent_data = {
      application_fee_amount: applicationFeeAmount,
      transfer_data: { destination: ownerStripeAccount },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    booking.totalAmount = amountInCents / 100;
    booking.platformFeeAmount = applicationFeeAmount / 100;
    booking.ownerAmount = (amountInCents - applicationFeeAmount) / 100;
    booking.currency = currency;
    booking.paymentStatus = "processing";
    booking.stripeSessionId = session.id;
    await booking.save();

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("createCheckoutSession error", err);
    return res.status(500).json({
      message: "Failed to create checkout session",
      error: err.message,
    });
  }
};

// Success handler to confirm a session and update booking without webhooks
export const stripeSuccessAndUpdate = async (req, res) => {
  try {
    const sessionId = req.query.session_id || req.params.sessionId;
    if (!sessionId) {
      return res
        .status(400)
        .json({ message: "Missing session_id in query or params" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        message: "Payment not completed",
        status: session.payment_status,
      });
    }

    const bookingId = session.metadata?.bookingId;
    if (!bookingId) {
      return res
        .status(400)
        .json({ message: "Missing bookingId in session metadata" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Idempotent: if already marked paid, return success
    if (booking.isPaid && booking.paymentStatus === "paid") {
      return res.status(200).json({ success: true, bookingId: booking._id });
    }

    booking.isPaid = true;
    booking.paymentStatus = "paid";
    booking.paymentId = session.payment_intent || session.id;
    booking.stripePaymentIntentId = session.payment_intent || null;
    booking.bookingStatus = "completed";
    await booking.save();

    // Create transaction record
    try {
      const land = await Land.findById(booking.LandId).select("owner");
      const receiveUser = land?.owner;
      await Transaction.create({
        bookingId: booking._id,
        payUser: booking.userId,
        payUserRole: "traveler",
        receiveUser,
        receiveUserRole: "landowner",
        amount: booking.totalAmount,
        platformFeeAmount: booking.platformFeeAmount || 0,
        ownerAmount: booking.ownerAmount || 0,
        currency: booking.currency || "usd",
        paymentMethod: "Stripe",
        transactionId: booking.stripePaymentIntentId || booking.paymentId,
        stripeSessionId: booking.stripeSessionId,
        paymentStatus: "Completed",
      });
    } catch (e) {
      console.error("Transaction create error", e);
    }

    return res.status(200).json({
      success: true,
      bookingId: booking._id,
      paymentStatus: session.payment_status,
      amount_total: session.amount_total,
    });
  } catch (err) {
    console.error("stripeSuccessAndUpdate error", err);
    return res
      .status(500)
      .json({ message: "Failed to confirm payment", error: err.message });
  }
};

// Webhook handler for Stripe events
export const stripeWebhook = async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    let event;
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      const raw = Buffer.isBuffer(req.body) ? req.body.toString() : req.body;
      event = typeof raw === "string" ? JSON.parse(raw) : raw; // unsafe: only for local dev without signature
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;
        if (bookingId) {
          const booking = await Booking.findById(bookingId);
          if (booking) {
            booking.isPaid = true;
            booking.paymentStatus = "paid";
            booking.paymentId = session.payment_intent || session.id;
            booking.stripePaymentIntentId = session.payment_intent || null;
            booking.bookingStatus = "completed";
            await booking.save();
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const booking = await Booking.findOne({ stripePaymentIntentId: pi.id });
        if (booking) {
          booking.paymentStatus = "failed";
          booking.bookingStatus = "cancelled";
          await booking.save();
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;
        if (bookingId) {
          const booking = await Booking.findById(bookingId);
          if (booking && !booking.isPaid) {
            booking.paymentStatus = "failed";
            booking.bookingStatus = "cancelled";
            await booking.save();
          }
        }
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error("stripeWebhook error", err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// Retrieve session status
export const getSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return res
      .status(200)
      .json({ status: session.status, payment_status: session.payment_status });
  } catch (err) {
    console.error("getSessionStatus error", err);
    return res
      .status(500)
      .json({ message: "Failed to get session status", error: err.message });
  }
};

// Stripe Connect: create or retrieve connected account for land owner
// (Simplified) We no longer manage onboarding or login links here; landowners provide their
// Stripe Connect account ID via /connect/set, and we route funds during checkout.

// Allow a landowner to set their Stripe Connect account id manually (e.g., acct_123)
export const setOwnerStripeAccountId = async (req, res) => {
  try {
    const userId = req.user._id;
    const { stripeAccountId } = req.body || {};
    if (
      !stripeAccountId ||
      typeof stripeAccountId !== "string" ||
      !stripeAccountId.startsWith("acct_")
    ) {
      return res.status(400).json({
        message: "Invalid stripeAccountId. It should start with 'acct_'.",
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "landowner")
      return res
        .status(403)
        .json({ message: "Only land owners can set a payout account" });

    user.stripeAccountId = stripeAccountId;
    await user.save();
    return res
      .status(200)
      .json({ success: true, stripeAccountId: user.stripeAccountId });
  } catch (err) {
    console.error("setOwnerStripeAccountId error", err);
    return res
      .status(500)
      .json({ message: "Failed to set payout account", error: err.message });
  }
};
