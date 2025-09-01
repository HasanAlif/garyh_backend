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
      // console.log("Socket token:", token);

      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      const secret = process.env.JWT_SECRET || "secret";
      const decoded = jwt.verify(token, secret);
      // console.log("Decoded token:", decoded);
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
      const { receiverId, text = "", image } = payload;

      try {
        let imageUrls = [];

        if (image) {
  console.log("Processing image upload...");

  const imagesToProcess = Array.isArray(image) ? image : [image];

  // Convert Buffer objects to base64 strings
  const processedImages = imagesToProcess.map(img => {
    if (Buffer.isBuffer(img)) {
      return `data:image/jpeg;base64,${img.toString("base64")}`;
    }
    return img;
  });

  for (let i = 0; i < processedImages.length; i++) {
    const currentImage = processedImages[i];

    if (typeof currentImage !== "string" || currentImage.trim() === "") {
      continue;
    }

    if (currentImage.length > 10000000) {
      socket.emit("message_error", {
        error: `Image ${i + 1} too large. Please use a smaller image.`,
      });
      return;
    }

    let currentImageUrl;
    if (currentImage.startsWith("http")) {
      currentImageUrl = currentImage;
    } else {
      try {
        const uploadResponse = await cloudinary.uploader.upload(currentImage, {
          folder: "message_images",
          resource_type: "auto",
          transformation: [
            { width: 1000, height: 1000, crop: "limit" },
            { quality: "auto:good" },
            { format: "auto" },
          ],
        });
        currentImageUrl = uploadResponse.secure_url;
        console.log(`Image ${i + 1} uploaded successfully:`, currentImageUrl);
      } catch (cloudinaryError) {
        socket.emit("message_error", {
          error: `Failed to upload image ${i + 1}: ${cloudinaryError.message}`,
        });
        return;
      }
    }

    imageUrls.push(currentImageUrl);
  }
}

console.log("imageUrls ", imageUrls)
        let messageText = text;
        if (!text || text.trim() === "") {
          if (imageUrls.length > 0) {
            messageText = " ";
          } else {
            socket.emit("message_error", {
              error: "Message must contain either text or images",
            });
            return;
          }
        }

        const newMessage = new Message({
          senderId: userId,
          receiverId,
          text: messageText,
          image: imageUrls,
        });
        const createdMessage = await newMessage.save();

        // Emit to receiver
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", createdMessage);
          console.log("Message sent to receiver");
        } else {
          console.log("Receiver not online");
        }

        // Confirm to sender
        socket.emit("message_sent", createdMessage);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message_error", {
          error: "Failed to send message: " + error.message,
        });
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
