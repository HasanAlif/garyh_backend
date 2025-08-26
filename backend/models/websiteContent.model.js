import mongoose from "mongoose";

const websiteContentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["aboutUs", "privacyPolicy", "termsAndConditions"],
      unique: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const WebsiteContent = mongoose.model("WebsiteContent", websiteContentSchema);

export default WebsiteContent;
