import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
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
      required: [true, "Role is required"],
      enum: ["traveler", "landowner", "admin"],
    },
    phoneNumber: {
      type: String,
    },
    image: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    savedLands: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Land",
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    resetCodeVerified: {
      type: Boolean,
      default: false,
    },
    resetCodeVerifiedAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
    stripeAccountId: {
      type: String,
      default: null,
    },
    // Bank account fields (masked for security)
    bank_name: {
      type: String,
      default: null,
    },
    bank_holder_name: {
      type: String,
      default: null,
    },
    bank_account_number: {
      type: String,
      default: null,
    },
    routing_number: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
