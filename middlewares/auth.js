const jwt = require("jsonwebtoken");

const auth = (roles = []) => {
  // roles can be single string or array of strings
  if (typeof roles === "string") roles = [roles];

  return (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token)
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      if (roles.length && !roles.includes(req.user.role)) {
        return res
          .status(403)
          .json({ message: "Access denied: insufficient role" });
      }

      next();
    } catch (err) {
      res.status(401).json({ message: "Token is not valid" });
    }
  };
};

module.exports = auth;
