import cloudinary from "../lib/cloudinary.js";
import Land from "../models/land.model.js";

export const createLand = async (req, res) => {
  try {
    const {
      location,
      image,
      spot,
      amenities,
      rv_type,
      max_slide,
      site_types,
      site_length,
      description,
      isAvailable,
      price,
    } = req.body;

    const parseArrayField = (field) => {
      if (typeof field === "string") {
        try {
          const parsed = JSON.parse(field);
          return Array.isArray(parsed) ? parsed : [field];
        } catch {
          return [field];
        }
      }
      return Array.isArray(field) ? field : [field];
    };

    let cloudinaryResponse = null;

    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "land_images",
      });
    }

    const land = await Land.create({
      location,
      image: cloudinaryResponse?.secure_url
        ? cloudinaryResponse.secure_url
        : "",
      spot,
      amenities: parseArrayField(amenities),
      rv_type: parseArrayField(rv_type),
      max_slide: parseArrayField(max_slide),
      site_types: parseArrayField(site_types),
      site_length: parseArrayField(site_length),
      description,
      isAvailable,
      price,
      owner: req.user._id,
    });

    res.status(201).json({
      success: true,
      land,
    });
  } catch (error) {
    console.error("Error creating land:", error);
    return res
      .status(500)
      .json({ message: "Internal server error: " + error.message });
  }
};

export const getAllLand = async (req, res) => {
  try {
    const lands = await Land.find({});

    res.json({ lands });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// {This will use after Merge with frontend and can upload images to Cloudinary}

// export const deleteLand = async (req, res) => {
//   try {
//     const land = await Land.findById(req.params.id);
//     if (!land) {
//       return res.status(404).json({ message: "Land not found" });
//     }

//     if (land.image) {
//       const publicId = land.image.split("/").pop().split(".")[0];

//       try {
//         await cloudinary.uploader.destroy(`land_images/${publicId}`);
//         console.log("Image deleted from Cloudinary");
//       } catch (error) {
//         res
//           .status(500)
//           .json({
//             message: "Error deleting image from Cloudinary",
//             error: error.message,
//           });
//       }

//       await Land.findByIdAndDelete(req.params.id);

//       res.status(200).json({ message: "Land deleted successfully" });
//     }

//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

export const deleteLand = async (req, res) => {
  try {
    const { id } = req.params;
    const land = await Land.findByIdAndDelete(id);
    if (!land) {
      return res.status(404).json({ message: "Land not found" });
    }
    res.status(200).json({ message: "Land deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updateLand = async (req, res) => {
  const { id } = req.params;
  const {
    location,
    image,
    spot,
    amenities,
    rv_type,
    max_slide,
    site_types,
    site_length,
    description,
    isAvailable,
    price,
  } = req.body;

  try {
    const parseArrayField = (field) => {
      if (typeof field === "string") {
        try {
          const parsed = JSON.parse(field);
          return Array.isArray(parsed) ? parsed : [field];
        } catch {
          return [field];
        }
      }
      return Array.isArray(field) ? field : [field];
    };

    const land = await Land.findByIdAndUpdate(
      id,
      {
        location,
        image,
        spot,
        amenities: parseArrayField(amenities),
        rv_type: parseArrayField(rv_type),
        max_slide: parseArrayField(max_slide),
        site_types: parseArrayField(site_types),
        site_length: parseArrayField(site_length),
        description,
        isAvailable,
        price,
      },
      { new: true }
    );

    if (!land) {
      return res.status(404).json({ message: "Land not found" });
    }

    res.status(200).json({ message: "Land updated successfully", land });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const addRating = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.body) {
      return res.status(400).json({
        message:
          "Request body is missing. Please send rating data in JSON format.",
      });
    }

    console.log("Request body received:", req.body);

    const { rating, review } = req.body;
    const userId = req.user._id;

    if (rating === undefined || rating === null) {
      return res.status(400).json({
        message: "Rating is required. Please provide a rating between 1 and 5.",
      });
    }

    if (review && review.length > 500) {
      return res.status(400).json({
        message: "Review must be less than 500 characters",
      });
    }

    const land = await Land.findById(id);
    if (!land) {
      return res.status(404).json({ message: "Land not found" });
    }

    if (land.owner.toString() === userId.toString()) {
      return res.status(403).json({
        message: "You cannot rate your own land",
      });
    }

    await land.addRatingAndReview(userId, rating, review || "");

    await land.populate("ratingsAndReviews.user", "name email");

    res.status(200).json({
      success: true,
      message: "Rating and review added successfully",
      averageRating: land.averageRating,
      totalRatings: land.totalRatings,
      ratingsAndReviews: land.ratingsAndReviews,
    });
  } catch (error) {
    console.error("Error adding rating and review:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getLandRatings = async (req, res) => {
  try {
    const { id } = req.params;

    const land = await Land.findById(id)
      .populate("ratingsAndReviews.user", "name email")
      .select("ratingsAndReviews averageRating totalRatings location spot");

    if (!land) {
      return res.status(404).json({ message: "Land not found" });
    }

    const sortedReviews = land.ratingsAndReviews.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json({
      success: true,
      landInfo: {
        location: land.location,
        spot: land.spot,
      },
      averageRating: land.averageRating,
      totalRatings: land.totalRatings,
      ratingsAndReviews: sortedReviews,
    });
  } catch (error) {
    console.error("Error getting ratings and reviews:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// export const updateRating = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { rating, review } = req.body;
//     const userId = req.user._id;

//     if (review && review.length > 500) {
//       return res.status(400).json({
//         message: "Review must be less than 500 characters"
//       });
//     }

//     const land = await Land.findById(id);
//     if (!land) {
//       return res.status(404).json({ message: "Land not found" });
//     }

//     const existingRating = land.ratingsAndReviews.find(
//       (item) => item.user.toString() === userId.toString()
//     );

//     if (!existingRating) {
//       return res.status(404).json({
//         message: "You haven't rated this land yet"
//       });
//     }

//     await land.addRatingAndReview(userId, rating, review || '');
//     await land.populate('ratingsAndReviews.user', 'name email');

//     res.status(200).json({
//       success: true,
//       message: "Rating and review updated successfully",
//       averageRating: land.averageRating,
//       totalRatings: land.totalRatings,
//       ratingsAndReviews: land.ratingsAndReviews,
//     });
//   } catch (error) {
//     console.error("Error updating rating and review:", error);
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

// export const removeRating = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user._id;

//     const land = await Land.findById(id);
//     if (!land) {
//       return res.status(404).json({ message: "Land not found" });
//     }

//     const existingRating = land.ratingsAndReviews.find(
//       (item) => item.user.toString() === userId.toString()
//     );

//     if (!existingRating) {
//       return res.status(404).json({
//         message: "You haven't rated this land"
//       });
//     }

//     await land.removeRatingAndReview(userId);

//     res.status(200).json({
//       success: true,
//       message: "Rating and review removed successfully",
//       averageRating: land.averageRating,
//       totalRatings: land.totalRatings,
//     });
//   } catch (error) {
//     console.error("Error removing rating and review:", error);
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

export const filterLands = async (req, res) => {
  try {
    const {
      minPrice,
      maxPrice,
      minRating,
      amenities,
      site_types,
      rv_type,
      site_length,
      max_slide,
    } = req.query;

    console.log("Filter parameters received:", req.query);

    const query = {};

    if (minPrice && minPrice.trim() !== "") {
      query.price = { ...query.price, $gte: Number(minPrice) };
    }
    if (maxPrice && maxPrice.trim() !== "") {
      query.price = { ...query.price, $lte: Number(maxPrice) };
    }

    const parseArrayParam = (param) => {
      if (!param || param.trim() === "") return [];
      return param
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    };

    const amenitiesArray = parseArrayParam(amenities);
    if (amenitiesArray.length > 0) {
      query.amenities = { $all: amenitiesArray };
    }

    const siteTypesArray = parseArrayParam(site_types);
    if (siteTypesArray.length > 0) {
      query.site_types = { $in: siteTypesArray };
    }

    const rvTypesArray = parseArrayParam(rv_type);
    if (rvTypesArray.length > 0) {
      query.rv_type = { $in: rvTypesArray };
    }

    const siteLengthArray = parseArrayParam(site_length);
    if (siteLengthArray.length > 0) {
      query.site_length = { $in: siteLengthArray };
    }

    const maxSlideArray = parseArrayParam(max_slide);
    if (maxSlideArray.length > 0) {
      query.max_slide = { $in: maxSlideArray };
    }

    console.log("Built query:", JSON.stringify(query, null, 2));

    let results = await Land.find(query)
      .populate("owner", "name email")
      .sort({ createdAt: -1 }); // Sort by newest first

    if (minRating && minRating.trim() !== "") {
      const minRatingNum = Number(minRating);
      results = results.filter((land) => {
        return land.averageRating >= minRatingNum;
      });
    }

    console.log(`Found ${results.length} lands matching filters`);

    res.status(200).json({
      success: true,
      count: results.length,
      filters: {
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        minRating: minRating || null,
        amenities: amenitiesArray,
        site_types: siteTypesArray,
        rv_type: rvTypesArray,
        site_length: siteLengthArray,
        max_slide: maxSlideArray,
      },
      data: results,
    });
  } catch (error) {
    console.error("Error filtering lands:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
