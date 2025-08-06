import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;
  try {
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Access token is missing" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid access token" });
      }
      req.user = decoded.userId;
      next();
    } catch (error) {
      console.error("Error decoding token:", error);
      return res
        .status(401)
        .json({ success: false, message: "Invalid access token" });
    }
  } catch (error) {
    console.error("Token verification failed:", error);
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized access" });
  }
};
