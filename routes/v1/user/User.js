const router = require("express").Router();
const config = require("config");
const { sequelize } = require("../../../models");
const initModels = require("../../../models/init-models");
const ModelsData = initModels(sequelize);
const { Users, Session, Roles, Permissions, UserXpLog, UserLevel, LevelDefinition, Rewards, EmployeeXpResults, SpinTheWheel, BonusSeason, XpThreshold } = ModelsData;

const HelperUtils = require("./../../../utils/helpers");
const xpBadgeSystem = require("./../../../utils/xpBadgeSystem");
const { getStreakBadge } = require("../../../utils/streakBadges");
const updateLevelAndUserXP = require('../../../utils/updateLevel');
const jwt = require("jsonwebtoken");
const JWT_SECRET = config.get("jwtSecret");
const { Sequelize, Op } = require('sequelize');
const userAuthMiddleware = require("../../../middleware/userAuthMiddleware");
const multer = require("multer");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");


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

// User Signup
router.post('/user_signup', async (req, res) => {
  const { name, email, password, employerCode } = req.body;
  const transaction = await sequelize.transaction();

  try {
    if (!email || !password || !name || !employerCode) {
      return res.status(401).send(HelperUtils.errorObj("Name, email, employer code and password are required"));
    }
    //Check if employerCode exists
    const employer = await Users.findOne({ where: { employerCode: employerCode }, transaction });
    if (!employer) {
      return res.status(401).send(HelperUtils.errorObj("Invalid employer code"));
    }

    const existingUser = await Users.findOne({ where: { email }, transaction });
    if (existingUser) {
      return res.status(401).send(HelperUtils.errorObj("This email already exists"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await Users.create({ name, email, password: hashedPassword, userCode: employerCode }, { transaction });

    let userRole = await Roles.findOne({ where: { name: "User" }, transaction });
    if (!userRole) {
      userRole = await Roles.create({ name: "User", description: "Default app user" }, { transaction });
    }

    await sequelize.models.UserRoles.create({
      userId: user.id,
      roleId: userRole.id
    }, { transaction });

    // Award registration XP
    const xpThreshold = await XpThreshold.findOne({
      where: {
        game_type: 'new_registration',
        is_active: true
      },
      transaction
    });

    if (xpThreshold) {
      // Base XP from threshold configuration
      let baseXP = xpThreshold.min_xp_required;

      // Check for active bonus season and apply multiplier
      const activeBonusSeason = await BonusSeason.getActiveSeason();
      let finalXP = baseXP;
      let bonusMultiplier = 1;

      if (activeBonusSeason) {
        bonusMultiplier = parseFloat(activeBonusSeason.bonus_multiplier) || 1;
        finalXP = Math.floor(baseXP * bonusMultiplier);
      }

      // Log XP gain
      const currentDate = new Date();
      const dateOnly = currentDate.toISOString().split('T')[0];

      let logDescription = `New Registration: Welcome bonus ${finalXP} XP`;
      if (activeBonusSeason) {
        logDescription += ` (${bonusMultiplier}x ${activeBonusSeason.name} bonus)`;
      }

      await UserXpLog.create({
        userId: user.id,
        season_id: activeBonusSeason?.id || null,
        source: 'game',
        type: 'new_registration',
        xp: finalXP,
        date: dateOnly,
        description: logDescription
      }, { transaction });

      // Create initial user level
      const newLevel = xpBadgeSystem.calculateLevel(finalXP);

      await UserLevel.create({
        userId: user.id,
        season_id: null,
        totalXp: finalXP,
        level: newLevel,
        xpForNext: xpBadgeSystem.getXpForNextLevel(newLevel),
        progress: 0,
        lastUpdatedAt: currentDate
      }, { transaction });

      // Update users table
      await user.update({
        totalUserXp: finalXP,
        curr_levels: newLevel
      }, { transaction });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1d"
    });

    await Session.upsert({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }, { transaction });

    await transaction.commit();

    const userData = user.toJSON();
    delete userData.password;

    res.status(200).send(HelperUtils.successObj("Signup successful", { ...userData, token }));
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error in user_signup api:", error);
    return res.status(500).send(HelperUtils.errorObj("Something went wrong."));
  }
});

router.post('/user_login', async (req, res) => {
  const { email, password } = req.body;
  const transaction = await sequelize.transaction();

  try {
    if (!email || !password) {
      return res.status(401).send(HelperUtils.errorObj("Email and password are required"));
    }

    const user = await Users.findOne({ where: { email }, transaction });
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
    }, { transaction });

    // Award login XP only for first login of the week in current month
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    // Calculate week start (Sunday) using UTC to avoid timezone issues
    const currentWeekStart = new Date(currentDate);
    currentWeekStart.setUTCDate(currentDate.getUTCDate() - currentDate.getUTCDay()); // Set to Sunday using UTC
    currentWeekStart.setUTCHours(0, 0, 0, 0);
    const weekStartDateStr = currentWeekStart.toISOString().split('T')[0];

    // Check if user has already received login XP for this week in current month
    const existingWeeklyLoginXp = await UserXpLog.findOne({
      where: {
        userId: user.id,
        type: 'app_login',
        date: {
          [Op.gte]: weekStartDateStr
        },
        [Op.and]: [
          sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), currentYear),
          sequelize.where(sequelize.fn('MONTH', sequelize.col('date')), currentMonth)
        ]
      },
      transaction
    });

    if (!existingWeeklyLoginXp) {
      // Award login XP for first time this week in current month
      const xpThreshold = await XpThreshold.findOne({
        where: {
          game_type: 'app_login',
          is_active: true
        },
        transaction
      });

      if (xpThreshold) {
        // Base XP from threshold configuration  
        let baseXP = xpThreshold.min_xp_required;

        // Check for active bonus season and apply multiplier
        const activeBonusSeason = await BonusSeason.getActiveSeason();
        let finalXP = baseXP;
        let bonusMultiplier = 1;

        if (activeBonusSeason) {
          bonusMultiplier = parseFloat(activeBonusSeason.bonus_multiplier) || 1;
          finalXP = Math.floor(baseXP * bonusMultiplier);
        }

        // Log XP gain
        const dateOnly = currentDate.toISOString().split('T')[0];

        let logDescription = `App Login: First login of week - Earned ${finalXP} XP`;
        if (activeBonusSeason) {
          logDescription += ` (${bonusMultiplier}x ${activeBonusSeason.name} bonus)`;
        }

        await UserXpLog.create({
          userId: user.id,
          season_id: activeBonusSeason?.id || null,
          source: 'game',
          type: 'app_login',
          xp: finalXP,
          date: dateOnly,
          description: logDescription
        }, { transaction });

        // Update user level and badges
        let userLevel = await UserLevel.findOne({
          where: { userId: user.id },
          transaction
        });

        if (!userLevel) {
          // Create initial user level
          const newLevel = xpBadgeSystem.calculateLevel(finalXP);
          userLevel = await UserLevel.create({
            userId: user.id,
            season_id: null,
            totalXp: finalXP,
            level: newLevel,
            xpForNext: xpBadgeSystem.getXpForNextLevel(newLevel),
            progress: 0,
            lastUpdatedAt: currentDate
          }, { transaction });

          // Update users table
          await user.update({
            totalUserXp: finalXP,
            curr_levels: newLevel
          }, { transaction });
        } else {
          // Update existing level
          const newTotalXp = userLevel.totalXp + finalXP;
          const newLevel = xpBadgeSystem.calculateLevel(newTotalXp);
          const xpForNext = xpBadgeSystem.getXpForNextLevel(newLevel);
          const currentLevelXp = newLevel > 1 ? xpBadgeSystem.getXpForNextLevel(newLevel - 1) : 0;
          const progress = newTotalXp >= xpForNext ? 100 : ((newTotalXp - currentLevelXp) / (xpForNext - currentLevelXp)) * 100;

          await userLevel.update({
            totalXp: newTotalXp,
            level: newLevel,
            xpForNext: xpForNext,
            progress: Math.min(progress, 100),
            lastUpdatedAt: currentDate
          }, { transaction });

          // Update users table
          await user.update({
            totalUserXp: newTotalXp,
            curr_levels: newLevel
          }, { transaction });
        }
      }
    }

    await transaction.commit();

    const userData = user.toJSON();
    delete userData.password;

    res.status(200).send(HelperUtils.successObj("Login successful", { ...userData, token }));

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error in user_login api:", error);
    return res.status(500).send(HelperUtils.errorObj("Something went wrong."));
  }
});

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

    // Priority 1: Get XP and level data from users table (as per memory specification)
    let totalUserXp = userDetails.totalUserXp || 0;
    let currentLevel = userDetails.curr_levels || 1;
    let currentStreak = 0;

    console.log(`/me API - User ${userDetails.userCode}: Initial data from users table - XP: ${totalUserXp}, Level: ${currentLevel}`);

    // Priority 2: Get streak from EmployeeXpResults (attendance-specific data)
    const empXpResult = await EmployeeXpResults.findOne({
      where: { emp_code: userDetails.userCode, email: userDetails.email },
      order: [['week_start_date', 'DESC']]
    });

    if (empXpResult) {
      currentStreak = empXpResult.current_streak || 0;
      console.log(`/me API - User ${userDetails.userCode}: Found EmployeeXpResults - Streak: ${currentStreak}, XP: ${empXpResult.total_xp || 0}`);
      // Only use EmployeeXpResults data as fallback if users table has no data
      if (totalUserXp === 0 && currentLevel === 1) {
        totalUserXp = empXpResult.total_xp || 0;
        currentLevel = empXpResult.current_level || 1;
        console.log(`/me API - User ${userDetails.userCode}: Using EmployeeXpResults as fallback - XP: ${totalUserXp}, Level: ${currentLevel}`);
      }
    } else {
      console.log(`/me API - User ${userDetails.userCode}: No EmployeeXpResults found`);
    }

    // Priority 3: Fallback to UserLevel table if both users table and EmployeeXpResults have no data
    if (totalUserXp === 0 && currentLevel === 1) {
      const userLevel = await UserLevel.findOne({
        where: { userId: user_id }
      });
      if (userLevel) {
        totalUserXp = userLevel.totalXp || 0;
        currentLevel = userLevel.level || 1;
        console.log(`/me API - User ${userDetails.userCode}: Using UserLevel as fallback - XP: ${totalUserXp}, Level: ${currentLevel}`);
      }
    }

    console.log(`/me API - User ${userDetails.userCode}: Final data - XP: ${totalUserXp}, Level: ${currentLevel}, Streak: ${currentStreak}`);

    // Calculate dynamic level based on XP if needed
    const calculatedLevel = xpBadgeSystem.calculateLevel(totalUserXp);
    currentLevel = Math.max(currentLevel, calculatedLevel);

    // Get badge information
    const badgeProgress = xpBadgeSystem.getBadgeProgress(totalUserXp);
    const earnedBadges = xpBadgeSystem.getEarnedBadges(totalUserXp);

    // Streak badges system - only for users with actual streaks
    const currentStreakBadge = getStreakBadge(currentStreak);

    // Get unlocked seasons
    const unlockedSeasons = xpBadgeSystem.getUnlockedSeasons(totalUserXp, currentLevel);

    // Get season information
    const season = await BonusSeason.getActiveSeason();
    const GetAllSeasonsData = await BonusSeason.findAll();

    userData.seasondata = GetAllSeasonsData.map(entry => {
      let seasonStatus = "";
      const seasonName = entry?.name; // Use 'name' from BonusSeason
      const seasonStartDate = entry?.start_date;
      const seasonEndDate = entry?.end_date;
      const seasonStatusValue = entry?.is_active; // Use 'is_active' from BonusSeason

      if (seasonStatusValue) {
        seasonStatus = "started";
      } else {
        seasonStatus = "Not Started";
      }

      return {
        seasonId: entry.id,
        seasonName,
        seasonStartDate,
        seasonEndDate,
        seasonStatus,
        isUnlocked: unlockedSeasons.includes(entry.id)
      };
    });

    // Add comprehensive XP and badge information
    userData.userStats = {
      totalUserXp,
      currentLevel,
      currentBadge: badgeProgress.currentBadge,
      nextBadge: badgeProgress.nextBadge,
      badgeProgress: badgeProgress.progress,
      xpToNextBadge: badgeProgress.xpToNext,
      isMaxBadgeLevel: badgeProgress.isMaxLevel,
      earnedBadges: earnedBadges.length,
      totalBadges: xpBadgeSystem.getAllBadges().length,
      unlockedSeasons: unlockedSeasons.length,
      totalSeasons: GetAllSeasonsData.length,
      // Streak information
      currentStreak: currentStreak,
      currentStreakBadge: currentStreakBadge
    };

    // Keep existing badges structure for backward compatibility
    userData.badges = badgeProgress.currentBadge;
    userData.currentStreakBadge = currentStreakBadge;
    // nextStreakBadge: nextStreakBadge.id !== currentStreakBadge.id ? nextStreakBadge : null,
    // streakProgress: currentStreak >= currentStreakBadge.streakRequired ?
    //   100 : Math.round((currentStreak / currentStreakBadge.streakRequired) * 100)

    // userData.badges = earnedBadges.map((badge, index) => ({
    //   id: badge.id,
    //   level: badge.id,
    //   name: badge.name,
    //   title: badge.name,
    //   description: badge.description,
    //   xpRequired: badge.xpRequired,
    //   iconUrl: badge.iconUrl,
    //   status: "complete",
    //   earnedAt: new Date(), // You might want to track this in the database
    //   progress: 100
    // }));

    // Add current progress badge if not at max level
    // if (!badgeProgress.isMaxLevel && badgeProgress.nextBadge) {
    //   userData.badges.push({
    //     id: badgeProgress.nextBadge.id,
    //     level: badgeProgress.nextBadge.id,
    //     name: badgeProgress.nextBadge.name,
    //     title: badgeProgress.nextBadge.name,
    //     description: badgeProgress.nextBadge.description,
    //     xpRequired: badgeProgress.nextBadge.xpRequired,
    //     iconUrl: badgeProgress.nextBadge.iconUrl,
    //     status: "in_progress",
    //     progress: badgeProgress.progress
    //   });
    // }

    res.status(200).send(HelperUtils.successObj("User profile fetched", userData));
  } catch (error) {
    console.error("Error in user /me api:", error);
    return res.status(500).send(HelperUtils.errorObj("Something went wrong."));
  }
});

// Spin Wheel API - Save wheel rewards/XP
router.post('/spin-wheel', userAuthMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const user = req.user;
    const userId = user.userId;
    const { wheelId, sectionId, rewardType, rewardValue, wheelType } = req.body;

    // Validation
    if (!wheelId || !sectionId || !rewardType || rewardValue === undefined) {
      return res.status(400).send(
        HelperUtils.errorObj("wheelId, sectionId, rewardType, and rewardValue are required")
      );
    }

    if (!['xp', 'reward'].includes(rewardType)) {
      return res.status(400).send(
        HelperUtils.errorObj("rewardType must be 'xp' or 'reward'")
      );
    }

    // Get user details
    const userDetails = await Users.findByPk(userId);
    if (!userDetails) {
      return res.status(404).send(HelperUtils.errorObj("User not found"));
    }

    const empCode = userDetails.userCode;
    const currentDate = new Date();
    const dateOnly = currentDate.toISOString().split('T')[0];

    // Check daily spin limit (optional - you can configure this)
    const todaySpins = await UserXpLog.count({
      where: {
        userId: userId,
        source: 'game',
        type: `wheel_spin_${wheelType || 'unknown'}`,
        date: dateOnly
      }
    });

    // Allow up to 3 spins per day (configurable)
    const MAX_DAILY_SPINS = 3;
    // if (todaySpins >= MAX_DAILY_SPINS) {
    //   return res.status(429).send(
    //     HelperUtils.errorObj(`Daily spin limit reached. Maximum ${MAX_DAILY_SPINS} spins per day.`)
    //   );
    // }

    let xpGained = 0;
    let description = '';

    if (rewardType === 'xp') {
      xpGained = parseInt(rewardValue);
      description = `Wheel Spin: Earned ${xpGained} XP`;
    } else {
      // For non-XP rewards, give a small XP bonus for playing
      xpGained = 50; // Base XP for participating
      description = `Wheel Spin: Won "${rewardValue}" + ${xpGained} participation XP`;
    }

    // Apply bonus season multiplier if active
    const activeBonusSeason = await BonusSeason.findOne({
      where: {
        start_date: { [Op.lte]: currentDate },
        end_date: { [Op.gte]: currentDate }
      },
      order: [['created_at', 'DESC']]
    });

    let finalXpGained = xpGained;
    let bonusMultiplier = 1;

    if (activeBonusSeason) {
      bonusMultiplier = activeBonusSeason.multiplier || 1;
      finalXpGained = Math.floor(xpGained * bonusMultiplier);
      description += ` (${bonusMultiplier}x ${activeBonusSeason.name} bonus)`;
    }

    // Log the XP gain
    await UserXpLog.create({
      userId: userId,
      season_id: null, // Global game XP
      source: 'game',
      type: `wheel_spin_${wheelType || 'mini'}`,
      xp: finalXpGained,
      date: dateOnly,
      description: description
    }, { transaction });

    // Update or create user level record
    let userLevel = await UserLevel.findOne({
      where: { userId: userId }
    });

    if (!userLevel) {
      userLevel = await UserLevel.create({
        userId: userId,
        season_id: null, // Global level not tied to specific season
        totalXp: finalXpGained,
        level: 1,
        xpForNext: xpBadgeSystem.getXpForNextLevel(1),
        progress: 0
      }, { transaction });

      // Update the main users table with new XP and level for new user
      await userDetails.update({
        totalUserXp: finalXpGained,
        curr_levels: 1
      }, { transaction });
    } else {
      const newTotalXp = userLevel.totalXp + finalXpGained;
      const newLevel = xpBadgeSystem.calculateLevel(newTotalXp);
      const xpForNext = xpBadgeSystem.getXpForNextLevel(newLevel);
      const currentLevelXp = xpBadgeSystem.getXpForNextLevel(newLevel - 1);
      const progress = newTotalXp >= xpForNext ? 100 : ((newTotalXp - currentLevelXp) / (xpForNext - currentLevelXp)) * 100;

      await userLevel.update({
        totalXp: newTotalXp,
        level: newLevel,
        xpForNext: xpForNext,
        progress: Math.min(progress, 100),
        lastUpdatedAt: currentDate
      }, { transaction });

      // Update the main users table with new XP and level
      await userDetails.update({
        totalUserXp: newTotalXp,
        curr_levels: newLevel
      }, { transaction });
    }

    // Update EmployeeXpResults for attendance system integration
    // Calculate week start (Sunday) using UTC to avoid timezone issues
    const weekStartDate = new Date(currentDate);
    weekStartDate.setUTCDate(currentDate.getUTCDate() - currentDate.getUTCDay()); // Get Sunday of current week using UTC
    weekStartDate.setUTCHours(0, 0, 0, 0);

    let empXpResult = await EmployeeXpResults.findOne({
      where: {
        emp_code: empCode,
        week_start_date: weekStartDate.toISOString().split('T')[0]
      }
    });

    if (!empXpResult) {
      // Create new record for this week
      empXpResult = await EmployeeXpResults.create({
        emp_code: empCode,
        week_start_date: weekStartDate.toISOString().split('T')[0],
        base_xp: 0,
        bonus_xp: finalXpGained,
        penalty_xp: 0,
        total_xp: finalXpGained,
        current_level: userLevel.level,
        current_streak: 0,
        max_streak: 0,
        total_days_present: 0,
        total_hours: 0,
        perfect_week: false,
        week_xp_multiplier: bonusMultiplier,
        created_at: currentDate,
        updated_at: currentDate
      }, { transaction });
    } else {
      // Update existing record
      await empXpResult.update({
        bonus_xp: (empXpResult.bonus_xp || 0) + finalXpGained,
        total_xp: (empXpResult.total_xp || 0) + finalXpGained,
        current_level: userLevel.level,
        week_xp_multiplier: Math.max(empXpResult.week_xp_multiplier || 1, bonusMultiplier),
        updated_at: currentDate
      }, { transaction });
    }

    await transaction.commit();

    // Get updated badge progress
    const badgeProgress = xpBadgeSystem.getBadgeProgress(userLevel.totalXp);
    const leveledUp = userLevel.level > (userLevel.level - Math.floor(finalXpGained / 1000));

    // Prepare response
    const response = {
      success: true,
      reward: {
        type: rewardType,
        value: rewardValue,
        xpGained: finalXpGained,
        originalXp: xpGained,
        bonusMultiplier: bonusMultiplier,
        bonusSeasonActive: !!activeBonusSeason
      },
      userStats: {
        totalXp: userLevel.totalXp,
        level: userLevel.level,
        leveledUp: leveledUp,
        currentBadge: badgeProgress.currentBadge,
        badgeProgress: badgeProgress.progress,
        xpToNextBadge: badgeProgress.xpToNext
      },
      dailySpinsUsed: todaySpins + 1,
      dailySpinsRemaining: MAX_DAILY_SPINS - (todaySpins + 1)
    };

    res.status(200).send(
      HelperUtils.successObj("Wheel spin processed successfully", response)
    );

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error in spin-wheel API:", error);
    return res.status(500).send(
      HelperUtils.errorObj("Failed to process wheel spin")
    );
  }
});

// Get XP Badges API
router.get('/xp-badges', userAuthMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const userId = user.userId;

    // Get user's total XP
    let totalUserXp = 0;

    const empXpResult = await EmployeeXpResults.findOne({
      where: { emp_code: (await Users.findByPk(userId)).userCode },
      order: [['week_start_date', 'DESC']]
    });

    if (empXpResult) {
      totalUserXp = empXpResult.total_xp || 0;
    } else {
      const userLevel = await UserLevel.findOne({
        where: { userId: userId }
      });
      if (userLevel) {
        totalUserXp = userLevel.totalXp || 0;
      }
    }

    // Get all badge information
    const allBadges = xpBadgeSystem.getAllBadges();
    const earnedBadges = xpBadgeSystem.getEarnedBadges(totalUserXp);
    const badgeProgress = xpBadgeSystem.getBadgeProgress(totalUserXp);

    const response = {
      totalXp: totalUserXp,
      currentLevel: xpBadgeSystem.calculateLevel(totalUserXp),
      allBadges: allBadges,
      earnedBadges: earnedBadges,
      currentBadge: badgeProgress.currentBadge,
      nextBadge: badgeProgress.nextBadge,
      badgeProgress: badgeProgress.progress,
      xpToNextBadge: badgeProgress.xpToNext,
      isMaxLevel: badgeProgress.isMaxLevel
    };

    res.status(200).send(
      HelperUtils.successObj("XP badges retrieved successfully", response)
    );
  } catch (error) {
    console.error("Error in xp-badges API:", error);
    return res.status(500).send(
      HelperUtils.errorObj("Failed to retrieve XP badges")
    );
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

router.post('/forgot_password', async (req, res) => {

  const { email } = req.body;
  console.log(email)
  if (!email) {
    return res.status(400).send(HelperUtils.errorObj("Email is required"));
  }
  console.log(email)

  try {
    const user = await Users.findOne({ where: { email } });

    console.log("user find", user);
    if (!user) {
      return res.status(401).send(HelperUtils.errorObj("data not found"));
    }

    const resetToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
    const resetLink = `https://workwin.24livehost.com/reset-password?token=${resetToken}`;

    // Send response immediately
    res.status(200).send(HelperUtils.successObj("Password reset instruction sent to your mail id."));

    // Send email asynchronously (fire and forget)
    const transporter = nodemailer.createTransport({
      host: config.get("MAIL_HOST"),
      port: config.get("MAIL_PORT"),
      secure: config.get("MAIL_PROTOCAL"),
      auth: {
        user: config.get("MAIL_USERNAME"),
        pass: config.get("MAIL_PASSWORD")
      }
    });

    transporter.sendMail({
      from: `WorkWin Support <${config.get("MAIL_FORM")}>`,
      to: email,
      subject: "Password Reset Link",
      html: `<p>Click the link below to reset your password:</p><a href="${resetLink}">${resetLink}</a>`
    }).catch(error => {
      console.error("Error sending email:", error);
    });

  } catch (error) {
    console.error("Error in user Forget password api:", error);
    return res.status(500).send(HelperUtils.errorObj("Something went wrong."));
  }
});


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

    // Extract game index from gameType (assuming format like 'game_0', 'game_1', etc.)
    const gameMatch = gameType.match(/game[_]?(\d+)/);
    const gameIndex = gameMatch ? parseInt(gameMatch[1]) : null;

    // if (gameIndex === null) {
    //   return res.status(400).send(HelperUtils.errorObj("Invalid gameType format"));
    // }

    // Verify user has unlocked this mini game
    // Get user's current unlock status (simplified version of season dashboard logic)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentWeekNumber = Math.ceil(currentDate.getDate() / 7);

    // Get user's current streak to check spin wheel access
    const userAttendance = await EmployeeXpResults.findOne({
      where: {
        emp_code: req.user.userCode || 'unknown'
      },
      order: [['week_start_date', 'DESC']],
      attributes: ['current_streak']
    });

    const currentStreak = userAttendance?.current_streak || 0;
    const hasSpinWheelAccess = currentStreak > 0 && currentStreak % 7 === 0;

    // Define unlock logic based on memory specifications
    const allMiniGames = [0, 1, 2, 3, 4];
    const weekBasedUnlocked = allMiniGames.slice(0, currentWeekNumber);
    const finalUnlockedGames = hasSpinWheelAccess ? allMiniGames : weekBasedUnlocked;

    // Check if the requested game is unlocked
    if (!finalUnlockedGames.includes(gameIndex)) {
      // return res.status(403).send(HelperUtils.errorObj(
      //   `Game ${gameIndex} is not unlocked. Available games: [${finalUnlockedGames.join(', ')}]. ` +
      //   `Unlock more games by reaching week ${gameIndex + 1} or achieving a streak multiple of 7.`
      // ));
    }

    const today = new Date().toISOString().split('T')[0];
    // get active season name
    const season = await BonusSeason.getActiveSeason();

    // Check daily play limit for this specific game
    const todayPlays = await UserXpLog.count({
      where: {
        userId,
        source: 'game',
        // season_id: season?.id,
        type: gameType,
        date: today
      }
    });

    // Check if daily limit is reached BEFORE creating log entry
    const MAX_DAILY_PLAYS = 3;
    if (todayPlays >= MAX_DAILY_PLAYS) {
      return res.status(403).send(HelperUtils.errorObj(`Daily limit of ${MAX_DAILY_PLAYS} plays reached for ${gameType}.`));
    }

    //  Check XP cap of 50
    const todayXpTotal = await UserXpLog.sum('xp', {
      where: {
        userId,
        // season_id: season?.id,
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
        // season_id: season?.id
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
      playsRemaining: MAX_DAILY_PLAYS - todayPlays - 1
    }));

  } catch (err) {
    console.error("Mini-game XP error:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to claim XP"));
  }
});

// GET /user/leaderboard
router.get('/leaderboard', userAuthMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    // Get current user's employer code
    const currentUser = await Users.findOne({
      where: { id: userId },
      attributes: ['userCode', 'name', 'totalUserXp'],
    });

    if (!currentUser || !currentUser.userCode) {
      return res.status(400).send(
        HelperUtils.errorObj("User employer code not found")
      );
    }

    const employerCode = currentUser.userCode;

    // Fetch ALL users with the same employer code, having 'User' role, ordered by XP
    const leaderboardUsers = await Users.findAll({
      where: {
        userCode: employerCode
      },
      attributes: [
        'id',
        'name',
        'email',
        'userCode',
        'curr_levels',
        'totalUserXp',
        'createdAt'
      ],
      order: [
        ['totalUserXp', 'DESC'],
        ['createdAt', 'ASC']
      ]
    });

    console.log({ leaderboardUsers })

    // Add ranking position to each user
    const rankedUsers = leaderboardUsers.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      name: user.name,
      email: user.email,
      userCode: user.userCode,
      curr_levels: user.curr_levels,
      totalUserXp: user.totalUserXp,
      isCurrentUser: user.id === userId, // Flag to identify current user
      joinedDate: user.createdAt
    }));

    res.status(200).send(
      HelperUtils.successObj("Leaderboard fetched successfully", {
        employerCode: employerCode,
        leaderboard: rankedUsers
      })
    );

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

// Get User's Won Rewards
// router.get("/rewards", userAuthMiddleware, async (req, res) => {
//   try {
//     const userId = req.user.userId;

//     // Get user's won rewards (current rewards they have earned)
//     const userRewardWins = await UserXpLog.findAll({
//       where: {
//         userId: userId,
//         source: 'game',
//         reward_type: 'reward',  // Only rewards, not XP
//         type: {
//           [Op.like]: 'wheel_spin_%'
//         }
//       },
//       attributes: [
//         'id',
//         'reward_value',
//         'description',
//         'date',
//       ],
//       order: [['date', 'DESC']]
//     });

//     // Transform user won rewards to match the desired format
//     const currentRewards = userRewardWins.map(reward => {
//       let rewardData = {};
//       return {
//         id: reward.id,
//         name: reward?.reward_value,
//         description: reward.description,
//         filename: rewardData.filename || rewardData.image_url,
//       };
//     });

//     res.status(200).send({
//       flag: true,
//       message: "Rewards fetched successfully",
//       result: {
//         current: currentRewards,
//         upcoming: []
//       }
//     });

//   } catch (error) {
//     console.error("Error fetching user's rewards:", error);
//     res.status(500).send({
//       flag: false,
//       message: "Failed to fetch rewards",
//       result: null
//     });
//   }
// });

router.get("/rewards", userAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's won rewards (current rewards they have earned)
    const userRewardWins = await UserXpLog.findAll({
      where: {
        userId: userId,
        source: 'game',
        reward_type: 'reward',  // Only rewards, not XP
        type: {
          [Op.like]: 'wheel_spin_%'
        }
      },
      attributes: [
        'id',
        'reward_value',
        'description',
        'date',
        "rewardImageUrl"
      ],
      order: [['date', 'DESC']]
    });

    // Get spin wheel configuration to match rewards with images
    const wheelConfig = await SpinTheWheel.findOne({
      where: { is_active: true },
      attributes: ['sections', 'reward_images']
    });

    let rewardImageMap = {};

    if (wheelConfig) {
      const sections = JSON.parse(wheelConfig.sections);
      const rewardImages = wheelConfig.getDataValue('reward_images'); // Get raw value to avoid getter issues

      let parsedImages = [];
      try {
        parsedImages = JSON.parse(rewardImages);
      } catch (error) {
        console.error("Error parsing reward_images:", error);
        parsedImages = [];
      }

      // Create a map of reward values to their corresponding images
      sections.forEach((section, index) => {
        const xpValue = section.xpValue;
        const imagePath = parsedImages[index];

        // Only map non-numeric xpValues (i.e., rewards like "ps5", "Reward 5")
        if (typeof xpValue === 'string' && isNaN(xpValue)) {
          rewardImageMap[xpValue] = imagePath && imagePath.trim() !== ''
            ? `https://workwin.24livehost.com:3025${imagePath}`
            : null;
        }
      });
    }

    console.log("Reward Image Map:", rewardImageMap);

    // Transform user won rewards to match the desired format
    const currentRewards = userRewardWins.map(reward => {
      const rewardValue = reward.reward_value;
      const rewardImageUrl = reward.rewardImageUrl;
      return {
        id: reward.id,
        name: rewardValue,
        description: reward.description || `You won ${rewardValue}!`,
        filename: rewardImageUrl,
        dateWon: reward.date
      };
    });

    res.status(200).send({
      flag: true,
      message: "Rewards fetched successfully",
      result: {
        current: currentRewards,
        upcoming: []
      }
    });

  } catch (error) {
    console.error("Error fetching user's rewards:", error);
    res.status(500).send({
      flag: false,
      message: "Failed to fetch rewards",
      result: null
    });
  }
});


// Get Attendance Data grouped by month
router.get("/attendance", userAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const year = req.query.year || new Date().getFullYear();

    // Get user details including empCode, email, and totalUserXp
    const userDetails = await Users.findOne({
      where: { id: userId },
      attributes: ["userCode", "email", "totalUserXp", "curr_levels"],
    });

    const empCode = userDetails?.userCode;
    const userEmail = userDetails?.email;
    const totalUserXp = userDetails?.totalUserXp || 0;
    const userLevel = userDetails?.curr_levels || 1;

    if (!empCode) {
      return res.status(401).send(HelperUtils.errorObj("Employee code missing from user session"));
    }

    console.log("Fetching attendance for empCode:", empCode, "email:", userEmail, "and year:", year)

    // Create year-based filter for week_start_date
    const startOfYear = new Date(year, 0, 1); // January 1st of the year
    const endOfYear = new Date(year, 11, 31, 23, 59, 59); // December 31st of the year

    // Enhanced user lookup - check by both empCode AND email for unique identification
    const attendanceRecords = await EmployeeXpResults.findAll({
      where: {
        [Op.and]: [
          { emp_code: empCode },
          { email: userEmail }
        ],
        week_start_date: {
          [Op.gte]: startOfYear, // Greater than or equal to start of year
          [Op.lte]: endOfYear    // Less than or equal to end of year
        }
      },
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
        isMondayPresent: Boolean(record.tuesday_present),
        isTuesdayPresent: Boolean(record.tuesday_present),
        isWednesdayPresent: Boolean(record.wednesday_present),
        isThursdayPresent: Boolean(record.thursday_present),
        isFridayPresent: Boolean(record.friday_present),
        isSaturdayPresent: Boolean(record.saturday_present),
        gameUnlocked: isGameUnlocked
      };
      return formattedRecord;
    });

    // Calculate monthly max streak data
    const calculateMonthlyMaxStreak = (records) => {
      const monthlyData = {};

      // Initialize all 12 months for the year
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        monthlyData[monthKey] = {
          month: monthKey,
          monthName: new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' }),
          maxStreak: 0,
          maxStreakStartDate: null,
          maxStreakEndDate: null,
          records: []
        };
      }

      records.forEach(record => {
        const date = new Date(record.week_start_date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        if (monthlyData[monthKey]) {
          monthlyData[monthKey].records.push(record);

          // Update max streak for this month
          if (record.max_streak > monthlyData[monthKey].maxStreak) {
            monthlyData[monthKey].maxStreak = record.max_streak;
            monthlyData[monthKey].maxStreakStartDate = record.week_start_date;
            monthlyData[monthKey].maxStreakEndDate = record.week_end_date;
          }
        }
      });

      // Return array of all months with their data
      return Object.values(monthlyData).map(monthData => ({
        month: monthData.month,
        monthName: monthData.monthName,
        maxStreak: monthData.maxStreak,
        startDate: monthData.maxStreakStartDate,
        endDate: monthData.maxStreakEndDate,
        totalWeeks: monthData.records.length,
        hasData: monthData.records.length > 0
      }));
    };

    const monthlyMaxStreakData = calculateMonthlyMaxStreak(attendanceRecords);

    res.status(200).send(
      HelperUtils.successObj(
        `Attendance data fetched successfully for year ${year}`,
        {
          weeklyData: groupedData,
          months: monthlyMaxStreakData,
          totalXpRecords: {
            totalUserXp: totalUserXp,
            currentLevel: userLevel,
            empCode: empCode,
            email: userEmail
          }
        }
      )
    );

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

    // Determine spin wheel size based on streak
    let spinWheelType = 'small'; // default
    let wheelId = 1; // Small wheel by default

    const bigWheelConfig = await SpinTheWheel.findOne({
      where: {
        is_big: true,
        is_active: true
      },
      order: [['updated_at', 'DESC']]
    });

    if (bigWheelConfig) {
      spinWheelType = 'big';
      wheelId = bigWheelConfig.id;
    } else if (currentStreak >= 7) {
      spinWheelType = 'small';
      wheelId = 1;
    }


    // Get spin wheel configuration based on wheel type
    const wheelConfig = await SpinTheWheel.findOne({
      where: {
        id: wheelId,
        is_active: true
      },
      attributes: ['id', 'number_of_sections', 'sections', 'total_xp_pool', 'reward_images', 'type', 'section_probabilities', 'section_quantities']
    });


    let spinWheelContents = null;
    if (wheelConfig) {
      const storedSections = JSON.parse(wheelConfig.sections);
      const rewardImages = wheelConfig.reward_images || [];
      const wheelType = wheelConfig.type || 'mixed';
      const sectionProbabilities = wheelConfig.section_probabilities || [];
      const sectionQuantities = wheelConfig.section_quantities || [];
      // Ensure rewardImages is an array
      if (typeof rewardImages === 'string') {
        try {
          rewardImages = JSON.parse(rewardImages);
        } catch (error) {
          console.error("Error parsing reward_images string:", error);
          rewardImages = [];
        }
      }

      // If it's still not an array, make it an empty array
      if (!Array.isArray(rewardImages)) {
        console.warn("reward_images is not an array, converting to empty array");
        rewardImages = [];
      }

      const processImagePath = (imagePath) => {
        if (!imagePath || imagePath.trim() === '') {
          return null;
        }
        console.log("Processing image path:", imagePath);
        return imagePath.startsWith('http')
          ? imagePath
          : `https://localhost:3008${imagePath}`;
      };


      // Transform xpValues array into individual objects with additional properties
      const wheelSections = storedSections.map((section, index) => {
        // Determine if this section is XP or Reward based on xpValue type
        const isRewardSection = typeof section.xpValue === 'string';
        const sectionImagePath = rewardImages[index] || null;

        return {
          id: index + 1,
          sectionNumber: section.sectionNumber || index + 1,
          xpValue: section.xpValue,
          image: processImagePath(sectionImagePath),
          probability: sectionQuantities[index] > 0 ? sectionProbabilities[index] : 0,
          quantity: sectionQuantities[index],
          isActive: true,
        };
      });

      spinWheelContents = {
        wheelId: wheelConfig.id,
        wheelType: wheelConfig.wheel_type || spinWheelType,
        sections: wheelConfig.number_of_sections,
        totalXP: wheelConfig.total_xp_pool,
        wheelSections: wheelSections, // New enhanced structure
        // Keep legacy xpValues for backward compatibility
        // xpValues: storedSections.map(section => section.xpValue)
      };
    }

    // Define available mini games based on streak/level
    const allMiniGames = [0, 1, 2, 3, 4];
    const unlockedMiniGames = allMiniGames.slice(0, currentWeekNumber);

    // Unlock seasons based on current month (0-based)
    const allSeasonsArray = Array.from({ length: 12 }, (_, i) => i);
    const seasonUnlocked = allSeasonsArray.slice(0, currentMonth);

    // // Calculate season bonus XP multiplier based on week within month
    // let bonusSeasonDisplay = 1; // Default multiplier
    // if (currentWeekNumber === 1) {
    //   bonusSeasonDisplay = 3; // First week of month bonus
    // } else if (currentWeekNumber === 2) {
    //   bonusSeasonDisplay = 2; // Second week bonus
    // } else if (currentWeekNumber >= totalWeeksInSeason - 1) {
    //   bonusSeasonDisplay = 4; // Last week of month rush bonus
    // }

    // Get month name for season display
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentSeasonName = `${monthNames[currentMonth - 1]} ${currentYear}`;

    // Check for active bonus season
    let bonusSeasonInfo = {
      bonusSeason: 0, // Default: no bonus season active
      name: null,
      startDate: null,
      endDate: null,
      multiplier: null,
      durationMonths: null
    };

    const activeBonusSeason = await BonusSeason.findOne({
      where: {
        start_date: {
          [Op.lte]: currentDate
        },
        end_date: {
          [Op.gte]: currentDate
        }
      },
      order: [['created_at', 'DESC']]
    });

    if (activeBonusSeason) {
      bonusSeasonInfo = {
        bonusSeason: 1,
        name: activeBonusSeason.name,
        startDate: activeBonusSeason.start_date,
        endDate: activeBonusSeason.end_date,
        multiplier: activeBonusSeason.multiplier,
        durationMonths: activeBonusSeason.duration_months
      };
    }

    // Prepare response
    const seasonDashboard = {
      // Core season info
      noOfWeeksInCurrentSeason: totalWeeksInSeason,
      currentSeason: currentSeason, // 1-12 (month number)
      currentWeek: currentWeekNumber, // 1-5 (week within month)

      // Enhanced spin wheel info
      spinTheWheelType: spinWheelType, // 'small', 'medium', 'big'
      spinTheWheelContents: spinWheelContents,

      // Games and bonuses
      miniGamesUnlocked: unlockedMiniGames,
      // miniGamesUnlocked: allMiniGames,
      seasonUnlocked,

      // Bonus season information
      isBonusSeasonActive: !!activeBonusSeason,
      bonusSeason: {
        ...bonusSeasonInfo,

      },

      // Additional user context
      seasonStats: {
        currentStreak: currentStreak,
        totalXP: totalXP,
        gameUnlocked: gameUnlocked,
        weekProgress: `${currentWeekNumber}/${totalWeeksInSeason}`,
        seasonProgress: Math.round((currentWeekNumber / totalWeeksInSeason) * 100),
        monthProgress: Math.round((currentDay / seasonEndDate.getDate()) * 100)
      },

      // Season metadata
      seasonInfo: {
        name: currentSeasonName,
        seasonNumber: currentSeason,
        monthName: monthNames[currentMonth - 1],
        startDate: seasonStartDate.toISOString().split('T')[0],
        endDate: seasonEndDate.toISOString().split('T')[0],
        daysInSeason: seasonEndDate.getDate(),
        currentDay: currentDay,
        isActive: true
      }
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

// Helper function to calculate section probability
const calculateSectionProbability = (totalSections, sectionIndex) => {
  // Equal probability for all sections by default
  const baseProbability = 1 / totalSections;

  // You can customize probability based on section index or value
  // For example, higher XP sections might have lower probability
  let probabilityMultiplier = 1;

  // Example: Reduce probability for high-value sections
  if (sectionIndex >= totalSections * 0.75) { // Last 25% of sections
    probabilityMultiplier = 0.5; // 50% less likely
  } else if (sectionIndex >= totalSections * 0.5) { // Middle 25% of sections
    probabilityMultiplier = 0.8; // 20% less likely
  }

  return parseFloat((baseProbability * probabilityMultiplier).toFixed(6));
};

// Helper function to get section color for UI
// const getSectionColor = (index) => {
//   const colors = [
//     '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
//     '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
//     '#F8C471', '#82E0AA'
//   ];

//   return colors[index % colors.length];
// };

// Spin Wheel XP Award API
router.post('/spin-wheel/award-xp', userAuthMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.userId;
    const { rewardValue, wheelType, sectionId, rewardType, rewardImageUrl } = req.body;

    let wheelId = 0;
    if (wheelType === "pixie_wheel") {
      wheelId = 1;
    } else {
      wheelId = 2
    }

    // Validation for reward type
    if (!rewardType || !['xp', 'reward'].includes(rewardType)) {
      return res.status(400).send(
        HelperUtils.errorObj("rewardType must be either 'xp' or 'reward'")
      );
    }

    if (!wheelType || typeof wheelType !== 'string' || wheelType.trim() === '') {
      return res.status(400).send(
        HelperUtils.errorObj("wheelType must be a non-empty string")
      );
    }

    if (!rewardValue || typeof rewardValue !== 'string' || rewardValue.trim() === '') {
      return res.status(400).send(
        HelperUtils.errorObj("rewardValue must be a non-empty string")
      );
    }

    // Get user details
    const user = await Users.findByPk(userId, { transaction });
    if (!user) {
      return res.status(404).send(HelperUtils.errorObj("User not found"));
    }

    // Check daily spin limit for this wheel type
    const currentDate = new Date();
    const dateOnly = currentDate.toISOString().split('T')[0];

    const todaySpins = await UserXpLog.count({
      where: {
        userId: userId,
        source: 'game',
        type: `wheel_spin_${wheelType}`,
        date: dateOnly
      },
      transaction
    });

    // const MAX_DAILY_SPINS = 3;
    // if (todaySpins >= MAX_DAILY_SPINS) {
    //   return res.status(429).send(
    //     HelperUtils.errorObj(`Daily spin limit reached. Maximum ${MAX_DAILY_SPINS} spins per day.`)
    //   );
    // }

    let finalXP = 0;
    let bonusMultiplier = 1;
    let seasonInfo = null;
    let rewardInfo = null;

    // Check for active bonus season
    const activeBonusSeason = await BonusSeason.getActiveSeason();
    if (activeBonusSeason) {
      bonusMultiplier = parseFloat(activeBonusSeason.bonus_multiplier) || 1;
      seasonInfo = {
        seasonName: activeBonusSeason.name,
        seasonType: activeBonusSeason.season_type,
        multiplier: bonusMultiplier
      };
    }

    // Handle different reward types
    if (rewardType === 'xp') {
      // For XP rewards, validate that rewardValue can be converted to positive integer
      const xpValue = parseInt(rewardValue, 10);

      if (isNaN(xpValue) || xpValue <= 0 || !Number.isInteger(xpValue)) {
        return res.status(400).send(
          HelperUtils.errorObj("rewardValue must be a valid positive integer for XP rewards (e.g., '500')")
        );
      }

      // Apply bonus season multiplier to XP
      finalXP = activeBonusSeason ? Math.floor(xpValue * bonusMultiplier) : xpValue;
    } else if (rewardType === 'reward') {
      // For non-XP rewards (items like 'PS5', 'Gold Coin', etc.)
      // No conversion needed, just use the string as is
      finalXP = 0;

      rewardInfo = {
        type: 'reward',
        value: rewardValue,
        xpAwarded: 0
      };
    }


    let logDescription;
    if (rewardType === 'xp') {
      logDescription = `Spin Wheel ${wheelType}: Won ${finalXP} XP`;
      if (activeBonusSeason) {
        logDescription += ` (${bonusMultiplier}x ${activeBonusSeason.name} bonus)`;
      }
    } else {
      // For reward type, log the reward win for admin tracking
      logDescription = `Spin Wheel ${wheelType}: Won "${rewardValue}"`;
      if (activeBonusSeason) {
        logDescription += ` (during ${activeBonusSeason.name})`;
      }
    }

    // If this is a reward or XP win, decrease quantity in wheel configuration
    let remainingQuantity = null;
    if (rewardType === 'reward' || rewardType === 'xp') {
      try {
        const wheelConfig = await SpinTheWheel.findOne({
          where: { id: wheelId, is_active: true },
          transaction
        });

        if (wheelConfig) {
          // Parse sections to find the index by value
          let sectionsArray = [];
          try {
            sectionsArray = JSON.parse(wheelConfig.sections || '[]');
          } catch (_) {
            sectionsArray = [];
          }

          let matchedIndex = -1;
          if (rewardType === 'reward') {
            const normalizedTarget = String(rewardValue).trim().toLowerCase();
            matchedIndex = sectionsArray.findIndex((s) => {
              const val = s && s.value !== undefined ? s.value : s?.xpValue; // backward compatibility
              return typeof val === 'string' && String(val).trim().toLowerCase() === normalizedTarget;
            });
          } else {
            // XP: match numeric value or fallback to sectionId if provided
            const xpNumeric = parseInt(rewardValue, 10);
            matchedIndex = sectionsArray.findIndex((s) => {
              const val = s && s.value !== undefined ? s.value : s?.xpValue; // backward compatibility
              return typeof val === 'number' && val === xpNumeric;
            });
            if (matchedIndex === -1 && sectionId) {
              const idxFromSection = parseInt(sectionId, 10) - 1;
              if (!isNaN(idxFromSection)) matchedIndex = idxFromSection;
            }
          }

          const quantities = Array.isArray(wheelConfig.section_quantities) ? wheelConfig.section_quantities : [];

          if (matchedIndex >= 0 && matchedIndex < quantities.length) {
            const currentQty = parseInt(quantities[matchedIndex]) || 0;
            if (currentQty > 0) {
              quantities[matchedIndex] = currentQty - 1;
              await wheelConfig.update({ section_quantities: quantities }, { transaction });
              remainingQuantity = quantities[matchedIndex];
              console.log(`Decreased quantity for ${rewardType === 'reward' ? 'reward' : 'xp'} "${rewardValue}" in ${wheelType} wheel. New quantity: ${remainingQuantity}`);
            } else {
              remainingQuantity = 0;
            }
          } else {
            // If we can't match the reward in sections, do not modify quantities but report as unknown (null)
            remainingQuantity = null;
          }
        }
      } catch (error) {
        console.error("Error updating quantity:", error);
        // Don't fail the entire transaction for quantity update errors
      }
    }
    console.log(remainingQuantity)
    // Create log entry for both XP and reward wins (for admin tracking)
    await UserXpLog.create({
      userId: userId,
      season_id: activeBonusSeason?.id || null,
      source: 'game',
      type: `wheel_spin_${wheelType}`,
      xp: finalXP, // 0 for rewards, actual XP for XP wins
      date: dateOnly,
      description: logDescription,
      reward_type: rewardType,
      reward_value: rewardValue,
      rewardImageUrl,
    }, { transaction });

    // Update user level and badges only if XP is awarded
    if (finalXP > 0) {
      let userLevel = await UserLevel.findOne({
        where: { userId: userId },
        transaction
      });

      if (!userLevel) {
        // Create initial user level
        const newLevel = xpBadgeSystem.calculateLevel(finalXP);
        userLevel = await UserLevel.create({
          userId: userId,
          season_id: null,
          totalXp: finalXP,
          level: newLevel,
          xpForNext: xpBadgeSystem.getXpForNextLevel(newLevel),
          progress: 0,
          lastUpdatedAt: currentDate
        }, { transaction });

        // Update users table
        await user.update({
          totalUserXp: finalXP,
          curr_levels: newLevel
        }, { transaction });
      } else {
        // Update existing level
        const newTotalXp = userLevel.totalXp + finalXP;
        const newLevel = xpBadgeSystem.calculateLevel(newTotalXp);
        const xpForNext = xpBadgeSystem.getXpForNextLevel(newLevel);
        const currentLevelXp = newLevel > 1 ? xpBadgeSystem.getXpForNextLevel(newLevel - 1) : 0;
        const progress = newTotalXp >= xpForNext ? 100 : ((newTotalXp - currentLevelXp) / (xpForNext - currentLevelXp)) * 100;

        await userLevel.update({
          totalXp: newTotalXp,
          level: newLevel,
          xpForNext: xpForNext,
          progress: Math.min(progress, 100),
          lastUpdatedAt: currentDate
        }, { transaction });

        // Update users table
        await user.update({
          totalUserXp: newTotalXp,
          curr_levels: newLevel
        }, { transaction });
      }
    }

    await transaction.commit();

    // Get updated badge progress and user stats
    const updatedUserLevel = await UserLevel.findOne({ where: { userId: userId } });
    const badgeProgress = xpBadgeSystem.getBadgeProgress(updatedUserLevel?.totalXp || 0);
    const leveledUp = finalXP > 0 && updatedUserLevel && updatedUserLevel.level > (updatedUserLevel.level - Math.floor(finalXP / 1000));

    // Prepare response
    const response = {
      success: true,
      message: `Spin wheel ${rewardType} awarded successfully`,
      spinning: {
        wheelType: wheelType,
        sectionId: sectionId,
        rewardType: rewardType
      },
      winnings: rewardType === 'xp' ? {
        type: 'xp',
        originalXP: parseInt(rewardValue, 10),
        bonusMultiplier: bonusMultiplier,
        finalXP: finalXP,
        remainingQuantity: remainingQuantity === null ? null : remainingQuantity
      } : {
        type: 'reward',
        rewardValue: rewardValue,
        xpAwarded: 0,
        bonusMultiplier: bonusMultiplier,
        remainingQuantity: remainingQuantity === null ? null : remainingQuantity
      },
      seasonInfo: seasonInfo,
      userStats: updatedUserLevel ? {
        totalXp: updatedUserLevel.totalXp,
        level: updatedUserLevel.level,
        leveledUp: leveledUp,
        currentBadge: badgeProgress.currentBadge,
        badgeProgress: badgeProgress.progress,
        xpToNextBadge: badgeProgress.xpToNext
      } : null
    };

    res.status(200).send(HelperUtils.successObj("Spin wheel reward processed successfully", response));

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error in spin-wheel/award-xp API:", error);
    return res.status(500).send(
      HelperUtils.errorObj("Failed to award spin wheel XP")
    );
  }
});

// Get Global Highscores for All Games
router.get("/global-highscores", userAuthMiddleware, async (req, res) => {
  try {
    const { gameType } = req.query;

    // Build where clause for games with scores
    const whereClause = {
      source: 'game',
      score: {
        [Op.not]: null,
        [Op.gt]: 0
      }
    };

    // Filter by specific game type if provided
    if (gameType) {
      whereClause.type = gameType;
    }

    // Get global highscores - highest score per user per game type
    const globalHighscores = await UserXpLog.findAll({
      attributes: [
        'userId',
        'type',
        [sequelize.fn('MAX', sequelize.col('score')), 'maxScore'],
        [sequelize.fn('MAX', sequelize.col('highscore')), 'maxHighscore'],
      ],
      where: whereClause,
      group: ['userId', 'type'],
      order: [[sequelize.fn('MAX', sequelize.col('score')), 'DESC']],
      raw: true
    });

    // Get user details for the highscore holders
    const userIds = [...new Set(globalHighscores.map(score => score.userId))];
    const users = await Users.findAll({
      where: {
        id: {
          [Op.in]: userIds
        }
      },
      attributes: ['id', 'name', 'email', 'userCode']
    });

    // Create user map for quick lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    // Format the response with user details
    // const formattedHighscores = globalHighscores.map((record, index) => {
    //   const user = userMap[record.userId];
    //   return {
    //     userId: record.userId,
    //     userName: user ? user.name : 'Unknown User',
    //     userEmail: user ? user.email : 'Unknown',
    //     userCode: user ? user.userCode : 'Unknown',
    //     gameType: record.type,
    //     highscore: record.maxHighscore || record.maxScore,
    //     score: record.maxScore,
    //   };
    // });

    const gameStats = await UserXpLog.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'uniquePlayers'],
        [sequelize.fn('MAX', sequelize.col('score')), 'topScore'],
        [sequelize.fn('AVG', sequelize.col('score')), 'averageScore'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalPlays']
      ],
      where: {
        source: 'game',
        score: {
          [Op.not]: null,
          [Op.gt]: 0
        }
      },
      group: ['type'],
      order: [[sequelize.fn('MAX', sequelize.col('score')), 'DESC']],
      raw: true
    });

    const highScoreForGame = gameStats.find((game) => game.type === gameType);

    res.status(200).send({
      flag: true,
      message: "Global highscores fetched successfully",
      result: {
        highscore: highScoreForGame,
        gameStats: gameStats.map(stat => ({
          gameType: stat.type,
          uniquePlayers: parseInt(stat.uniquePlayers),
          topScore: parseInt(stat.topScore),
          averageScore: Math.round(parseFloat(stat.averageScore) || 0),
          totalPlays: parseInt(stat.totalPlays)
        })),
      }
    });
  } catch (error) {
    console.error("Error fetching global highscores:", error);
    res.status(500).send({
      flag: false,
      message: "Failed to fetch global highscores",
      result: null
    });
  }
});


// Get how many times the logged-in user played a given game in the current day (12 AM to 12 AM cycle)
router.get('/game/play-count', userAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gameType } = req.query;

    if (!gameType || typeof gameType !== 'string' || gameType.trim() === '') {
      return res.status(400).send(
        HelperUtils.errorObj("gameType must be a non-empty string")
      );
    }

    const now = new Date();

    // Get start of current day (12:00 AM)
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Get end of current day (11:59:59 PM)
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await UserXpLog.count({
      where: {
        userId,
        source: 'game',
        type: gameType,
        createdAt: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        }
      }
    });

    return res.status(200).send(
      HelperUtils.successObj('Play count fetched successfully', {
        gameType,
        count,
        hasPlayedThreeOrMore: count >= 3,
        period: {
          from: startOfDay.toISOString(),
          to: endOfDay.toISOString(),
          description: `Today (${startOfDay.toDateString()})`
        }
      })
    );
  } catch (error) {
    console.error('Error fetching game play count:', error);
    return res.status(500).send(
      HelperUtils.errorObj('Failed to fetch game play count')
    );
  }
});

module.exports = router;

