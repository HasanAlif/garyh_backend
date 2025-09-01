import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
//import { getReceiverSocketId } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    }).select("senderId receiverId");

    const userIds = new Set();
    messages.forEach((message) => {
      if (message.senderId.toString() !== loggedInUserId.toString()) {
        userIds.add(message.senderId.toString());
      }
      if (message.receiverId.toString() !== loggedInUserId.toString()) {
        userIds.add(message.receiverId.toString());
      }
    });

    const userIdsArray = Array.from(userIds);

    if (userIdsArray.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const filteredUsers = await User.find({
      _id: { $in: userIdsArray },
    }).select("_id name email role image");

    res.status(200).json({ success: true, data: filteredUsers });
  } catch (error) {
    console.error("Error fetching users for sidebar:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const searchUsersForSidebar = async (req, res) => {
  try {
    const { query } = req.params;
    const loggedInUserId = req.user._id;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Find all messages where the logged-in user is either sender or receiver
    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    }).select("senderId receiverId");

    // Extract unique user IDs that the logged-in user has messaged with
    const userIds = new Set();
    messages.forEach((message) => {
      if (message.senderId.toString() !== loggedInUserId.toString()) {
        userIds.add(message.senderId.toString());
      }
      if (message.receiverId.toString() !== loggedInUserId.toString()) {
        userIds.add(message.receiverId.toString());
      }
    });

    const userIdsArray = Array.from(userIds);

    if (userIdsArray.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Search among users who have had conversations with the logged-in user
    const searchResults = await User.find({
      _id: { $in: userIdsArray },
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("_id name email role image");

    res.status(200).json({ success: true, data: searchResults });
  } catch (error) {
    console.error("Error searching users for sidebar:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: -1 }); // Sort by creation time descending

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("Error fetching messages:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    console.log("Sending message from:", senderId, "to:", receiverId);

    // Validate that at least one of text or image is provided
    if ((!text || text.trim() === "") && !image) {
      return res.status(400).json({
        success: false,
        message: "Message must contain either text or image",
      });
    }

    // Handle image upload (single image or array of images)
    let imageUrls = [];
    if (image) {
      const imagesToProcess = Array.isArray(image) ? image : [image];

      for (let i = 0; i < imagesToProcess.length; i++) {
        const currentImage = imagesToProcess[i];

        if (typeof currentImage !== "string" || currentImage.trim() === "") {
          continue;
        }

        console.log(
          `Processing image ${i + 1} of ${imagesToProcess.length}...`
        );

        try {
          const uploadResponse = await cloudinary.uploader.upload(
            currentImage,
            {
              folder: "message_images",
              resource_type: "auto",
              transformation: [
                { width: 1000, height: 1000, crop: "limit" },
                { quality: "auto:good" },
                { format: "auto" },
              ],
            }
          );
          imageUrls.push(uploadResponse.secure_url);
          console.log(
            `Image ${i + 1} uploaded successfully:`,
            uploadResponse.secure_url
          );
        } catch (cloudinaryError) {
          console.error(
            `Failed to upload image ${i + 1}:`,
            cloudinaryError.message
          );
          return res.status(500).json({
            success: false,
            message:
              `Failed to upload image ${i + 1}: ` + cloudinaryError.message,
          });
        }
      }
    }

    let messageText = text;
    if (!text || text.trim() === "") {
      messageText = " ";
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: messageText,
      image: imageUrls,
    });

    await newMessage.save();

    // TODO: Implement real-time messaging with socket.io
    // const receiverSocketId = getReceiverSocketId(receiverId);
    // if (receiverSocketId) {
    //   io.to(receiverSocketId).emit("newMessage", newMessage);
    // }

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    console.error("Error sending message:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
