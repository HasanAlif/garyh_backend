import User from "../models/user.model.js";
import Booking from "../models/booking.model.js";
import Land from "../models/land.model.js";
import Transaction from "../models/transaction.model.js";

export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSpots = await Land.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalEarnings = await Transaction.aggregate([
      { $match: { paymentStatus: "Completed" } },
      {
        $group: {
          _id: null,
          earnings: {
            $sum: {
              $divide: ["$platformFeeAmount", 2],
            },
          },
        },
      },
    ]);

    res.json({
      success: true,
      totalUsers,
      totalSpots,
      totalBookings,
      totalEarnings: parseFloat((totalEarnings[0]?.earnings || 0).toFixed(2)),
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};