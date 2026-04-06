const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

const predictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes

  max: (req) => {
    if (req.user?.role === "admin") return 1000;
    if (req.user?.role === "organization") return 30;
    return 10;
  },

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many reports submitted. Please wait 15 minutes.",
  },

  keyGenerator: (req) => {
    // ✅ Use user id if logged in
    if (req.user?.id) {
      return `user-${req.user.id}`;
    }

    // ✅ Use safe IPv6-compatible generator
    return ipKeyGenerator(req);
  },
});

module.exports = {
  predictLimiter,
};
