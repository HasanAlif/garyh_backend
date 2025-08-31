import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.route.js";
import landRoutes from "./routes/land.route.js";
import travelerRoutes from "./routes/traveler.route.js";
import contactRoutes from "./routes/contact.route.js";
import bookingRoutes from "./routes/booking.route.js";
import globalRoutes from "./routes/global.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";
import messageRoutes from "./routes/message.route.js";
import paymentRoutes from "./routes/payment.route.js";
import { stripeWebhook } from "./controller/payment.controller.js";
import adminRoute from "./routes/admin.route.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://10.10.20.29:3001",
    credentials: true,
  })
);

app.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Serve static files for uploaded images (fallback)
app.use("/uploads", express.static("backend/uploads"));

app.get("/", (req, res) => {
  res.send("Welcome to the Garyh Backend API");
});

app.use("/api/auth", authRoutes);
app.use("/api/landowner", landRoutes);
app.use("/api/lands", landRoutes);
app.use("/api/traveler", travelerRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/global", globalRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoute);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

export default app;
