import Booking from "../models/booking.model.js";
import Land from "../models/land.model.js";
import Transaction from "../models/transaction.model.js";

export const AllBookingLand = async (req, res) => {
  try {
    const landownerId = req.user._id;

    const totalLands = await Land.find({ owner: landownerId });
    const totalLandsCount = totalLands.length;

    const allBookings = await Booking.find({
      LandId: { $in: totalLands.map((land) => land._id) },
      isVerified: true,
      bookingStatus: "completed",
    })
      .populate({
        path: "LandId",
        select: "spot price",
      })
      .populate({
        path: "userId",
        select: "name",
      })
      .sort({ createdAt: -1 });

    // Calculate total earnings from all completed bookings
    const totalEarnings = allBookings.reduce((total, booking) => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const landPrice = booking.LandId?.price || 0;
      return total + landPrice * nights;
    }, 0);

    // Format booking details with traveler name, spot, and booking date range
    const bookingDetails = allBookings.map((booking) => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      const checkInFormatted = checkIn.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const checkOutFormatted = checkOut.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return {
        travelerName: booking.userId?.name || "Unknown",
        spotName: booking.LandId?.spot || "Unknown",
        bookingDateRange: `${checkInFormatted} - ${checkOutFormatted}`,
      };
    });

    res.status(200).json({
      success: true,
      totalLands: totalLandsCount,
      totalBookings: allBookings.length,
      totalEarnings: totalEarnings,
      bookingDetails: bookingDetails,
    });
  } catch (error) {
    console.error("Error fetching landowner bookings:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const allRatingReviews = async (req, res) => {
  try {
    const landownerId = req.user._id;

    const lands = await Land.find({ owner: landownerId })
      .populate({
        path: "ratingsAndReviews.user",
        select: "name",
      })
      .select("spot ratingsAndReviews");

    if (!lands.length) {
      return res.status(404).json({
        success: false,
        message: "No lands found for this landowner",
      });
    }

    const allReviews = [];

    lands.forEach((land) => {
      if (land.ratingsAndReviews && land.ratingsAndReviews.length > 0) {
        land.ratingsAndReviews.forEach((reviewItem) => {
          // Only include reviews that have actual review text
          if (reviewItem.review && reviewItem.review.trim() !== "") {
            allReviews.push({
              travelerName: reviewItem.user?.name || "Unknown",
              spotName: land.spot || "Unknown",
              rating: reviewItem.rating,
              review: reviewItem.review,
              reviewDate: new Date(reviewItem.createdAt).toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }
              ),
            });
          }
        });
      }
    });

    // Sort reviews by date (newest first)
    allReviews.sort((a, b) => new Date(b.reviewDate) - new Date(a.reviewDate));

    res.status(200).json({
      success: true,
      totalReviews: allReviews.length,
      reviews: allReviews,
    });
  } catch (error) {
    console.error("Error fetching landowner reviews:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getEarnings = async (req, res) => {
  try {
    const userId = req.user._id;

    const allTransactions = await Transaction.find({
      receiveUser: userId,
      receiveUserRole: "landowner",
    });

    let totalEarnings = 0;

    allTransactions.forEach((transaction) => {
      if (transaction.ownerAmount) {
        totalEarnings += transaction.ownerAmount;
      }
    });

    const thisMonthTransactions = await Transaction.find({
      receiveUser: userId,
      paymentStatus: "Completed",
      receiveUserRole: "landowner",
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    });

    let thisMonthEarnings = 0;
    thisMonthTransactions.forEach((transaction) => {
      if (transaction.ownerAmount) {
        thisMonthEarnings += transaction.ownerAmount;
      }
    });

    const ownedLands = await Land.find({ owner: userId }).select("_id");
    const landIds = ownedLands.map((land) => land._id);

    const totalBookings = await Booking.countDocuments({
      LandId: { $in: landIds },
      bookingStatus: "completed",
    });

    res.json({
      success: true,
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      thisMonthEarnings: parseFloat(thisMonthEarnings.toFixed(2)),
      totalBookings,
    });
  } catch (err) {
    console.error("Error fetching earnings:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get transactions where this landowner is the receiver
    const transactions = await Transaction.find({
      receiveUser: userId,
      receiveUserRole: "landowner",
    })
      .populate("payUser", "firstName lastName email") // populate the traveler who paid
      .populate("bookingId", "landId") // get booking details
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await Transaction.countDocuments({
      receiveUser: userId,
      receiveUserRole: "landowner",
    });

    const formattedTransactions = transactions.map((transaction) => ({
      transactionId: transaction._id,
      date: transaction.createdAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: transaction.createdAt.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      amount: parseFloat((transaction.ownerAmount || 0).toFixed(2)),
      status: transaction.paymentStatus,
    }));

    res.json({
      success: true,
      transactions: formattedTransactions,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
