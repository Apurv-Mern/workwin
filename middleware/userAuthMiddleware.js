const jwt = require("jsonwebtoken");
const config = require("config");
const { sequelize } = require("../models");
const initModels = require("../models/init-models");
const Models = initModels(sequelize);
const { Users, Roles, UserRoles, Session } = Models;

const JWT_SECRET = config.get("jwtSecret");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ success: false, message: "You are not authorized to perform this action." });
  }

  const token = authHeader.split(" ")[1]; // Bearer <token>
  if (!token) {
    return res.status(401).send({ success: false, message: "Token is missing" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Check if user exists
    const user = await Users.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).send({ success: false, message: "User not found. Please log in again." });
    }

    // Check if token exists in session
    const session = await Session.findOne({ where: { token } });
    if (!session) {
      return res.status(401).send({ success: false, message: "Session not found. Please log in again." });
    }

    // Token expiration
    const currentTime = new Date();
    if (new Date(session.expiresAt) < currentTime) {
      return res.status(401).send({ success: false, message: "Token has expired. Please log in again." });
    }

    // Check user role (must be "User")
    const roles = await UserRoles.findAll({
      where: { userId: user.id },
      include: {
        model: Roles,
        as: "role", // Must match alias from init-models
      }
    });

    const roleNames = roles.map(r => r.role.name);
    if (!roleNames.includes("User")) {
      return res.status(401).send({ success: false, message: "Access denied." });
    }

    // All checks passed
    next();

  } catch (error) {
    console.error("Token error:", error);
    return res.status(401).send({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = authenticateToken;
