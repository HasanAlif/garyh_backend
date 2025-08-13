import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route.js";
import landRoutes from "./routes/land.route.js";
import travelerRoutes from "./routes/traveler.route.js";
import contactRoutes from "./routes/contact.route.js";
import bookingRoutes from "./routes/booking.route.js";
import globalRoutes from "./routes/global.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";
import { cancelExpiredBookings } from "./controller/booking.controller.js";

dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

app.use("/api/auth", authRoutes);
app.use("/api/landowner", landRoutes);
app.use("/api/lands", landRoutes);
app.use("/api/traveler", travelerRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/global", globalRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await connectDB();
  await cancelExpiredBookings();
  setInterval(async () => {
    await cancelExpiredBookings();
  }, 5 * 60 * 1000);
});
