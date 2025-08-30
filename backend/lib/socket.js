import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "./cloudinary.js";

const onlineUsers = new Map();

export const getReceiverSocketId = (userId) => {
  return onlineUsers.get(userId);
};

export const socketHandler = (io) => {
  console.log("Socket.io server running...");

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.headers.authorization?.split(" ")[1] ||
        socket.handshake.auth.token;
      console.log("Socket token:", token);

      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      const secret = process.env.JWT_SECRET || "secret";
      const decoded = jwt.verify(token, secret);
      console.log("Decoded token:", decoded);
      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "userId" in decoded
      ) {
        socket.userId = decoded.userId;
        next();
      } else {
        next(new Error("Authentication error: Invalid token payload"));
      }
    } catch (err) {
      console.error("Socket auth error:", err);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    console.log(`User connected: ${socket.userId}`);
    const userId = socket.userId;

    if (!userId) {
      console.log("No userId found, disconnecting socket");
      socket.disconnect();
      return;
    }

    const findUser = await User.findById(userId).select("_id isOnline");
    if (!findUser) {
      console.log("User not found in DB, disconnecting socket");
      socket.disconnect();
      return;
    }

    await User.findByIdAndUpdate(userId, { isOnline: true });

    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    io.emit("online_users", Array.from(onlineUsers.keys()));

    // find all users & emit
    socket.on("users_list", async () => {
      const users = await User.find({ _id: { $ne: userId } }).select(
        "_id name email"
      );
      socket.emit("users_list_response", users);
    });

    socket.on("send_message", async (payload) => {
      console.log("send_message payload: ", payload);
      const { receiverId, text = "", image } = payload;

      try {
        let imageUrl = null;
        if (image) {
          if (image.startsWith("http")) {
            imageUrl = image;
          } else {
            const uploadResponse = await cloudinary.uploader.upload(image, {
              folder: "message_images",
            });
            imageUrl = uploadResponse.secure_url;
          }
        }

        const newMessage = new Message({
          senderId: userId,
          receiverId,
          text,
          image: imageUrl,
        });

        const createdMessage = await newMessage.save();

        io.to(receiverId).emit("receive_message", createdMessage);
        socket.emit("message_sent", createdMessage);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });

    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
      io.emit("online_users", Array.from(onlineUsers.keys()));
      console.log(`User disconnected: ${userId}`);
    });
  });
};
