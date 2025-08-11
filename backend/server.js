import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route.js";
import landRoutes from "./routes/land.route.js";
import travelerRoutes from "./routes/traveler.route.js";
import contactRoutes from "./routes/contact.route.js";

dotenv.config();

const app = express();

// Body parsing middleware - must be before routes
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

app.use("/api/auth", authRoutes);
app.use("/api/landowner", landRoutes);
app.use("/api/lands", landRoutes);
app.use("/api/traveler", travelerRoutes);
app.use("/api/contact", contactRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  connectDB();
});
