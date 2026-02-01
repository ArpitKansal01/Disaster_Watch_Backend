const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.js");
const auth = require("../middlewares/auth");
const { generateOTP, hashOTP } = require("../utils/otp");
const sendOtp = require("../utils/sendOtp");
const { resendOtp } = require("../controllers/resendOtp.js");


const router = express.Router();

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded; // contains _id and role
    next();
  });
};
// Signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "user",
      otp: hashOTP(otp),
      otpExpiresAt: Date.now() + 5 * 60 * 1000,
    });

    await user.save();
    await sendOtp(user.email, otp);

    res.status(201).json({
      message: "OTP sent to email",
      userId: user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ======================
   LOGIN → SEND OTP
====================== */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Invalid Email" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid Password" });

    if (user.role === "user") {
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" },
      );
      return res.status(200).json({ token, role: user.role });
    }

    const otp = generateOTP();
    user.otp = hashOTP(otp);
    user.otpExpiresAt = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendOtp(user.email, otp);

    res.json({
      message: "OTP sent to email",
      userId: user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ======================
   VERIFY OTP → ISSUE JWT
====================== */
router.post("/verify-otp", async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) return res.status(400).json({ message: "OTP required" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    if (
      !user.otp ||
      user.otp !== hashOTP(otp) ||
      user.otpExpiresAt < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.otp = undefined;
    user.otpExpiresAt = undefined;
    user.isVerified = true;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({ token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users/organizations (Admin only)
router.get("/all-users", auth("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Don't send passwords
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new user (Admin only)
router.post("/add-user", auth("admin"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role });
    await newUser.save();

    res.json({ message: "User added successfully", user: newUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove a user (Admin only)
router.delete("/remove-user/:id", auth("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    // Only admin can remove users
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User removed successfully", user });
  } catch (err) {
    console.error(err); // log the actual error
    res.status(500).json({ message: "Server error" });
  }
});

// Get current logged-in user
router.get("/me", verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // remove password
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/resend-otp", resendOtp);

module.exports = router;
