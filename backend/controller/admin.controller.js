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

export const getBookingStats = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed

    // Get last 12 months for chart data
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        monthName: date.toLocaleDateString("en-US", { month: "short" }),
        fullDate: new Date(date.getFullYear(), date.getMonth(), 1),
      });
    }

    // User Overview Data with Growth %
    const userOverviewData = await Promise.all(
      months.map(async (monthInfo) => {
        const userCount = await User.countDocuments({
          createdAt: {
            $gte: new Date(monthInfo.year, monthInfo.month - 1, 1),
            $lt: new Date(monthInfo.year, monthInfo.month, 1),
          },
        });
        return {
          month: monthInfo.monthName,
          year: monthInfo.year,
          users: userCount,
        };
      })
    );

    // Calculate user growth percentages
    const userOverview = userOverviewData.map((current, index) => {
      let growthPercentage = 0;
      if (index > 0) {
        const previous = userOverviewData[index - 1];
        if (previous.users > 0) {
          growthPercentage =
            ((current.users - previous.users) / previous.users) * 100;
        } else if (current.users > 0) {
          growthPercentage = 100; // First time having users
        }
      }
      return {
        ...current,
        growthPercentage: parseFloat(growthPercentage.toFixed(1)),
      };
    });

    // Booking Overview Data with Growth %
    const bookingOverviewData = await Promise.all(
      months.map(async (monthInfo) => {
        const bookingCount = await Booking.countDocuments({
          createdAt: {
            $gte: new Date(monthInfo.year, monthInfo.month - 1, 1),
            $lt: new Date(monthInfo.year, monthInfo.month, 1),
          },
        });

        const completedBookings = await Booking.countDocuments({
          createdAt: {
            $gte: new Date(monthInfo.year, monthInfo.month - 1, 1),
            $lt: new Date(monthInfo.year, monthInfo.month, 1),
          },
          bookingStatus: "completed",
        });

        return {
          month: monthInfo.monthName,
          year: monthInfo.year,
          totalBookings: bookingCount,
          completedBookings: completedBookings,
        };
      })
    );

    // Calculate booking growth percentages
    const bookingOverview = bookingOverviewData.map((current, index) => {
      let totalGrowthPercentage = 0;
      let completedGrowthPercentage = 0;

      if (index > 0) {
        const previous = bookingOverviewData[index - 1];

        // Total bookings growth
        if (previous.totalBookings > 0) {
          totalGrowthPercentage =
            ((current.totalBookings - previous.totalBookings) /
              previous.totalBookings) *
            100;
        } else if (current.totalBookings > 0) {
          totalGrowthPercentage = 100;
        }

        // Completed bookings growth
        if (previous.completedBookings > 0) {
          completedGrowthPercentage =
            ((current.completedBookings - previous.completedBookings) /
              previous.completedBookings) *
            100;
        } else if (current.completedBookings > 0) {
          completedGrowthPercentage = 100;
        }
      }

      return {
        ...current,
        totalGrowthPercentage: parseFloat(totalGrowthPercentage.toFixed(1)),
        completedGrowthPercentage: parseFloat(
          completedGrowthPercentage.toFixed(1)
        ),
      };
    });

    // Get current month summary for quick stats
    const thisMonthUsers = await User.countDocuments({
      createdAt: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lt: new Date(currentYear, currentMonth, 1),
      },
    });

    const lastMonthUsers = await User.countDocuments({
      createdAt: {
        $gte: new Date(currentYear, currentMonth - 2, 1),
        $lt: new Date(currentYear, currentMonth - 1, 1),
      },
    });

    const thisMonthBookings = await Booking.countDocuments({
      createdAt: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lt: new Date(currentYear, currentMonth, 1),
      },
    });

    const lastMonthBookings = await Booking.countDocuments({
      createdAt: {
        $gte: new Date(currentYear, currentMonth - 2, 1),
        $lt: new Date(currentYear, currentMonth - 1, 1),
      },
    });

    // Calculate overall growth percentages
    const userGrowthPercentage =
      lastMonthUsers > 0
        ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100
        : thisMonthUsers > 0
        ? 100
        : 0;

    const bookingGrowthPercentage =
      lastMonthBookings > 0
        ? ((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100
        : thisMonthBookings > 0
        ? 100
        : 0;

    // Calculate overall growth data for userOverview
    const firstMonthUsers = userOverview[0]?.users || 0;
    const latestMonthUsers = userOverview[userOverview.length - 1]?.users || 0;
    // const totalUsersInPeriod = userOverview.reduce(
    //   (sum, month) => sum + month.users,
    //   0
    // );
    //const avgUsersPerMonth = totalUsersInPeriod / userOverview.length;
    const userOverallGrowth =
      firstMonthUsers > 0
        ? ((latestMonthUsers - firstMonthUsers) / firstMonthUsers) * 100
        : latestMonthUsers > 0
        ? 100
        : 0;

    // Calculate overall growth data for bookingOverview
    const firstMonthBookings = bookingOverview[0]?.totalBookings || 0;
    const latestMonthBookings =
      bookingOverview[bookingOverview.length - 1]?.totalBookings || 0;
    // const totalBookingsInPeriod = bookingOverview.reduce(
    //   (sum, month) => sum + month.totalBookings,
    //   0
    // );
    // const totalCompletedInPeriod = bookingOverview.reduce(
    //   (sum, month) => sum + month.completedBookings,
    //   0
    // );
    // const avgBookingsPerMonth = totalBookingsInPeriod / bookingOverview.length;
    // const avgCompletedPerMonth =
    //   totalCompletedInPeriod / bookingOverview.length;
    const bookingOverallGrowth =
      firstMonthBookings > 0
        ? ((latestMonthBookings - firstMonthBookings) / firstMonthBookings) *
          100
        : latestMonthBookings > 0
        ? 100
        : 0;

    // Calculate completion rate
    // const overallCompletionRate =
    //   totalBookingsInPeriod > 0
    //     ? (totalCompletedInPeriod / totalBookingsInPeriod) * 100
    //     : 0;

    // Find best performing month for users
    // const bestUserMonth = userOverview.reduce(
    //   (best, current) => (current.users > best.users ? current : best),
    //   userOverview[0] || {}
    // );

    // Find best performing month for bookings
    // const bestBookingMonth = bookingOverview.reduce(
    //   (best, current) =>
    //     current.totalBookings > best.totalBookings ? current : best,
    //   bookingOverview[0] || {}
    // );

    res.json({
      success: true,
      userOverview: {
        chartData: userOverview,
        currentMonth: {
          users: thisMonthUsers,
          growthPercentage: parseFloat(userGrowthPercentage.toFixed(1)),
        },
        overallGrowth: {
          totalGrowthPercentage: parseFloat(userOverallGrowth.toFixed(1)),
          //   totalUsersInPeriod,
          //   averageUsersPerMonth: parseFloat(avgUsersPerMonth.toFixed(1)),
          //   firstMonthUsers,
          //   lastMonthUsers: latestMonthUsers,
          //   bestPerformingMonth: {
          //     month: bestUserMonth.month,
          //     year: bestUserMonth.year,
          //     users: bestUserMonth.users,
          //     growthPercentage: bestUserMonth.growthPercentage,
          //   },
          trend:
            latestMonthUsers > firstMonthUsers
              ? "upward"
              : latestMonthUsers < firstMonthUsers
              ? "downward"
              : "stable",
        },
      },
      bookingOverview: {
        chartData: bookingOverview,
        currentMonth: {
          totalBookings: thisMonthBookings,
          growthPercentage: parseFloat(bookingGrowthPercentage.toFixed(1)),
        },
        overallGrowth: {
          totalGrowthPercentage: parseFloat(bookingOverallGrowth.toFixed(1)),
          //   totalBookingsInPeriod,
          //   totalCompletedInPeriod,
          //   averageBookingsPerMonth: parseFloat(avgBookingsPerMonth.toFixed(1)),
          //   averageCompletedPerMonth: parseFloat(avgCompletedPerMonth.toFixed(1)),
          //   overallCompletionRate: parseFloat(overallCompletionRate.toFixed(1)),
          //   firstMonthBookings,
          //   lastMonthBookings: latestMonthBookings,
          //   bestPerformingMonth: {
          //     month: bestBookingMonth.month,
          //     year: bestBookingMonth.year,
          //     totalBookings: bestBookingMonth.totalBookings,
          //     completedBookings: bestBookingMonth.completedBookings,
          //     totalGrowthPercentage: bestBookingMonth.totalGrowthPercentage,
          //   },
          trend:
            latestMonthBookings > firstMonthBookings
              ? "upward"
              : latestMonthBookings < firstMonthBookings
              ? "downward"
              : "stable",
        },
      },
      summary: {
        totalMonths: 12,
        dataGenerated: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Error fetching booking stats:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const getRecentActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50; // Default to 50 recent activities
    const activities = [];

    // Get recent user registrations
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(limit / 5)
      .select('name email createdAt role');

    recentUsers.forEach(user => {
      activities.push({
        time: user.createdAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        userName: user.name,
        activity: 'User Registration',
        description: `New ${user.role} registered`,
        details: {
          type: 'user_registration',
          userId: user._id,
          role: user.role,
          email: user.email
        },
        priority: 'medium'
      });
    });

    // Get recent bookings
    const recentBookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(limit / 5)
      .populate('userId', 'name email')
      .populate('LandId', 'spot location')
      .select('name email bookingStatus totalAmount checkIn checkOut createdAt');

    recentBookings.forEach(booking => {
      activities.push({
        time: booking.createdAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        userName: booking.userId?.name || booking.name,
        activity: 'New Booking',
        description: `Booked ${booking.LandId?.spot || 'land'} for $${booking.totalAmount || 0}`,
        details: {
          type: 'booking_created',
          bookingId: booking._id,
          status: booking.bookingStatus,
          amount: booking.totalAmount,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          landSpot: booking.LandId?.spot || 'Unknown'
        },
        priority: 'high'
      });
    });

    // Get recent land listings
    const recentLands = await Land.find({})
      .sort({ createdAt: -1 })
      .limit(limit / 5)
      .populate('owner', 'name email')
      .select('spot location price owner createdAt');

    recentLands.forEach(land => {
      activities.push({
        time: land.createdAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        userName: land.owner?.name || 'Unknown Owner',
        activity: 'Land Listed',
        description: `Listed ${land.spot} at ${land.location} for $${land.price}/night`,
        details: {
          type: 'land_listed',
          landId: land._id,
          spot: land.spot,
          location: land.location,
          price: land.price,
          ownerId: land.owner?._id
        },
        priority: 'medium'
      });
    });

    // Get recent transactions
    const recentTransactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(limit / 5)
      .populate('payUser', 'name email')
      .populate('receiveUser', 'name email')
      .select('amount platformFeeAmount paymentStatus payUser receiveUser createdAt');

    recentTransactions.forEach(transaction => {
      activities.push({
        time: transaction.createdAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        userName: transaction.payUser?.name || 'Unknown User',
        activity: 'Payment Processed',
        description: `Payment of $${transaction.amount} - Status: ${transaction.paymentStatus}`,
        details: {
          type: 'payment_processed',
          transactionId: transaction._id,
          amount: transaction.amount,
          platformFee: transaction.platformFeeAmount,
          status: transaction.paymentStatus,
          payerName: transaction.payUser?.name,
          receiverName: transaction.receiveUser?.name
        },
        priority: transaction.paymentStatus === 'Completed' ? 'high' : 'medium'
      });
    });


    // Sort all activities by time (most recent first)
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Limit to requested number of activities
    const limitedActivities = activities.slice(0, limit);

    // Calculate activity statistics
    const activityStats = {
      total: limitedActivities.length,
      byType: {},
      byPriority: {
        high: limitedActivities.filter(a => a.priority === 'high').length,
        medium: limitedActivities.filter(a => a.priority === 'medium').length,
        low: limitedActivities.filter(a => a.priority === 'low').length
      },
      lastActivity: limitedActivities[0]?.time || null
    };

    // Count by activity type
    limitedActivities.forEach(activity => {
      const type = activity.details.type;
      activityStats.byType[type] = (activityStats.byType[type] || 0) + 1;
    });


    res.json({
      success: true,
      activities: limitedActivities,
      //statistics: activityStats,
      pagination: {
        limit,
        total: limitedActivities.length,
        hasMore: activities.length > limit
      },
      generatedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error("Error fetching recent activities:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}