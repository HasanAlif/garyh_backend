import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  LandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Land",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  postcode: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    required: true,
  },
  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },
  verificationCode: {
    type: String,
  },
  verificationDeadline: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from creation
    }
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  bookingStatus: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },
  totalAmount: {
    type: Number,
  },
  paymentId: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
},
{
  timestamps: true,
});

// Add compound index to prevent duplicate bookings for same user, land, and overlapping dates
bookingSchema.index({ 
  userId: 1, 
  LandId: 1, 
  checkIn: 1, 
  checkOut: 1 
}, { 
  unique: true,
  name: "unique_user_land_dates"
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
