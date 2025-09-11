import dotenv from "dotenv";
import { cancelExpiredBookings } from "./controller/booking.controller.js";
import { startLandAvailabilityAutomation } from "./controller/land.controller.js";
import { connectDB } from "./lib/db.js";
import { socketCorsOptions } from "./config/cors.config.js";
import app from "./app.js";
import http from "http";
import { Server } from "socket.io";
import { socketHandler } from "./lib/socket.js";

dotenv.config();

const server = http.createServer(app);

const io = new Server(server, {
  cors: socketCorsOptions,
  maxHttpBufferSize: 1e8, // 100MB
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  socketHandler(io);
  await connectDB();

  startLandAvailabilityAutomation();

  await cancelExpiredBookings();
  setInterval(async () => {
    await cancelExpiredBookings();
  }, 5 * 60 * 1000);
});
