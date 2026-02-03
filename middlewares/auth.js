const jwt = require("jsonwebtoken");
const User = require("../models/user");

const auth = (roles = []) => {
  if (typeof roles === "string") roles = [roles];

  return async (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 🔍 fetch fresh user from DB
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // 🚫 BLOCK CHECK
      if (user.isBlocked) {
        return res.status(403).json({
          message:
            "Your account has been blocked due to multiple false reports",
        });
      }

      // 🎭 Role check
      if (roles.length && !roles.includes(user.role)) {
        return res
          .status(403)
          .json({ message: "Access denied: insufficient role" });
      }

      req.user = {
        id: user._id,
        role: user.role,
      };

      next();
    } catch (err) {
      res.status(401).json({ message: "Token is not valid" });
    }
  };
};

module.exports = auth;
