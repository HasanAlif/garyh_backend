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
    const land = await Land.findByIdAndUpdate(
      id,
      {
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
