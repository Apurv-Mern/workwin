const router = require("express").Router();
const moment = require("moment");
const config = require("config");
const { sequelize } = require("../../../models");
const initModels = require("../../../models/init-models");
const ModelsData = initModels(sequelize);
const { Users, Session, Roles, Permissions, UserXpLog, UserLevel, LevelDefinition, Season, Rewards, EmployeeXpResults, SpinTheWheel } = ModelsData;
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
  const { name, email, password, employerCode } = req.body;
  try {
    if (!email || !password || !name || !employerCode) {
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
    const season = await HelperUtils.getActiveSeason();
    //get all seasons list data
    const GetAllSeasonsData = await Season.findAll();
    userData.seasondata = GetAllSeasonsData.map(entry => {
      let seasonStatus = "";
      const seasonName = entry?.seasons_name;
      const seasonStartDate = entry?.start_date;
      const seasonEndDate = entry?.end_date;
      const seasonStatusValue = entry?.status;
      if (seasonStatusValue == 1) {
        seasonStatus = "started";
      } else if (seasonStatusValue == 2) {
        seasonStatus = "ended";
      } else if (seasonStatusValue == 3) {
        seasonStatus = "completed";
      } else {
        seasonStatus = "Not Strated";
      }
      return {
        seasonName,
        seasonStartDate,
        seasonEndDate,
        seasonStatus,
      };
    });
    // Fetch level badges (with title and progress)
    const userLevels = await UserLevel.findAll({
      where: {
        userId: user_id,
        season_id: season?.id
      },
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
    //add all seasons details

    userData.badges = userLevels.map(entry => {
      let seasonStatus = "";
      const badgeLevel = entry.level;
      const seasonName = season?.seasons_name;
      const seasonStartDate = season?.start_date;
      const seasonEndDate = season?.end_date;
      const seasonStatusValue = season?.status;
      if (seasonStatusValue == 1) {
        seasonStatus = "started";
      } else if (seasonStatusValue == 2) {
        seasonStatus = "ended";
      } else if (seasonStatusValue == 3) {
        seasonStatus = "completed";
      } else {
        seasonStatus = "Not Strated";
      }
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
        seasonName,
        seasonStartDate,
        seasonEndDate,
        seasonStatus,
        status
      };
    });

    res.status(200).send(HelperUtils.successObj("User profile fetched", userData));
  } catch (error) {
    console.error("Error in user /me api:", error);
    return res.status(500).send(HelperUtils.errorObj("Something went wrong."));
  }
});

// Save user profile
router.post('/save_profile', userAuthMiddleware, async (req, res) => {
  const user = req.user;
  const user_id = user.userId;

  try {
    if (!user_id) {
      return res.status(401).send(HelperUtils.errorObj("Invalid input: user is not defined."));
    }

    const { gender, hairColor, skinColor } = req.body;

    await Users.update({
      gender,
      hairColor,
      skinColor
    }, {
      where: { id: user_id }
    });

    const userDetails = await Users.findByPk(user_id, {
      attributes: ['gender', 'hairColor', 'skinColor']
    });
    res.status(200).send(HelperUtils.successObj("User profile saved successfully", userDetails));

  } catch (error) {
    console.error("Error in user /save_profile api:", error);
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
  try {
    const user = await Users.findOne({ where: { email } });
    console.log("user find", user);
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
  } catch (error) {
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
    // get active season name
    const season = await HelperUtils.getActiveSeason();
    // Check daily play limit
    const todayPlays = await UserXpLog.count({
      where: {
        userId,
        source: 'game',
        season_id: season?.id,
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
        season_id: season?.id,
        source: 'game',
        date: today
      }
    });

    // if ((todayXpTotal || 0) + xp > 50) {
    //   return res.status(403).send(HelperUtils.errorObj("Daily XP cap of 50 for mini-games reached."));
    // }

    // Get current highscore for this user and game type
    const currentHighscore = await UserXpLog.max('highscore', {
      where: {
        userId,
        source: 'game',
        type: gameType,
        season_id: season?.id
      }
    }) || 0;

    // Determine if this is a new highscore
    const isNewHighscore = score > currentHighscore;
    const highscore = isNewHighscore ? score : currentHighscore;

    console.log(`User ${userId} - Game: ${gameType} - Current Score: ${score} - Previous Highscore: ${currentHighscore} - New Highscore: ${isNewHighscore}`);

    await UserXpLog.create({
      userId,
      source: 'game',
      type: gameType,
      season_id: season?.id,
      xp,
      score,
      highscore, // This will be either the new score (if it's higher) or current highscore
      date: today,
      description: description || `Played ${gameType} and scored ${score}${isNewHighscore ? ' (New Highscore!)' : ''}`
    });


    //  Update user's XP and level (uses dynamic level_definitions)
    const updatedLevel = await updateLevelAndUserXP(userId, xp);

    res.status(200).send(HelperUtils.successObj("XP claimed successfully", {
      currentLevel: updatedLevel.level,
      todayXpTotal: (todayXpTotal || 0) + xp,
      score: score,
      highscore: highscore,
      isNewHighscore: isNewHighscore,
      playsRemaining: 3 - todayPlays - 1
    }));

  } catch (err) {
    console.error("Mini-game XP error:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to claim XP"));
  }
});

// GET /user/leatherboard
router.get('/leatherboard', userAuthMiddleware, async (req, res) => {
  try {
    // Fetch top 10 users who have the 'User' role
    const leaderboardUsers = await Users.findAll({
      include: [{
        model: Roles,
        as: 'Roles',
        where: { name: 'User' },
        through: { attributes: [] },
        attributes: [] // ✅ Do not return Roles in result
      }],
      attributes: ['id', 'name', 'email', 'curr_levels', 'totalUserXp'],
      order: [['totalUserXp', 'DESC']],
      limit: 10
    });

    res.status(200).send(HelperUtils.successObj("Leaderboard fetch successfully.", leaderboardUsers));
  } catch (err) {
    console.error("Error in leaderboard API:", err);
    res.status(500).send(HelperUtils.errorObj("Something went wrong"));
  }
});

// GET /user/leatherboardTopFive
router.get('/leatherboardTopFive', userAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Step 1: Fetch all users with 'User' role
    const allUsers = await Users.findAll({
      include: [{
        model: Roles,
        as: 'Roles',
        where: { name: 'User' },
        through: { attributes: [] },
        attributes: []
      }],
      attributes: ['id', 'name', 'email', 'curr_levels', 'totalUserXp'],
      order: [['totalUserXp', 'DESC']]
    });

    // Step 2: Find index of the logged-in user
    const currentIndex = allUsers.findIndex(user => user.id === userId);

    if (currentIndex === -1) {
      return res.status(404).send(HelperUtils.errorObj("Current user not found in leaderboard"));
    }

    // Step 3: Slice 5 above and 5 below
    const start = Math.max(currentIndex - 5, 0);
    const end = currentIndex + 6; // +6 to include current user + 5 below
    const leaderboardSlice = allUsers.slice(start, end);

    res.status(200).send(HelperUtils.successObj("Leaderboard around you", leaderboardSlice));
  } catch (err) {
    console.error("Error in leaderboard slice:", err);
    res.status(500).send(HelperUtils.errorObj("Something went wrong"));
  }
});

// Get All Rewards
router.get("/rewards", userAuthMiddleware, async (req, res) => {
  try {
    const rewards = await Rewards.findAll({
      attributes: ["id", "name", "description", "reward_state", "filename"],
    });

    // Group the rewards by reward_state
    const groupedRewards = rewards.reduce((acc, reward) => {
      const formattedReward = {
        id: reward.id,
        name: reward.name,
        description: reward.description,
        filename: reward.filename
          ? `https://workwin.24livehost.com:3025/uploads/${reward.filename}`
          : null,
      };

      if (!acc[reward.reward_state]) {
        acc[reward.reward_state] = [];
      }
      acc[reward.reward_state].push(formattedReward);
      return acc;
    }, {});

    res
      .status(200)
      .send(HelperUtils.successObj("Rewards fetched successfully", groupedRewards));
  } catch (err) {
    console.error("Error fetching rewards:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to fetch rewards"));
  }
});

// Get Attendance Data grouped by month
router.get("/attendance", userAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;

    let empCode = await Users.findOne({
      where: { id: userId },
      attributes: ["userCode"],
    });

    empCode = empCode?.userCode;
    if (!empCode) {
      return res.status(401).send(HelperUtils.errorObj("Employee code missing from user session"));
    }

    const attendanceRecords = await EmployeeXpResults.findAll({
      where: { emp_code: empCode },
      attributes: [
        "id",
        "week_start_date",
        "week_end_date",
        "total_days_present",
        "current_streak",
        "max_streak",
        "total_xp",
        "multiplier",
        "total_hours",
        "sunday_present",
        "monday_present",
        "tuesday_present",
        "wednesday_present",
        "thursday_present",
        "friday_present",
        "saturday_present",

      ],
      order: [["week_start_date", "DESC"]]
    });

    // Group data by week_start_date
    const groupedData = attendanceRecords.map((record, index) => {
      // Check if current_streak is a multiple of 7 and greater than 0
      const isGameUnlocked = record.current_streak > 0 && record.current_streak % 7 === 0;

      const formattedRecord = {
        id: record.id,
        week_start_date: record.week_start_date,
        week_end_date: record.week_end_date,
        total_days_present: record.total_days_present,
        current_streak: record.current_streak,
        max_streak: record.max_streak,
        total_xp: record.total_xp,
        multiplier: record.multiplier,
        total_hours: parseFloat(record.total_hours) || 0,
        isSundayPresent: Boolean(record.sunday_present),
        isMondayPresent: Boolean(record.monday_present),
        isTuesdayPresent: Boolean(record.tuesday_present),
        isWednesdayPresent: Boolean(record.wednesday_present),
        isThursdayPresent: Boolean(record.thursday_present),
        isFridayPresent: Boolean(record.friday_present),
        isSaturdayPresent: Boolean(record.saturday_present),
        gameUnlocked: isGameUnlocked
      };
      return formattedRecord;
    });


    res.status(200).send(HelperUtils.successObj("Attendance data fetched successfully", groupedData));

  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to fetch attendance data"));
  }
});

// Spin the wheel
router.get("/wheel/configuration", userAuthMiddleware, async (req, res) => {
  try {
    // Get the global wheel configuration set by admin
    const wheelConfig = await SpinTheWheel.findOne({
      where: {
        is_active: true
      },
      attributes: [
        'id',
        'number_of_sections',
        'sections',
        'total_xp_pool',
        'is_active'
      ]
    });

    if (!wheelConfig) {
      return res.status(404).send(
        HelperUtils.errorObj("No wheel configuration available. Please contact admin.")
      );
    }

    // Format the response (limited info for users)
    const formattedConfig = {
      id: wheelConfig.id,
      numberOfSections: wheelConfig.number_of_sections,
      sections: JSON.parse(wheelConfig.sections),
      totalXpPool: wheelConfig.total_xp_pool,
      isActive: wheelConfig.is_active
    };

    res.status(200).send(
      HelperUtils.successObj("Wheel configuration retrieved successfully", formattedConfig)
    );

  } catch (err) {
    console.error("Error fetching wheel configuration:", err);
    res.status(500).send(
      HelperUtils.errorObj("Failed to fetch wheel configuration")
    );
  }
});

// Season Dashboard
router.get('/season/dashboard', userAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;

    let empCode = await Users.findOne({
      where: { id: userId },
      attributes: ["userCode"],
    });

    // Calculate current season based on current month (1-12)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();

    // Season is the current month number
    const currentSeason = currentMonth;

    // Calculate season start and end dates
    const seasonStartDate = new Date(currentYear, currentMonth - 1, 1); // First day of current month
    const seasonEndDate = new Date(currentYear, currentMonth, 0); // Last day of current month

    // Calculate total weeks in current season (month)
    const totalWeeksInSeason = Math.ceil(seasonEndDate.getDate() / 7);

    // Calculate current week number within the season
    const currentDay = currentDate.getDate();
    const currentWeekNumber = Math.ceil(currentDay / 7);

    // Get user's current attendance record to check game unlock status
    const userAttendance = await EmployeeXpResults.findOne({
      where: { emp_code: empCode?.userCode },
      order: [['week_start_date', 'DESC']],
      attributes: ['current_streak', 'max_streak', 'total_xp']
    });

    // Determine spin wheel type and unlock status
    const currentStreak = userAttendance?.current_streak || 0;
    const totalXP = userAttendance?.total_xp || 0;

    // Game unlocks based on streak (multiples of 7)
    const gameUnlocked = currentStreak > 0 && currentStreak % 7 === 0;

    // Determine spin wheel size based on streak or XP
    let spinWheelType = 'small'; // default
    if (currentStreak >= 28 || totalXP >= 50000) {
      spinWheelType = 'big';
    } else if (currentStreak >= 14 || totalXP >= 25000) {
      spinWheelType = 'medium';
    }

    // Get spin wheel configuration
    const wheelConfig = await SpinTheWheel.findOne({
      where: {
        is_active: true
      },
      attributes: ['number_of_sections', 'sections', 'total_xp_pool']
    });

    let spinWheelContents = null;
    if (wheelConfig) {
      const storedSections = JSON.parse(wheelConfig.sections);
      spinWheelContents = {
        sections: wheelConfig.number_of_sections,
        xpValues: storedSections.map(section => section.xpValue),
        totalXP: wheelConfig.total_xp_pool
      };
    }

    // Define available mini games based on streak/level
    const allMiniGames = [
      {
        name: 'WhackAMole',
        unlockStreak: 0,
        displayName: 'Whack A Mole',
        description: 'Hit the moles as fast as you can!'
      },
      {
        name: 'CrossTheRoad',
        unlockStreak: 7,
        displayName: 'Cross The Road',
        description: 'Navigate safely across busy streets'
      },
      {
        name: 'MemoryMatch',
        unlockStreak: 14,
        displayName: 'Memory Match',
        description: 'Match pairs of cards to test your memory'
      },
      {
        name: 'PuzzleSlider',
        unlockStreak: 21,
        displayName: 'Puzzle Slider',
        description: 'Slide tiles to complete the picture'
      },
      {
        name: 'SpinWheel',
        unlockStreak: 28,
        displayName: 'Lucky Spin',
        description: 'Spin the wheel for bonus XP rewards'
      }
    ];

    const unlockedMiniGames = allMiniGames.filter(game => currentStreak >= game.unlockStreak);

    // Calculate season bonus XP multiplier based on week within month
    let bonusSeasonDisplay = 1; // Default multiplier
    if (currentWeekNumber === 1) {
      bonusSeasonDisplay = 3; // First week of month bonus
    } else if (currentWeekNumber === 2) {
      bonusSeasonDisplay = 2; // Second week bonus
    } else if (currentWeekNumber >= totalWeeksInSeason - 1) {
      bonusSeasonDisplay = 4; // Last week of month rush bonus
    }

    // Get month name for season display
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentSeasonName = `${monthNames[currentMonth - 1]} ${currentYear}`;

    // Get mascot weekly tip based on current week and month
    const mascotTipsByWeek = {
      1: "🎯 New month, new opportunities! Start this season strong!",
      2: "⚡ Keep building momentum! You're in the groove now!",
      3: "🏆 Mid-month push! Your consistency is paying off!",
      4: "🎊 Final week approach! Make it count!",
      5: "🌟 Bonus week! Extra days to excel this month!"
    };

    let mascotWeeklyTip;
    if (currentStreak === 0) {
      mascotWeeklyTip = "🔥 Start your attendance streak today! Every journey begins with a single step!";
    } else if (currentStreak >= 28) {
      mascotWeeklyTip = "👑 Incredible streak! You're a true attendance champion!";
    } else {
      mascotWeeklyTip = mascotTipsByWeek[currentWeekNumber] || "💪 Keep pushing forward! Every day of attendance brings you closer to greatness!";
    }

    // Add seasonal motivational messages based on month
    const seasonalMessages = {
      1: "🎊 New Year, New Goals! Start 2025 with perfect attendance!",
      2: "💖 Love your work this February! Consistency breeds success!",
      3: "🌸 Spring into action this March! Fresh opportunities await!",
      4: "🌷 April showers bring May flowers! Stay consistent!",
      5: "🌞 May your attendance be as bright as spring sunshine!",
      6: "☀️ Summer vibes in June! Keep that energy flowing!",
      7: "🏖️ July heat is on! Stay cool and stay present!",
      8: "🌻 August abundance! Your dedication is blooming!",
      9: "🍂 September success! Back to business with style!",
      10: "🎃 October opportunities! Harvest the rewards of consistency!",
      11: "🦃 November gratitude! Thankful for your dedication!",
      12: "🎄 December determination! End the year on a high note!"
    };

    // Add seasonal context to mascot tip
    if (currentWeekNumber === 1) {
      mascotWeeklyTip = seasonalMessages[currentMonth];
    }

    // Prepare response
    const seasonDashboard = {
      // Core season info - Updated structure
      noOfWeeksInCurrentSeason: totalWeeksInSeason,
      currentSeason: currentSeason, // 1-12 (month number)
      currentWeek: currentWeekNumber, // 1-5 (week within month)

      // Spin wheel info
      spinTheWheelType: spinWheelType, // 'small', 'medium', 'big'
      spinTheWheelContents: spinWheelContents,

      // Games and bonuses
      miniGamesUnlocked: unlockedMiniGames,
      bonusSeasonDisplay: bonusSeasonDisplay,
      mascotWeeklyTip: mascotWeeklyTip,

      // Additional user context
      userStats: {
        currentStreak: currentStreak,
        totalXP: totalXP,
        gameUnlocked: gameUnlocked,
        weekProgress: `${currentWeekNumber}/${totalWeeksInSeason}`,
        seasonProgress: Math.round((currentWeekNumber / totalWeeksInSeason) * 100),
        monthProgress: Math.round((currentDay / seasonEndDate.getDate()) * 100)
      },

      // Season metadata - Updated with month-based seasons
      seasonInfo: {
        name: currentSeasonName,
        seasonNumber: currentSeason,
        monthName: monthNames[currentMonth - 1],
        startDate: seasonStartDate.toISOString().split('T')[0],
        endDate: seasonEndDate.toISOString().split('T')[0],
        daysInSeason: seasonEndDate.getDate(),
        currentDay: currentDay,
        isActive: true
      },

      // All 12 seasons info for reference
      allSeasons: monthNames.map((month, index) => ({
        seasonNumber: index + 1,
        monthName: month,
        isActive: index + 1 === currentSeason,
        startDate: new Date(currentYear, index, 1).toISOString().split('T')[0],
        endDate: new Date(currentYear, index + 1, 0).toISOString().split('T')[0]
      }))
    };

    res.status(200).send(
      HelperUtils.successObj("Season dashboard retrieved successfully", seasonDashboard)
    );

  } catch (err) {
    console.error("Error fetching season dashboard:", err);
    res.status(500).send(
      HelperUtils.errorObj("Failed to fetch season dashboard")
    );
  }
});

module.exports = router;

