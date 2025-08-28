import { sender, transport } from "../mailtrap/mailtrap.config.js";
import Booking from "../models/booking.model.js";
import crypto from "crypto";
import { BOOKING_VERIFICATION_CODE } from "../mailtrap/emailTemplates.js";
import Land from "../models/land.model.js";
import { stripe, PLATFORM_FEE_PERCENT } from "../lib/stripe.js";

export const bookingLand = async (req, res) => {
  try {
    const {
      email,
      name,
      city,
      postcode,
      phoneNumber,
      gender,
      checkIn,
      checkOut,
    } = req.body;
    const { id } = req.params;
    const userId = req.user._id;

    if (
      !email ||
      !name ||
      !city ||
      !postcode ||
      !phoneNumber ||
      !gender ||
      !checkIn ||
      !checkOut
    ) {
      return res.status(400).json({
        error:
          "All fields are required: email, name, city, postcode, phoneNumber, gender, checkIn, checkOut",
      });
    }

    if (!id) {
      return res.status(400).json({
        error: "Land ID is required in the URL parameter",
      });
    }

    // Validate and parse dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({
        error: "Invalid date format. Please provide valid dates.",
      });
    }

    if (checkInDate >= checkOutDate) {
      return res.status(400).json({
        error: "Check-out date must be after check-in date",
      });
    }

    // Allow bookings for today - only reject if check-in date is before today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    const checkInDateOnly = new Date(checkInDate);
    checkInDateOnly.setHours(0, 0, 0, 0); // Set to start of check-in date

    if (checkInDateOnly < today) {
      return res.status(400).json({
        error: "Check-in date cannot be in the past",
      });
    }

    const land = await Land.findById(id);
    if (!land) {
      return res.status(404).json({
        error: "Land not found",
      });
    }

    // Check for existing booking conflicts for the same user and land
    const existingUserBooking = await Booking.findOne({
      userId,
      LandId: id,
      $or: [
        {
          checkIn: { $lte: checkInDate },
          checkOut: { $gt: checkInDate },
        },
        {
          checkIn: { $lt: checkOutDate },
          checkOut: { $gte: checkOutDate },
        },
        {
          checkIn: { $gte: checkInDate },
          checkOut: { $lte: checkOutDate },
        },
      ],
      bookingStatus: { $nin: ["cancelled"] },
    });

    if (existingUserBooking) {
      return res.status(400).json({
        error:
          "You already have a booking for this land during the selected dates. Please choose different dates.",
      });
    }

    // Check for any booking conflicts with any users during the requested dates
    const conflictingBooking = await Booking.findOne({
      LandId: id,
      $or: [
        {
          // New booking starts during existing booking
          checkIn: { $lte: checkInDate },
          checkOut: { $gt: checkInDate },
        },
        {
          // New booking ends during existing booking
          checkIn: { $lt: checkOutDate },
          checkOut: { $gte: checkOutDate },
        },
        {
          // New booking completely covers existing booking
          checkIn: { $gte: checkInDate },
          checkOut: { $lte: checkOutDate },
        },
        {
          // Existing booking completely covers new booking
          checkIn: { $lte: checkInDate },
          checkOut: { $gte: checkOutDate },
        },
      ],
      bookingStatus: { $in: ["confirmed", "pending", "completed"] },
    });

    if (conflictingBooking) {
      return res.status(400).json({
        error:
          "Land is already booked by someone for the selected dates. Please choose different dates.",
      });
    }

    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Calculate number of nights and total amount (price per night * nights)
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
    let nights = Math.ceil(diffMs / MS_PER_DAY);
    if (nights < 1) nights = 1; // safety: at least 1 night
    const totalAmount = Number((land.price * nights).toFixed(2));

    const booking = await Booking.create({
      LandId: id,
      userId,
      email,
      name,
      city,
      postcode,
      phoneNumber,
      gender,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      verificationCode,
      bookingStatus: "pending",
      totalAmount,
    });

    // Send verification email
    await transport.sendMail({
      from: sender,
      to: email,
      subject: "Booking Verification Code",
      text: `"Your Booking Verification Code"`,
      html: BOOKING_VERIFICATION_CODE.replace("{CODE}", verificationCode),
      category: "Verification Email",
    });

    res.status(200).json({
      success: true,
      message:
        "Booking created successfully. Please check your email for the verification code.",
      bookingId: booking._id,
      booking: {
        landId: booking.LandId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        status: booking.bookingStatus,
        isVerified: booking.isVerified,
        nights,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("Booking creation error:", error);

    // Handle specific MongoDB duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        error:
          "Booking conflict detected. You may already have a booking for these dates on this land.",
      });
    }

    res.status(500).json({
      error: "Failed to create booking. Please try again.",
      details: error.message,
    });
  }
};

export const verifyBooking = async (req, res) => {
  try {
    const { code } = req.body;
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        error: "Booking ID is required in the URL parameter",
      });
    }

    if (!code) {
      return res.status(400).json({
        error: "Verification code is required in the request body",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found. Please check the booking ID.",
      });
    }

    if (booking.bookingStatus === "cancelled") {
      return res.status(400).json({
        message: "This booking has been cancelled due to verification timeout.",
      });
    }

    if (booking.bookingStatus === "completed") {
      return res.status(400).json({
        message: "This booking is already verified and completed.",
      });
    }

    // Check if verification code is still valid (check against deadline)
    const now = new Date();
    const deadline =
      booking.verificationDeadline ||
      new Date(new Date(booking.createdAt).getTime() + 10 * 60 * 1000); // 10 minutes fallback

    if (now > deadline) {
      // Auto-cancel expired booking
      booking.bookingStatus = "cancelled";
      booking.verificationCode = null;
      await booking.save();

      return res.status(400).json({
        message:
          "Verification code has expired (10 minutes limit). This booking has been cancelled. Please create a new booking.",
      });
    }

    if (booking.verificationCode !== code) {
      return res.status(400).json({
        message: "Invalid verification code. Please check and try again.",
      });
    }

    booking.isVerified = true;
    booking.verificationCode = null;
    booking.bookingStatus = "confirmed";

    const land = await Land.findById(booking.LandId).populate("owner");
    if (!land) {
      await booking.save();
      return res
        .status(404)
        .json({ message: "Land not found for this booking" });
    }

    const price = booking.totalAmount ?? land.price;
    const currency = (booking.currency || "usd").toLowerCase();
    const amountInCents = Math.round(Number(price) * 100);
    const applicationFeeAmount = Math.round(
      (amountInCents * PLATFORM_FEE_PERCENT) / 100
    );
    const destination = land.owner?.stripeAccountId || null;
    if (!destination) {
      await booking.save();
      return res.status(400).json({
        message:
          "Landowner payout account not configured. Please set stripeAccountId first.",
      });
    }

    // Validate connected account can receive transfers
    try {
      const account = await stripe.accounts.retrieve(destination);
      const transfersActive = account?.capabilities?.transfers === "active";
      if (!transfersActive) {
        await booking.save();
        return res.status(400).json({
          message:
            "Landowner payout account is not eligible for transfers yet. Please complete Stripe onboarding.",
        });
      }
    } catch (e) {
      await booking.save();
      return res.status(400).json({
        message: "Unable to validate landowner payout account",
        error: e.message,
      });
    }

    const lineItemName = `Booking for ${land.spot || land.location}`;
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const sessionParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: lineItemName,
              metadata: { landId: String(land._id) },
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: String(booking._id),
        userId: String(booking.userId),
        landId: String(booking.LandId),
      },
      success_url: `${"http://localhost:5173/"}`,
      //success_url: `${backendUrl}/api/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/payment-cancelled`,
    };

    sessionParams.payment_intent_data = {
      application_fee_amount: applicationFeeAmount,
      transfer_data: { destination },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    booking.totalAmount = amountInCents / 100;
    booking.platformFeeAmount = applicationFeeAmount / 100;
    booking.ownerAmount = (amountInCents - applicationFeeAmount) / 100;
    booking.currency = currency;
    booking.paymentStatus = "processing";
    booking.stripeSessionId = session.id;
    await booking.save();

    res.status(200).json({
      success: true,
      message:
        "Booking verified. Redirect to Stripe Checkout to complete payment.",
      // redirectUrl: session.url,
      // sessionId: session.id,
      bookingId: booking._id,
      booking: {
        status: booking.bookingStatus,
        isVerified: booking.isVerified,
        isPaid: booking.isPaid,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to cancel expired bookings
export const cancelExpiredBookings = async () => {
  try {
    const now = new Date();

    // Find all pending bookings that have exceeded the 10-minute verification deadline
    const expiredBookings = await Booking.find({
      bookingStatus: "pending",
      verificationDeadline: { $lt: now },
    });

    console.log(`Found ${expiredBookings.length} expired bookings to cancel`);

    // Cancel expired bookings
    const result = await Booking.updateMany(
      {
        bookingStatus: "pending",
        verificationDeadline: { $lt: now },
      },
      {
        $set: {
          bookingStatus: "cancelled",
          verificationCode: null,
        },
      }
    );

    console.log(`Cancelled ${result.modifiedCount} expired bookings`);
    return result.modifiedCount;
  } catch (error) {
    console.error("Error cancelling expired bookings:", error);
    return 0;
  }
};

export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user._id;

    const bookings = await Booking.find({ userId })
      .populate("LandId", "name location spot images pricePerNight")
      .sort({ createdAt: -1 });

    const totalBookings = bookings.length;
    const cancelledBookings = bookings.filter(
      (booking) => booking.bookingStatus === "cancelled"
    ).length;
    const completedBookings = bookings.filter(
      (booking) => booking.bookingStatus === "completed"
    ).length;
    //const pendingBookings = bookings.filter(booking => booking.bookingStatus === 'pending').length;

    res.status(200).json({
      success: true,
      totalBookings,
      cancelledBookings,
      completedBookings,
      //pendingBookings,
      bookings: bookings.map((booking) => ({
        id: booking._id,
        land: booking.LandId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        bookingDate: booking.createdAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        spot: booking.LandId?.spot || booking.LandId?.name || "Unknown Spot",
        image:
          booking.LandId?.images && booking.LandId.images.length > 0
            ? booking.LandId.images[0]
            : [],
        price: parseFloat((booking.totalAmount || 0).toFixed(2)),
        status: booking.bookingStatus,
        isVerified: booking.isVerified,
        createdAt: booking.createdAt,
        email: booking.email,
        name: booking.name,
        phoneNumber: booking.phoneNumber,
      })),
    });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ error: error.message });
  }
};
