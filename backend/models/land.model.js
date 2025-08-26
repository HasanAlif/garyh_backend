import mongoose from "mongoose";

const landSchema = new mongoose.Schema(
  {
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    gps_coordinates: {
      latitude: {
        type: Number,
        required: [true, "Latitude is required"],
        min: [-90, "Latitude must be between -90 and 90"],
        max: [90, "Latitude must be between -90 and 90"],
      },
      longitude: {
        type: Number,
        required: [true, "Longitude is required"],
        min: [-180, "Longitude must be between -180 and 180"],
        max: [180, "Longitude must be between -180 and 180"],
      },
    },
    image: {
      type: [String],
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
      type: [String],
    },
    site_types: {
      type: [String],
    },
    site_length: {
      type: [String],
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
    ratingsAndReviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        review: {
          type: String,
          required: false,
          maxlength: 500,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Method to calculate and update average rating
landSchema.methods.calculateAverageRating = function () {
  if (this.ratingsAndReviews.length === 0) {
    this.averageRating = 0;
    this.totalRatings = 0;
  } else {
    const totalRating = this.ratingsAndReviews.reduce(
      (sum, item) => sum + item.rating,
      0
    );
    this.averageRating =
      Math.round((totalRating / this.ratingsAndReviews.length) * 10) / 10; // Round to 1 decimal
    this.totalRatings = this.ratingsAndReviews.length;
  }
  return this.save();
};

// Method to add a new rating and review
landSchema.methods.addRatingAndReview = function (
  userId,
  ratingValue,
  reviewText = ""
) {
  // Check if user has already rated this land
  const existingIndex = this.ratingsAndReviews.findIndex(
    (item) => item.user.toString() === userId.toString()
  );

  if (existingIndex !== -1) {
    // Update existing rating and review
    this.ratingsAndReviews[existingIndex].rating = ratingValue;
    this.ratingsAndReviews[existingIndex].review = reviewText;
    this.ratingsAndReviews[existingIndex].updatedAt = new Date();
  } else {
    // Add new rating and review
    this.ratingsAndReviews.push({
      user: userId,
      rating: ratingValue,
      review: reviewText,
    });
  }

  return this.calculateAverageRating();
};

// Method to remove a rating and review
landSchema.methods.removeRatingAndReview = function (userId) {
  this.ratingsAndReviews = this.ratingsAndReviews.filter(
    (item) => item.user.toString() !== userId.toString()
  );
  return this.calculateAverageRating();
};

const Land = mongoose.model("Land", landSchema);

export default Land;
