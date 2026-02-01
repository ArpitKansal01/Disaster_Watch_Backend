const transporter = require("../config/mailer");

module.exports = async function sendOtp(email, otp) {
  try {
    await transporter.sendMail({
      from: `"DisasterWatch Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your email - OTP Code",
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color:#6d28d9;">DisasterWatch Email Verification</h2>
          <p>Hello,</p>
          <p>Your One-Time Password (OTP) is:</p>
          <h1 style="letter-spacing:4px;">${otp}</h1>
          <p>This OTP will expire in <b>5 minutes</b>.</p>
        </div>
      `,
    });

    console.log("📩 OTP email sent to:", email);
  } catch (error) {
    console.error("❌ Error sending OTP email:", error.message);
    throw new Error("Failed to send OTP email");
  }
};
