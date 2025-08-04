import User from "../models/user.model.js";

export const Signup = async (req, res) => {
  const { name, email, password, role } = req.body;

  const userexists = await User.findOne({ email });
  if (userexists) {
    return res.status(400).json({ message: "User already exists" });
  }

  try {
    const newUser = new User({ name, email, password, role });
    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
