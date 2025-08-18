import dotenv from "dotenv";
import { cancelExpiredBookings } from "./controller/booking.controller.js";
import { server } from "./lib/socket.js";
import { connectDB } from "./lib/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await connectDB();
  await cancelExpiredBookings();
  setInterval(async () => {
    await cancelExpiredBookings();
  }, 5 * 60 * 1000);
});
