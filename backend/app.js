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

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

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
app.use("/api/payments", paymentRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

export default app;
