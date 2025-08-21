import mongoose from "mongoose";

const BankInfoSchema = new mongoose.Schema({
  bank_name: {
    type: String,
  },
  account_holder_name: {
    type: String,
  },
  account_number: {
    type: String,
    required: true,
  },
  routing_number: {
    type: String,
  },
  country: {
    type: String,
  },
  currency: {
    type: String,
  },
});

const BusinessProfileSchema = new mongoose.Schema({
  business_name: {
    type: String,
    required: true,
  },
  website: {
    type: String,
  },
});

const stripeAccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userType: {
      type: String,
      enum: ["traveler", "landowner", "admin"],
      required: true,
    },
    stripeAccountId: {
      type: String,
      required: true,
    },
    bank_info: {
      type: BankInfoSchema,
      required: true,
    },
    business_profile: {
      type: BusinessProfileSchema,
      required: true,
    },
    externalAccountId: {
      type: String,
    },
  },
  { timestamps: true }
);

const StripeAccount = mongoose.model("StripeAccount", stripeAccountSchema);

export default StripeAccount;
