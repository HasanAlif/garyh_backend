import mongoose from "mongoose";

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
    },
    payUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    payUserRole: {
      type: String,
      enum: ["traveler", "landowner", "admin"],
      required: true,
    },
    receiveUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiveUserRole: {
      type: String,
      enum: ["traveler", "landowner", "admin"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    platformFeeAmount: {
      type: Number,
      default: 0,
    },
    ownerAmount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "usd",
    },
    paymentMethod: {
      type: String,
      enum: ["Stripe"],
      default: "Stripe",
    },
    transactionId: {
      type: String,
      required: true,
    },
    stripeSessionId: { type: String },
    transferId: { type: String },
    transferError: { type: String },
    payoutId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["Completed", "Pending", "Failed", "Refunded", "platform_paid_only"],
      default: "Completed",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ transactionId: 1 }, { unique: true });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
