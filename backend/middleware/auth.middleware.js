import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    let accessToken = req.cookies.accessToken;

    if (!accessToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        accessToken = authHeader.substring(7);
      }
    }

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Please Login First",
      });
    }

    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized access" });
      }

      req.user = user;

      next();
    } catch (error) {
      console.error("Error decoding token:", error);
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ success: false, message: "Access token has expired" });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in protectRoute middleware:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const landOwnerRoute = (req, res, next) => {
  if (req.user && req.user.role === "landowner") {
    next();
  } else {
    return res
      .status(403)
      .json({ success: false, message: "Unauthorized access" });
  }
};

export const adminRoute = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res
      .status(403)
      .json({
        success: false,
        message: "Unauthorized access- Only Admin can access this route",
      });
  }
};
