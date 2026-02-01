const User = require("../models/user");
const sendOtp = require("../utils/sendOtp");
const { generateOTP, hashOTP } = require("../utils/otp");

exports.resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ⏳ Cooldown protection (optional)
    const ONE_MINUTE = 60 * 1000;

    if (
      user.otpExpiresAt &&
      Date.now() < user.otpExpiresAt - (5 * ONE_MINUTE - ONE_MINUTE)
    ) {
      return res
        .status(429)
        .json({ message: "Please wait before requesting another OTP" });
    }

    const otp = generateOTP();

    user.otp = hashOTP(otp);
    user.otpExpiresAt = Date.now() + 5 * 60 * 1000;

    await user.save();

    await sendOtp(user.email, otp);

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
