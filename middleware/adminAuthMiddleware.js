const jwt = require("jsonwebtoken");
const config = require("config");
const { sequelize } = require("../models");
const initModels = require("../models/init-models");
const Models = initModels(sequelize);
const { Users, Roles, UserRoles, Session } = Models;
const HelperUtils = require("./../utils/helpers");

const JWT_SECRET = config.get("jwtSecret");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send(HelperUtils.errorObj("You are not authorized to perform this action."));
  }

  const token = authHeader.split(" ")[1]; // Bearer <token>
  if (!token) {
    return res.status(401).send(HelperUtils.errorObj("Token is missing"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    const user = await Users.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).send(HelperUtils.errorObj("User not found. Please log in again."));
    }

    const session = await Session.findOne({ where: { token } });
    if (!session) {
      return res.status(401).send(HelperUtils.errorObj("Session not found. Please log in again."));
    }

    const currentTime = new Date();
    if (new Date(session.expiresAt) < currentTime) {
      return res.status(401).send(HelperUtils.errorObj("Token has expired. Please log in again."));
    }

    // Fetch roles from DB
    const userRoles = await UserRoles.findAll({
      where: { userId: user.id },
      include: {
        model: Roles,
        as: "role"
      }
    });

    const dbRoleNames = userRoles.map(r => r.role.name).sort();
    const tokenRoleNames = (decoded.roles || []).sort();

    // console.log(" DB Roles:", dbRoleNames);
    // console.log(" Token Roles:", tokenRoleNames);

    // Compare roles from DB vs token
    const rolesMatch =
      dbRoleNames.length === tokenRoleNames.length &&
      dbRoleNames.every((r, i) => r === tokenRoleNames[i]);

    if (!rolesMatch) {
      return res.status(401).send(HelperUtils.errorObj("Your role has been updated. Please login again."));
    }

    // Optional: block access for only basic user
    const onlyUserRole = dbRoleNames.every(role => role === "User");
    if (onlyUserRole) {
      return res.status(401).send(HelperUtils.errorObj("Access denied."));
    }

    // Attach fresh roles to req.user in case needed downstream
    req.user.roles = dbRoleNames;

    next();
  } catch (error) {
    console.error("Token error:", error);
    return res.status(401).send(HelperUtils.errorObj("Invalid or expired token."));
  }
};

module.exports = authenticateToken;
