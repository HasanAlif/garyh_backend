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
      start_date,
      end_date,
      price,
    } = req.body;

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
      amenities,
      rv_type,
      max_slide,
      site_types,
      site_length,
      description,
      start_date,
      end_date,
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
