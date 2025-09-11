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

const allowedOrigins = [
  "https://rvnbo.onrender.com",
  "http://10.10.20.29:3001",
  "http://10.10.20.45:3000",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://localhost:3000",
  "https://localhost:3001"
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS Request from origin:', origin);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Allow requests with no origin (like mobile apps, Postman, server-to-server)
    if (!origin) {
      console.log('No origin - allowing request');
      return callback(null, true);
    }
    
    // Allow if origin is in the allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('Origin allowed:', origin);
      callback(null, true);
    } else {
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        console.log('Development mode - allowing origin:', origin);
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error("Not allowed by CORS"));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Alternative CORS configuration - uncomment if above doesn't work
// app.use(
//   cors({
//     origin: true, // Allow all origins in development/testing
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
//   })
// );

// app.use(
//   cors({
//     origin: ["http://10.10.20.29:3001", "http://10.10.20.45:3000", "https://rvnbo.onrender.com"],
//     credentials: true,
//   })
// );

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
