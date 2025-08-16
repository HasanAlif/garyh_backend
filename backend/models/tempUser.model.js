import mongoose from "mongoose";

const tempUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: ["traveler", "landowner"],
    },
    verificationToken: String,
    verificationTokenExpiresAt: Date,
  },
  {
    timestamps: true,
    // Auto-delete documents after 15 minutes if not verified
    expires: 900 // 15 minutes in seconds
  }
);

const TempUser = mongoose.model("TempUser", tempUserSchema);

export default TempUser;
