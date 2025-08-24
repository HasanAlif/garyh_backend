import cloudinary from "../lib/cloudinary.js";
import Land from "../models/land.model.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadImages = async (base64Images) => {
  const uploadedUrls = [];
  const uploadsDir = path.join(__dirname, "../uploads/land_images");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  for (const base64Image of base64Images) {
    try {
      const matches = base64Image.match(
        /^data:image\/([a-zA-Z]+);base64,(.+)$/
      );
      if (!matches) {
        console.error("Invalid base64 image format");
        continue;
      }

      const imageFormat = matches[1];
      const imageData = matches[2];
      const buffer = Buffer.from(imageData, "base64");

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `land_${timestamp}_${randomString}.${imageFormat}`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, buffer);

      const imageUrl = `/uploads/land_images/${filename}`;
      uploadedUrls.push(imageUrl);
    } catch (error) {
      console.error("Error in local image upload:", error);
    }
  }

  return uploadedUrls;
};

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

    let uploadedImages = [];

    if (image) {
      // Check if image is an array or single image
      const images = Array.isArray(image) ? image : [image];
      const validImages = images.filter((img) => img && img.trim() !== "");

      if (validImages.length > 0) {
        try {
          // First priority: Try Cloudinary upload
          console.log("Attempting Cloudinary upload...");

          for (const img of validImages) {
            try {
              const cloudinaryResponse = await cloudinary.uploader.upload(img, {
                folder: "land_images",
                transformation: [
                  { width: 800, height: 600, crop: "limit" },
                  { quality: "auto" },
                  { format: "auto" },
                ],
              });
              uploadedImages.push(cloudinaryResponse.secure_url);
              console.log("Cloudinary upload successful");
            } catch (cloudinaryError) {
              console.error(
                "Cloudinary upload failed for image:",
                cloudinaryError.message
              );
              throw cloudinaryError; // Throw to trigger fallback
            }
          }
        } catch (cloudinaryError) {
          console.error(
            "Cloudinary upload failed, attempting local upload fallback..."
          );

          try {
            // Fallback: Use local upload function
            const localUploadUrls = await uploadImages(validImages);
            uploadedImages = localUploadUrls;
            console.log("Local upload successful as fallback");
          } catch (localError) {
            console.error(
              "Both Cloudinary and local upload failed:",
              localError
            );
            uploadedImages = [];
          }
        }
      }
    }

    const land = await Land.create({
      location,
      image: uploadedImages,
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

export const getOwnerAllLand = async (req, res) => {
  try {
    const userId = req.user._id;

    const lands = await Land.find({ owner: userId }).populate(
      "owner",
      "name email"
    );

    res.json({
      message: `Found ${lands.length} land(s) owned by you`,
      lands,
      totalLands: lands.length,
    });
  } catch (error) {
    console.error("Error fetching user's lands:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getAvailableLand = async (req, res) => {
  try {
    // Find only lands that are available for booking
    const availableLands = await Land.find({ isAvailable: true })
      .populate("owner", "name email") // Include owner information
      .populate("ratingsAndReviews.user", "name") // Include reviewer names
      .sort({ createdAt: -1 }); // Sort by newest first

    res.json({
      message: `Found ${availableLands.length} available land(s) for booking`,
      availableLands,
      totalAvailable: availableLands.length,
    });
  } catch (error) {
    console.error("Error fetching available lands:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getAllLands = async (req, res) => {
  try {
    const lands = await Land.find({});

    if (lands.length === 0) {
      return res.status(404).json({
        message: "No lands found",
      });
    }

    res.status(200).json({
      message: `Found ${lands.length} land(s)`,
      lands,
      totalLands: lands.length,
    });
  } catch (error) {
    console.error("Error fetching all lands:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
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
    const userId = req.user._id;

    // First find the land to check ownership
    const land = await Land.findById(id);
    if (!land) {
      return res.status(404).json({ message: "Land not found" });
    }

    // Check if the current user is the owner of this land
    if (land.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Access denied. You can only delete your own land listings.",
      });
    }

    // If ownership is verified, proceed with deletion
    await Land.findByIdAndDelete(id);

    res.status(200).json({
      message: "Land deleted successfully",
      deletedLand: {
        id: land._id,
        location: land.location,
        spot: land.spot,
      },
    });
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
    const userId = req.user._id;

    const existingLand = await Land.findById(id);
    if (!existingLand) {
      return res.status(404).json({ message: "Land not found" });
    }

    if (existingLand.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Access denied. You can only update your own land listings.",
      });
    }

    const parseArrayField = (field) => {
      if (field === undefined || field === null) return undefined;
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

    const updateData = {};

    if (location !== undefined) updateData.location = location;
    if (image !== undefined) updateData.image = image;
    if (spot !== undefined) updateData.spot = spot;
    if (description !== undefined) updateData.description = description;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (price !== undefined) updateData.price = price;

    if (amenities !== undefined) {
      const parsedAmenities = parseArrayField(amenities);
      if (parsedAmenities !== undefined) updateData.amenities = parsedAmenities;
    }
    if (rv_type !== undefined) {
      const parsedRvType = parseArrayField(rv_type);
      if (parsedRvType !== undefined) updateData.rv_type = parsedRvType;
    }
    if (max_slide !== undefined) {
      const parsedMaxSlide = parseArrayField(max_slide);
      if (parsedMaxSlide !== undefined) updateData.max_slide = parsedMaxSlide;
    }
    if (site_types !== undefined) {
      const parsedSiteTypes = parseArrayField(site_types);
      if (parsedSiteTypes !== undefined)
        updateData.site_types = parsedSiteTypes;
    }
    if (site_length !== undefined) {
      const parsedSiteLength = parseArrayField(site_length);
      if (parsedSiteLength !== undefined)
        updateData.site_length = parsedSiteLength;
    }

    console.log("Fields to update:", Object.keys(updateData));

    const land = await Land.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      message: "Land updated successfully",
      land,
      updatedFields: Object.keys(updateData),
    });
  } catch (error) {
    console.error("Update error:", error);
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

    // Base query - only show available lands for public filtering
    const query = { isAvailable: true };
    const queryParams = {}; // For additional filtering parameters

    if (minPrice && minPrice.trim() !== "") {
      query.price = { ...query.price, $gte: Number(minPrice) };
      queryParams.min_price = minPrice;
    }
    if (maxPrice && maxPrice.trim() !== "") {
      query.price = { ...query.price, $lte: Number(maxPrice) };
      queryParams.max_price = maxPrice;
    }

    // Additional handling for filters object if needed
    const filters = {
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
      minRating: minRating || null,
    };

    if (filters.maxPrice !== null) {
      queryParams.max_price = filters.maxPrice;
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
      queryParams, // Include queryParams in the response
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

export const searchByLocation = async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: "Please provide a location to search.",
      });
    }

    const lands = await Land.find({
      location: { $regex: location, $options: "i" },
      isAvailable: true, // Only show available lands in search results
    })
      .populate("owner", "name email")
      .populate("ratingsAndReviews.user", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: lands.length,
      data: lands,
    });
  } catch (error) {
    console.error("Error searching by location:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const searchAndFilterLands = async (req, res) => {
  try {
    const {
      location,
      minPrice,
      maxPrice,
      minRating,
      amenities,
      site_types,
      rv_type,
      site_length,
      max_slide,
    } = req.query;

    console.log("Search and filter parameters received:", req.query);

    const query = { isAvailable: true };
    const queryParams = {}; // For additional filtering parameters

    if (location && location.trim() !== "") {
      query.location = { $regex: location.trim(), $options: "i" };
    }

    if (minPrice && minPrice.trim() !== "") {
      query.price = { ...query.price, $gte: Number(minPrice) };
      queryParams.min_price = minPrice;
    }
    if (maxPrice && maxPrice.trim() !== "") {
      query.price = { ...query.price, $lte: Number(maxPrice) };
      queryParams.max_price = maxPrice;
    }

    // Additional handling for filters object if needed
    const filters = {
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
      minRating: minRating || null,
    };

    if (filters.maxPrice !== null) {
      queryParams.max_price = filters.maxPrice;
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

    console.log(
      "Built search and filter query:",
      JSON.stringify(query, null, 2)
    );

    let results = await Land.find(query)
      .populate("owner", "name email")
      .populate("ratingsAndReviews.user", "name")
      .sort({ createdAt: -1 });

    if (minRating && minRating.trim() !== "") {
      const minRatingNum = Number(minRating);
      results = results.filter((land) => {
        return land.averageRating >= minRatingNum;
      });
    }

    console.log(`Found ${results.length} lands matching search and filters`);

    res.status(200).json({
      success: true,
      count: results.length,
      searchLocation: location || null,
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
      queryParams, // Include queryParams in the response
      data: results,
    });
  } catch (error) {
    console.error("Error searching and filtering lands:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getFeaturedLand = async (req, res) => {
  try {
    const featuredLands = await Land.find({ isAvailable: true })
      .sort({ createdAt: -1 })
      .limit(2);

    res.status(200).json({
      success: true,
      message: `Found ${featuredLands.length} featured land(s)`,
      featuredLands,
      note: "Featured lands are the 2 most recently added available lands",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getLandOwnerFeatured = async (req, res) => {
  try {
    const ownerId = req.user._id;

    const featuredLands = await Land.find({ owner: ownerId })
      .sort({ createdAt: -1 })
      .limit(4);

    res.status(200).json({
      success: true,
      message: `Here are ${featuredLands.length} featured land(s) for owner ${ownerId}`,
      featuredLands,
      note: "Featured lands are the 4 most recently added available lands",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
