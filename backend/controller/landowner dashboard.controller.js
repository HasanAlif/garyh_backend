import Booking from "../models/booking.model.js";
import Land from "../models/land.model.js";

export const AllBookingLand = async (req, res) => {
  try {
    const landownerId = req.user._id;

    const totalLands = await Land.find({ owner: landownerId });
    const totalLandsCount = totalLands.length;

    const allBookings = await Booking.find({
      LandId: { $in: totalLands.map(land => land._id) },
      isVerified: true,
      bookingStatus: "completed"
    })
      .populate({
        path: "LandId",
        select: "spot price"
      })
      .populate({
        path: "userId", 
        select: "name"
      })
      .sort({ createdAt: -1 });

    // Calculate total earnings from all completed bookings
    const totalEarnings = allBookings.reduce((total, booking) => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const landPrice = booking.LandId?.price || 0;
      return total + (landPrice * nights);
    }, 0);

    // Format booking details with traveler name, spot, and booking date range
    const bookingDetails = allBookings.map(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      const checkInFormatted = checkIn.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      const checkOutFormatted = checkOut.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });

      return {
        travelerName: booking.userId?.name || "Unknown",
        spotName: booking.LandId?.spot || "Unknown",
        bookingDateRange: `${checkInFormatted} - ${checkOutFormatted}`
      };
    });

    res.status(200).json({
      success: true,
      totalLands: totalLandsCount,
      totalBookings: allBookings.length,
      totalEarnings: totalEarnings,
      bookingDetails: bookingDetails
    });

  } catch (error) {
    console.error("Error fetching landowner bookings:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error", 
      error: error.message 
    });
  }
};
