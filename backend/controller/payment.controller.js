import { stripe, PLATFORM_FEE_PERCENT } from "../lib/stripe.js";
import Booking from "../models/booking.model.js";
import Land from "../models/land.model.js";
import User from "../models/user.model.js";
import Transaction from "../models/transaction.model.js";
import StripeAccount from "../models/stripeAccount.model.js";

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
    const ownerStripeAccount = land.owner?./* The above code is a comment in JavaScript. It is not
    performing any specific action in the code, but it is
    used to provide information or explanations about the
    code for developers who may be reading it. The text
    "stripeAccountId" is not a valid JavaScript syntax, so it
    is likely just a placeholder or example text within the
    comment. */
    stripeAccountId || null;
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
        ownerStripeAccountId: ownerStripeAccount,
        applicationFeeAmount: applicationFeeAmount,
        ownerAmount: amountInCents - applicationFeeAmount
      },
      success_url: `${backendUrl}/api/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/payment-cancelled`,
    };

    // Collect payment directly to platform account
    // We'll handle the transfer to the landowner after successful payment
    // This ensures platform fees are in available balance, not just incoming

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Store only minimal data during checkout - save the rest after successful payment
    booking.paymentStatus = "processing";
    booking.stripeSessionId = session.id;
    await booking.save();

    // Store payment metadata for use after successful payment
    return res.status(200).json({ 
      url: session.url, 
      sessionId: session.id 
    });
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

    // Get the full payment details from Stripe
    const paymentIntent = session.payment_intent ? 
      await stripe.paymentIntents.retrieve(session.payment_intent) : 
      null;
    
    // Calculate payment amounts
    const land = await Land.findById(booking.LandId).populate("owner");
    if (!land) {
      return res.status(404).json({ message: "Land not found" });
    }

    const price = session.amount_total / 100; // Amount in currency units from the successful payment
    const currency = session.currency || "usd";
    const amountInCents = session.amount_total;
    const applicationFeeAmount = Math.round((amountInCents * PLATFORM_FEE_PERCENT) / 100);
    const ownerAmount = amountInCents - applicationFeeAmount;
    const ownerStripeAccountId = land.owner?.stripeAccountId || session.metadata?.ownerStripeAccountId;

    // Update booking with payment details
    booking.totalAmount = price;
    booking.platformFeeAmount = applicationFeeAmount / 100;
    booking.ownerAmount = ownerAmount / 100;
    booking.currency = currency;
    booking.isPaid = true;
    booking.paymentStatus = "paid";
    booking.paymentId = session.payment_intent || session.id;
    booking.stripePaymentIntentId = session.payment_intent || null;
    booking.bookingStatus = "completed";
    
    // After successful payment, transfer the owner's portion to their Stripe account
    let transferId = null;
    let transferError = null;
    
    try {
      if (ownerStripeAccountId) {
        // Create a transfer to the connected account
        const transfer = await stripe.transfers.create({
          amount: ownerAmount, // Transfer the owner's portion (97%)
          currency: currency,
          destination: ownerStripeAccountId,
          transfer_group: `booking_${booking._id}`,
          metadata: {
            bookingId: String(booking._id),
            userId: String(booking.userId),
            landId: String(booking.LandId)
          },
          description: `Transfer for booking ${booking._id}`
        });
        
        transferId = transfer.id;
        booking.stripeTransferId = transfer.id;
        console.log(`Transfer completed: ${transfer.id}`);
      }
    } catch (e) {
      console.error("Transfer error:", e);
      transferError = e.message;
      booking.transferError = e.message;
    }
    
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
        transferId: transferId,
        transferError: transferError,
        paymentStatus: transferError ? "platform_paid_only" : "Completed",
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
            // Calculate payment amounts if not already calculated
            if (!booking.isPaid) {
              const land = await Land.findById(booking.LandId).populate("owner");
              if (land) {
                const price = session.amount_total / 100;
                const currency = session.currency || "usd";
                const amountInCents = session.amount_total;
                const applicationFeeAmount = Math.round((amountInCents * PLATFORM_FEE_PERCENT) / 100);
                const ownerAmount = amountInCents - applicationFeeAmount;
                const ownerStripeAccountId = land.owner?.stripeAccountId || session.metadata?.ownerStripeAccountId;
                
                booking.totalAmount = price;
                booking.platformFeeAmount = applicationFeeAmount / 100;
                booking.ownerAmount = ownerAmount / 100;
                booking.currency = currency;
                booking.isPaid = true;
                booking.paymentStatus = "paid";
                booking.paymentId = session.payment_intent || session.id;
                booking.stripePaymentIntentId = session.payment_intent || null;
                booking.bookingStatus = "completed";
                
                // After successful payment, transfer the owner's portion
                let transferId = null;
                let transferError = null;
                
                try {
                  if (ownerStripeAccountId) {
                    // Create a transfer to the connected account
                    const transfer = await stripe.transfers.create({
                      amount: ownerAmount, // Transfer the owner's portion (97%)
                      currency: currency,
                      destination: ownerStripeAccountId,
                      transfer_group: `booking_${booking._id}`,
                      metadata: {
                        bookingId: String(booking._id),
                        userId: String(booking.userId),
                        landId: String(booking.LandId)
                      },
                      description: `Transfer for booking ${booking._id}`
                    });
                    
                    transferId = transfer.id;
                    booking.stripeTransferId = transfer.id;
                    console.log(`Webhook transfer completed: ${transfer.id}`);
                  }
                } catch (e) {
                  console.error("Webhook transfer error:", e);
                  transferError = e.message;
                  booking.transferError = e.message;
                }
                
                await booking.save();
                
                // Create transaction record
                try {
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
                    transferId: transferId,
                    transferError: transferError,
                    paymentStatus: transferError ? "platform_paid_only" : "Completed",
                  });
                } catch (e) {
                  console.error("Transaction create error in webhook", e);
                }
              }
            }
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

export const createAndUpdateConnectedAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const existingUser = req.user;

    if (existingUser.role !== "landowner") {
      return res.status(403).json({
        message:
          "Only landowners can add bank account information to receive payments from travelers.",
      });
    }

    let accountId = existingUser.stripeAccountId;

    const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
    let accountLink;

    if (!accountId) {
      // Create new Stripe Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: existingUser?.email,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: "individual", // Simplified for individual landowners
        settings: {
          payouts: {
            schedule: {
              interval: "daily", // Enable daily payouts
            },
          },
        },
      });

      // Save the Stripe account ID immediately to the user
      existingUser.stripeAccountId = account.id;
      await existingUser.save();
      accountId = account.id;

      accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/api/payment/stripe_bank/create`,
        return_url: `${baseUrl}/api/payment/stripe_bank/success?accountId=${accountId}&userId=${userId}`,
        type: "account_onboarding",
      });
    } else {
      // Update existing account
      accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/api/payment/stripe_bank/create`,
        return_url: `${baseUrl}/api/payment/stripe_bank/success/update?accountId=${accountId}&userId=${userId}`,
        type: "account_onboarding",
      });
    }

    return res.status(200).json({
      success: true,
      url: accountLink.url,
      message: accountId
        ? "Account update link created"
        : "New account onboarding link created",
    });
  } catch (error) {
    console.error("createAndUpdateConnectedAccount error:", error);
    return res
      .status(error?.statusCode || 500)
      .json({ message: error?.message || "Internal Server Error" });
  }
};

export const saveStripeAccount = async (req, res) => {
  try {
    const { accountId, userId } = req.query;

    if (!accountId || !userId) {
      return res
        .status(400)
        .json({ message: "Missing accountId or userId parameter" });
    }

    // Find user by the userId passed in the redirect
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "landowner") {
      return res
        .status(403)
        .json({ message: "Only landowners can complete bank account setup" });
    }

    const stripeAccount = await stripe.accounts.retrieve(accountId);

    if (!stripeAccount.details_submitted) {
      return res
        .status(400)
        .json({
          message:
            "Onboarding not completed. Please complete all required information in Stripe.",
        });
    }

    const individual = stripeAccount?.individual;
    const bank_info = stripeAccount.external_accounts?.data[0] || {};
    const business_name =
      `${individual?.first_name || ""} ${individual?.last_name || ""}`.trim() ||
      user.name;

    const stripeAccountData = {
      name: user?.name || "Unknown",
      email: user?.email,
      user: user._id,
      userType: user.role,
      stripeAccountId: accountId,
      externalAccountId: bank_info?.id || null,
      bank_info: {
        bank_name: bank_info?.bank_name || null,
        account_holder_name: bank_info?.account_holder_name || user?.name,
        account_number: bank_info?.last4 ? "****" + bank_info.last4 : null,
        routing_number: bank_info?.routing_number || null,
        country: bank_info?.country || "US",
        currency: bank_info?.currency || "usd",
      },
      business_profile: {
        business_name: business_name,
        website: stripeAccount?.business_profile?.url || "www.example.com",
      },
    };

    const savedStripeAccount = await StripeAccount.findOneAndUpdate(
      { user: user._id },
      stripeAccountData,
      { new: true, upsert: true }
    );

    await User.findByIdAndUpdate(
      user._id,
      {
        stripeAccountId: accountId,
        bank_name: stripeAccountData.bank_info.bank_name,
        bank_holder_name: stripeAccountData.bank_info.account_holder_name,
        bank_account_number: stripeAccountData.bank_info.account_number,
        routing_number: stripeAccountData.bank_info.routing_number,
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Bank account saved successfully",
      data: savedStripeAccount,
    });
  } catch (err) {
    console.error("saveStripeAccount error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

export const updateStripeAccount = async (req, res) => {
  try {
    const { accountId, userId } = req.query;

    if (!accountId || !userId) {
      return res
        .status(400)
        .json({ message: "Missing accountId or userId parameter" });
    }

    // Find user by the userId passed in the redirect
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "landowner") {
      return res
        .status(403)
        .json({
          message: "Only landowners can update bank account information",
        });
    }

    const stripeAccount = await stripe.accounts.retrieve(accountId);

    if (!stripeAccount?.individual && !stripeAccount?.company) {
      return res
        .status(400)
        .json({ message: "Stripe account not found or incomplete." });
    }

    // Extract updated information
    const individual = stripeAccount?.individual;
    const company = stripeAccount?.company;
    const bank_info = stripeAccount.external_accounts?.data[0] || {};
    const business_name =
      company?.name ||
      `${individual?.first_name || ""} ${individual?.last_name || ""}`.trim() ||
      user.name;

    // Create or update the StripeAccount record (upsert)
    const updatedStripeAccount = await StripeAccount.findOneAndUpdate(
      { user: user._id, stripeAccountId: accountId },
      {
        user: user._id,
        stripeAccountId: accountId,
        name: user?.name || "Unknown",
        bank_info: {
          bank_name: bank_info?.bank_name || null,
          account_holder_name: bank_info?.account_holder_name || user?.name,
          account_number: bank_info?.last4 ? "****" + bank_info.last4 : null,
          routing_number: bank_info?.routing_number || null,
          country: bank_info?.country || "US",
          currency: bank_info?.currency || "usd",
        },
        business_profile: {
          business_name: business_name,
          website: stripeAccount?.business_profile?.url || "www.example.com",
        },
        externalAccountId: bank_info?.id || null,
      },
      {
        new: true,
        upsert: true, // Create if doesn't exist
        setDefaultsOnInsert: true,
      }
    );

    await User.findByIdAndUpdate(
      user._id,
      {
        bank_name: bank_info?.bank_name || null,
        bank_holder_name: bank_info?.account_holder_name || user?.name,
        bank_account_number: bank_info?.last4 ? "****" + bank_info.last4 : null,
        routing_number: bank_info?.routing_number || null,
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Bank account updated successfully",
      data: updatedStripeAccount,
    });
  } catch (err) {
    console.error("updateStripeAccount error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// Get user's bank info with verification status
export const getUserBankInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const bankAccount = await StripeAccount.findOne({ user: userId });

    if (!bankAccount) {
      return res.status(404).json({
        message: "No bank account found",
        verification_message:
          "No bank account linked. Please set up your bank account.",
        success_verification: false,
      });
    }

    let verification_message = "Bank account verified and ready for transfers.";
    let success_verification = true;

    try {
      const stripeAccount = await stripe.accounts.retrieve(
        bankAccount?.stripeAccountId
      );

      if (!stripeAccount) {
        success_verification = false;
        verification_message = "Stripe account not found or invalid.";
      } else {
        const externalAccount = stripeAccount?.external_accounts?.data?.find(
          (account) => account.id === bankAccount.externalAccountId
        );

        if (!externalAccount) {
          success_verification = false;
          verification_message =
            "Bank account not found or not linked to Stripe.";
        } else if (
          !stripeAccount.capabilities?.transfers ||
          stripeAccount.capabilities.transfers !== "active"
        ) {
          if (
            stripeAccount.requirements?.disabled_reason ===
            "requirements.pending_verification"
          ) {
            success_verification = false;
            verification_message =
              "Bank account verification is in progress. Please wait for the verification process to complete.";
          } else {
            success_verification = false;
            verification_message =
              "Bank account is not eligible for transfers. Please complete bank account verification with valid information.";
          }
        }
      }
    } catch (error) {
      console.error("Stripe account retrieval error:", error);
      verification_message =
        "Your Account Not Found, Please update your bank account information!";
      success_verification = false;
    }

    return res.status(200).json({
      success: true,
      message: "Bank info retrieved successfully.",
      data: {
        bankAccount,
        verification_message,
        success_verification,
      },
    });
  } catch (err) {
    console.error("getUserBankInfo error:", err);
    return res
      .status(500)
      .json({ message: "Failed to get bank info", error: err.message });
  }
};

export const getMyTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const tx = await Transaction.find({
      $or: [{ payUser: userId }, { receiveUser: userId }],
    })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ count: tx.length, transactions: tx });
  } catch (err) {
    console.error("getMyTransactions error", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch transactions", error: err.message });
  }
};
