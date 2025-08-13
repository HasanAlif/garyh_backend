import { sender, transport } from "../mailtrap/mailtrap.config.js";
import Booking from "../models/booking.model.js";
import crypto from "crypto";
import { BOOKING_VERIFICATION_CODE } from "../mailtrap/emailTemplates.js";

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

    if (checkInDate < new Date()) {
      return res.status(400).json({
        error: "Check-in date cannot be in the past",
      });
    }

    // Check for existing booking conflicts for the same user and land
    const existingBooking = await Booking.findOne({
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
      bookingStatus: { $nin: ["cancelled", "completed"] },
    });

    if (existingBooking) {
      return res.status(400).json({
        error:
          "You already have a booking for this land during the selected dates. Please choose different dates.",
      });
    }

    const verificationCode = crypto.randomInt(100000, 999999).toString();

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
    booking.bookingStatus = "completed";
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking verified and completed successfully!",
      bookingId: booking._id,
      booking: {
        status: booking.bookingStatus,
        isVerified: booking.isVerified,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
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
      .populate("LandId", "name location images pricePerNight")
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
