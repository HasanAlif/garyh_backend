import User from "../models/user.model.js";
import TempUser from "../models/tempUser.model.js";
//import { redis } from "../lib/redis.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendResetSuccessEmail,
} from "../mailtrap/emails.js";

// const generateTokens = (userId) => {
//   const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
//     expiresIn: "15m",
//   });
//   const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
//     expiresIn: "7d",
//   });
//   return { accessToken, refreshToken };
// };

// const storeRefreshToken = async (userId, refreshToken) => {
//   await redis.set(
//     `refresh_token:${userId}`,
//     refreshToken,
//     "EX",
//     60 * 60 * 24 * 7
//   ); // Store for 7 days
// };

// const setCookies = (res, accessToken, refreshToken) => {
//   res.cookie("accessToken", accessToken, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "strict",
//     maxAge: 15 * 60 * 1000, // 15 minutes
//   });
//   res.cookie("refreshToken", refreshToken, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "strict",
//     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//   });
// };

const generateTokenAndSetCookie = (res, userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return accessToken;
};

export const Signup = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Registration failed" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid Email Address" });
  }

  if (password && password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be 8 characters long" });
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "User Already Exists" });
  }

  const tempUserExists = await TempUser.findOne({ email });
  if (tempUserExists) {
    return res.status(400).json({
      message: "Please try again after 15 minutes!",
    });
  }

  try {
    const verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const tempUser = new TempUser({
      name,
      email,
      password,
      role,
      verificationToken,
      verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await tempUser.save();

    await sendVerificationEmail(email, verificationToken);

    return res.status(200).json({
      message: "Check your email to verify your account.",
      email: email,
    });
  } catch (error) {
    console.error("Error in signup process:", error);
    return res
      .status(500)
      .json({ message: "Registration failed" });
  }
};

export const verifyEmail = async (req, res) => {
  const { code } = req.body;

  try {
    const tempUser = await TempUser.findOne({
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: new Date() },
    });

    if (!tempUser) {
      return res
        .status(404)
        .json({ message: "Code is Invalid or Expired" });
    }

    const existingUser = await User.findOne({ email: tempUser.email });
    if (existingUser) {
      await TempUser.findByIdAndDelete(tempUser._id);
      return res.status(400).json({
        message: "User already exists. Please login instead.",
      });
    }

    const newUser = new User({
      name: tempUser.name,
      email: tempUser.email,
      password: tempUser.password,
      role: tempUser.role,
      isVerified: true,
    });

    await newUser.save();

    await TempUser.findByIdAndDelete(tempUser._id);

    generateTokenAndSetCookie(res, newUser._id);

    await sendWelcomeEmail(newUser.email, newUser.name);

    return res.status(201).json({
      message: "Account Created Successfully!",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
      },
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return res
      .status(500)
      .json({ message: "Internal server error: " + error.message });
  }
};

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User is not Registered" });
    }
    if (user && (await user.comparePassword(password))) {
      // const { accessToken, refreshToken } = generateTokens(user._id);
      // await storeRefreshToken(user._id, refreshToken);
      // setCookies(res, accessToken, refreshToken);

      const accessToken = generateTokenAndSetCookie(res, user._id);

      res.status(200).json({
        message: "Login successful",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
      });
    } else {
      return res.status(400).json({ message: "Invalid Email or Password" });
    }
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const Logout = async (req, res) => {
  try {
    // const refreshToken = req.cookies.refreshToken;
    // if (refreshToken) {
    //   const decoded = jwt.verify(
    //     refreshToken,
    //     process.env.REFRESH_TOKEN_SECRET
    //   );
    //   await redis.del(`refresh_token:${decoded.userId}`);
    // }

    res.clearCookie("accessToken");
    //res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error Logging Out:", error: error.message });
  }
};

// export const RefreshToken = async (req, res) => {
//   try {
//     const refreshToken = req.cookies.refreshToken;
//     if (!refreshToken) {
//       return res.status(401).json({ message: "No refresh token provided" });
//     }

//     const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

//     const storedRefreshToken = await redis.get(
//       `refresh_token:${decoded.userId}`
//     );

//     if (!storedRefreshToken) {
//       return res.status(403).json({ message: "Invalid refresh token" });
//     }

//     const accessToken = jwt.sign(
//       { userId: decoded.userId },
//       process.env.ACCESS_TOKEN_SECRET,
//       {
//         expiresIn: "15m",
//       }
//     );

//     res.cookie("accessToken", accessToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 15 * 60 * 1000, // 15 minutes
//     });

//     res.status(200).json({ message: "Token refreshed successfully" });
//   } catch (error) {
//     console.error("Error refreshing token:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordToken = resetCode;
    user.resetPasswordExpiresAt = resetCodeExpiresAt;
    await user.save();

    await sendPasswordResetEmail(user.email, resetCode);

    return res.status(200).json({
      message:
        "Password reset verification code sent to your email. Please check your email.",
      email: email,
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return res
      .status(500)
      .json({ message: "Internal server error: " + error.message });
  }
};

export const verifyResetCode = async (req, res) => {
  const { code } = req.body;

  try {
    if (!code) {
      return res.status(400).json({
        message: "Verification code is required",
      });
    }

    const user = await User.findOne({
      resetPasswordToken: code,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid Code",
      });
    }

    user.resetCodeVerified = true;
    user.resetCodeVerifiedAt = new Date();
    await user.save();

    res.status(200).json({
      message: "Verification code confirmed. You can now reset your password.",
      verified: true,
    });
  } catch (error) {
    console.error("Error verifying reset code:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  try {
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "New password and confirm password are required",
      });
    }

    // Find user who has verified reset code recently
    const user = await User.findOne({
      resetCodeVerified: true,
      resetCodeVerifiedAt: { $exists: true },
    }).sort({ resetCodeVerifiedAt: -1 }); // Get the most recently verified user

    if (!user) {
      return res.status(400).json({
        message: "Verify reset code before changing your Password",
      });
    }

    const verificationAge =
      Date.now() - new Date(user.resetCodeVerifiedAt).getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    if (verificationAge > fifteenMinutes) {
      return res.status(400).json({
        message:
          "Verification has expired. Please request a new password reset",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.resetCodeVerified = false;
    user.resetCodeVerifiedAt = undefined;
    await user.save();

    await sendResetSuccessEmail(user.email);

    res.status(200).json({
      message:
        "Password reset successful! You can now login with your new password.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.user).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "User authenticated successfully",
    });
  } catch (error) {
    console.error("Error checking authentication:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, phoneNumber, address, image } = req.body;

    if (!name && !phoneNumber && !address && !image) {
      return res.status(400).json({
        message: "At least one field (name, phoneNumber, address, or image) is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};

    if (name) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          message: "Name must be at least 2 characters long",
        });
      }
      updateData.name = name.trim();
    }

    if (phoneNumber) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          message: "Please enter a valid phone number",
        });
      }
      updateData.phoneNumber = phoneNumber;
    }

    if (address) {
      if (address.trim().length < 5) {
        return res.status(400).json({
          message: "Address must be at least 5 characters long",
        });
      }
      updateData.address = address.trim();
    }

    if (image) {
      try {
        if (user.image) {
          const publicId = user.image.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`profile_images/${publicId}`);
        }

        const cloudinaryResponse = await cloudinary.uploader.upload(image, {
          folder: "profile_images",
          transformation: [
            { width: 400, height: 400, crop: "fill" },
            { quality: "auto" },
            { format: "auto" },
          ],
        });

        updateData.image = cloudinaryResponse.secure_url;
      } catch (cloudinaryError) {
        console.error("Cloudinary upload error:", cloudinaryError);
        return res.status(400).json({
          message: "Failed to upload image. Please try again.",
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
      select: "-password",
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phoneNumber: updatedUser.phoneNumber,
        address: updatedUser.address,
        image: updatedUser.image,
        isVerified: updatedUser.isVerified,
      },
      updatedFields: Object.keys(updateData),
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
