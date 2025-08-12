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
        error: "ID is required in the URL parameter",
      });
    }

    const verificationCode = crypto.randomInt(100000, 999999).toString();

    const booking = await Booking.create({
      LandId: id,
      email,
      name,
      city,
      postcode,
      phoneNumber,
      gender,
      checkIn,
      checkOut,
      verificationCode,
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
      message:
        "Booking created. Please check your email for the verification code.",
      bookingId: booking._id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


