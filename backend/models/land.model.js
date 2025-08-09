import mongoose from "mongoose";

const landSchema = new mongoose.Schema(
  {
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    image: {
      type: String,
      //   required: [true, "Please provide an image of your spot"],
    },
    spot: {
      type: String,
      required: [true, "Please provide a Spot name"],
    },
    amenities: {
      type: [String],
      required: [true, "Amenities are required"],
    },
    rv_type: {
      type: [String],
    },
    max_slide: {
      type: [Number],
    },
    site_types: {
      type: [String],
    },
    site_length: {
      type: [String, Number],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    isAvailable: {
      type: Boolean,
      required: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Land = mongoose.model("Land", landSchema);

export default Land;
