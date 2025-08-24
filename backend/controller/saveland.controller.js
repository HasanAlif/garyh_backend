import Land from "../models/land.model.js";
import User from "../models/user.model.js";

export const saveLand = async (req, res) => {
  try {
    const userId = req.user._id;
    const { landId } = req.params;

    const land = await Land.findById(landId);
    if (!land) return res.status(404).json({ message: "Land not found" });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { savedLands: landId } }, // $addToSet prevents duplicates
      { new: true }
    ).populate("savedLands", "spot location price image isAvailable");

    res.status(200).json({
      saved: true,
      totalSaved: updatedUser.savedLands.length,
    });
  } catch (err) {
    console.error("Error saving land:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const unsaveLand = async (req, res) => {
  try {
    const userId = req.user._id;
    const { landId } = req.params;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { savedLands: landId } }, // $pull removes the item
      { new: true }
    ).populate("savedLands", "spot location price image isAvailable");

    res.status(200).json({
      saved: false,
      message: "Land removed from saved list",
      totalSaved: updatedUser.savedLands.length,
    });
  } catch (err) {
    console.error("Error unsaving land:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSavedLands = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate(
        "savedLands",
        "spot location price image isAvailable description amenities totalRatings averageRating"
      )
      .select("savedLands");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: `Found ${user.savedLands.length} saved land(s)`,
      savedLands: user.savedLands,
      totalSaved: user.savedLands.length,
    });
  } catch (err) {
    console.error("Error getting saved lands:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
