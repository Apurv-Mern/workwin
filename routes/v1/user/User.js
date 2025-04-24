const router = require("express").Router();
const moment = require("moment");
const config = require("config");
const { sequelize } = require("../../../models");
const initModels = require("../../../models/init-models");
const ModelsData = initModels(sequelize);
const { Users, Session, Roles, Permissions ,UserXpLog ,UserLevel ,LevelDefinition  } = ModelsData;
const HelperUtils = require("./../../../utils/helpers");
// const HelperOpenAi = require("./../../../utils/openAiHelper");
const jwt = require("jsonwebtoken");
const JWT_SECRET = config.get("jwtSecret");
const { Sequelize } = require('sequelize');
const userAuthMiddleware = require("../../../middleware/userAuthMiddleware");
const fs = require("fs/promises");
const path = require("path");
const { DateTime } = require("luxon");
const multer = require("multer");
const fsData = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const updateLevelAndUserXP = require('../../../utils/updateLevel');
// const ExcelJS = require("exceljs");


const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".webm", ".ogg", ".mp3", ".wav"];
    const allowedMimeTypes = [
      "audio/webm",
      "audio/ogg",
      "audio/mpeg",
      "audio/wav",
      "video/webm",
    ];
    const fileExtension = require("path")
      .extname(file.originalname)
      .toLowerCase();

    if (
      file.mimetype.startsWith("audio/") ||
      allowedMimeTypes.includes(file.mimetype) ||
      allowedExtensions.includes(fileExtension)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

/**
 * @swagger
 * /user_signup:
 *   post:
 *     summary: User Signup
 *     description: This API is used for signup user or login and return the token in response.
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Signup successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     token:
 *                       type: string
 *       401:
 *         description: "Error in signup"
 */

// User Signup
router.post('/user_signup', async (req, res) => {
  const { name, email, password ,employerCode } = req.body;
  try {
    if (!email || !password || !name || employerCode) {
      return res.status(401).send(HelperUtils.errorObj("Name, email, employer code and password are required"));
    }
    //Check if employerCode exists
    const employer = await Users.findOne({ where: { employerCode: employerCode } });
    if (!employer) {
      return res.status(401).send(HelperUtils.errorObj("Invalid employer code"));
    }

    const existingUser = await Users.findOne({ where: { email } });
    if (existingUser) {
      return res.status(401).send(HelperUtils.errorObj("This email already exists"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await Users.create({ name, email, password: hashedPassword, userCode: employerCode });

    let userRole = await Roles.findOne({ where: { name: "User" } });
    if (!userRole) {
      userRole = await Roles.create({ name: "User", description: "Default app user" });
    }

    await sequelize.models.UserRoles.create({
      userId: user.id,
      roleId: userRole.id
    });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1d"
    });

    await Session.upsert({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const userData = user.toJSON();
    delete userData.password;

    res.status(200).send(HelperUtils.successObj("Signup successful", { ...userData, token }));
  } catch (error) {
    console.error("Error in user_signup api:", error);
    return res.status(500).send(HelperUtils.errorObj("Something went wrong."));
  }
});

/**
 * @swagger
 * /user_login:
 *   post:
 *     summary: User Login
 *     description: This API is used for user login and returns a token.
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     token:
 *                       type: string
 *       401:
 *         description: "Invalid credentials"
 */

router.post('/user_login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(401).send(HelperUtils.errorObj("Email and password are required"));
    }

    const user = await Users.findOne({ where: { email } });
    if (!user) {
      return res.status(401).send(HelperUtils.errorObj("Invalid credentials"));
    }

    const valid = await require("bcryptjs").compare(password, user.password);
    if (!valid) {
      return res.status(401).send(HelperUtils.errorObj("Invalid credentials"));
    }

    if (user.status == "inactive") {
      return res.status(401).send(HelperUtils.errorObj("Your account has been blocked please contact administrator."));
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1d"
    });

    await Session.upsert({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const userData = user.toJSON();
    delete userData.password;

    res.status(200).send(HelperUtils.successObj("Login successful", { ...userData, token }));

  } catch (error) {
    console.error("Error in user_login api:", error);
    return res.status(500).send(HelperUtils.errorObj("Something went wrong."));
  }
});

/**
 * @swagger
 * /me:
 *   get:
 *     summary: Get User Profile
 *     description: This API fetches the user profile.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: "Invalid input: user is not defined"
 */

router.get('/me', userAuthMiddleware, async (req, res) => {
  const user = req.user;
  const user_id = user.userId;

  try {
    if (!user_id) {
      return res.status(401).send(HelperUtils.errorObj("Invalid input: user is not defined."));
    }

    const userDetails = await Users.findByPk(user_id, {
      include: [
        {
          model: Roles,
          as: 'Roles',
          through: { attributes: [] }
        }
      ]
    });

    if (!userDetails) {
      return res.status(401).send(HelperUtils.errorObj("User not found"));
    }

    const userData = userDetails.toJSON();
    delete userData.password;

    // Extract roles
    userData.roles = userData.Roles?.map(role => role.name) || [];

    // Extract token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    userData.token = token;

    // Fetch level badges (with title and progress)
    const userLevels = await UserLevel.findAll({
      where: { userId: user_id },
      include: [
        {
          model: LevelDefinition,
          as: 'LevelDefinition',
          attributes: ['title']
        }
      ],
      order: [['level', 'ASC']]
    });

    const currLevel = userDetails.curr_levels || 0;

    userData.badges = userLevels.map(entry => {
      const badgeLevel = entry.level;
      const progress = parseFloat(entry.progress);
      let status = "locked";
    
      if (badgeLevel < currLevel) {
        status = "complete";
      } else if (badgeLevel === currLevel) {
        status = progress === 1.0 ? "complete" : "in_progress";
      }
    
      return {
        level: badgeLevel,
        title: entry.LevelDefinition?.title || `Level ${badgeLevel}`,
        progress,
        status
      };
    });

    res.status(200).send(HelperUtils.successObj("User profile fetched", userData));
  } catch (error) {
    console.error("Error in user /me api:", error);
    return res.status(500).send(HelperUtils.errorObj("Something went wrong."));
  }
});


/**
 * @swagger
 * /change_password:
 *   post:
 *     summary: Change Password
 *     description: This API allows authenticated users to change their password.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: "Password changed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: "Old password is incorrect"
 */

router.post('/change_password', userAuthMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(401).send(HelperUtils.errorObj("Old, new password and confirm password are required"));
    }

    if (newPassword != confirmPassword) {
      return res.status(401).send(HelperUtils.errorObj("New password and confirm password do not match."));
    }

    const user = await Users.findByPk(userId);
    const valid = await require("bcryptjs").compare(oldPassword, user.password);
    if (!valid) {
      return res.status(401).send(HelperUtils.errorObj("Old password is incorrect"));
    }

    const hashed = await require("bcryptjs").hash(newPassword, 10);
    await user.update({ password: hashed });

    return res.status(200).send(HelperUtils.successObj("Password changed successfully"));

  } catch (error) {
    console.error("Error in user /change password api:", error);
    return res.status(500).send(HelperUtils.errorObj("Something went wrong."));
  }
});

/**
 * @swagger
 * /forgot_password:
 *   post:
 *     summary: Forgot Password
 *     description: This API sends a password reset link to the user's email.
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: "Password reset instruction sent to email"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: "Email is required"
 */

router.post('/forgot_password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).send(HelperUtils.errorObj("Email is required"));
  }
  try{
    const user = await Users.findOne({ where: { email } });
    console.log("user find",user);
    if (!user) {
      return res.status(401).send(HelperUtils.errorObj("data not found"));
    }

    const resetToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
    const resetLink = `http://${req.get("host")}/reset-password?token=${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: config.get("MAIL_HOST"),   // e.g., smtp.mailtrap.io, smtp.office365.com
      port: config.get("MAIL_PORT"),   // or 465 if using secure SSL
      secure: config.get("MAIL_PROTOCAL"), // true for port 465, false for 587
      auth: {
        user: config.get("MAIL_USERNAME"),
        pass: config.get("MAIL_PASSWORD")
      }
    });

    await transporter.sendMail({
      from: `WorkWin Support <${config.get("MAIL_FORM")}>`,
      to: email,
      subject: "Password Reset Link",
      html: `<p>Click the link below to reset your password:</p><a href="${resetLink}">${resetLink}</a>`
    });

    return res.status(200).send(HelperUtils.successObj("Password reset instruction sent to your mail id."));
  }catch (error) {
    console.error("Error in user Forget password api:", error);
    return res.status(500).send(HelperUtils.errorObj("Something went wrong."));
  }
});

/**
 * @swagger
 * /reset_password_web:
 *   post:
 *     summary: Reset Password
 *     description: This API resets the user's password using a reset token.
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: "Password reset successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: "Invalid or expired token"
 */

router.post('/reset_password_web', async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;
  if (!token || !newPassword || !confirmPassword) {
    return res.status(401).send(HelperUtils.errorObj("Missing token or password."));
  }
  if (newPassword != confirmPassword) {
    return res.status(401).send(HelperUtils.errorObj("New password and confirm password do not match."));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await Users.findByPk(decoded.userId);
    if (!user) return res.status(401).send(HelperUtils.errorObj("User not found."));

    const hashed = await require("bcryptjs").hash(newPassword, 10);
    await user.update({ password: hashed });

    return res.status(200).send(HelperUtils.successObj("Password reset successfully. You can now log into the app."));
  } catch (error) {
    console.error("Error in user reset_password_web api:", error);
    return res.status(500).send(HelperUtils.errorObj("Something went wrong."));
  }
});

// GET /user/xp/logs
router.get('/xp/logs', userAuthMiddleware, async (req, res) => {
  const userId = req.user.userId;
  try {
    const logs = await UserXpLog.findAll({
      where: { userId },
      order: [['date', 'DESC']]
    });
    res.status(200).send(HelperUtils.successObj("XP logs fetched.", logs));
  } catch (err) {
    console.error("XP Log error:", err);
    res.status(500).send(HelperUtils.errorObj("Unable to fetch XP logs"));
  }
});

// GET /user/level
router.get('/level', userAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const levelData = await UserLevel.findOne({ where: { userId } });

    if (!levelData) {
      return res.status(404).send(HelperUtils.errorObj("Level data not found"));
    }

    res.status(200).send(HelperUtils.successObj("Level info fetched", levelData));
  } catch (err) {
    console.error("Error in level API:", err);
    res.status(500).send(HelperUtils.errorObj("Something went wrong"));
  }
});

// POST /user/xp/claim-mini-game
router.post('/xp/claim-mini-game', userAuthMiddleware, async (req, res) => {
  try {
    const { gameType, score, xp, description } = req.body;
    const userId = req.user.userId;

    if (!gameType || typeof xp !== 'number') {
      return res.status(400).send(HelperUtils.errorObj("Missing or invalid gameType or XP"));
    }

    const today = new Date().toISOString().split('T')[0];

    // Check daily play limit
    const todayPlays = await UserXpLog.count({
      where: {
        userId,
        source: 'game',
        type: gameType,
        date: today
      }
    });

    if (todayPlays >= 3) {
      return res.status(403).send(HelperUtils.errorObj("Daily limit of 3 plays reached for this game."));
    }

    //  Check XP cap of 50
    const todayXpTotal = await UserXpLog.sum('xp', {
      where: {
        userId,
        source: 'game',
        date: today
      }
    });

    if ((todayXpTotal || 0) + xp > 50) {
      return res.status(403).send(HelperUtils.errorObj("Daily XP cap of 50 for mini-games reached."));
    }

    //  Log XP
    await UserXpLog.create({
      userId,
      source: 'game',
      type: gameType,
      xp,
      date: today,
      description: description || `Played ${gameType}, score ${score}`
    });

    //  Update user's XP and level (uses dynamic level_definitions)
    const updatedLevel = await updateLevelAndUserXP(userId, xp);

    res.status(200).send(HelperUtils.successObj("XP claimed successfully", {
      currentLevel: updatedLevel.level,
      todayXpTotal: (todayXpTotal || 0) + xp
    }));

  } catch (err) {
    console.error("Mini-game XP error:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to claim XP"));
  }
});

module.exports = router;

