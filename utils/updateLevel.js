const { UserLevel, Users, LevelDefinition } = require('../models/init-models')(require('../models').sequelize);

const updateLevelAndUserXP = async (userId, newXpToAdd = 0) => {
  const user = await Users.findByPk(userId);
  if (!user) throw new Error("User not found");

  const totalXp = (user.totalUserXp || 0) + newXpToAdd;

  // Step 1: Fetch level definitions
  const levels = await LevelDefinition.findAll({ order: [['level', 'ASC']] });

  // Step 2: Determine current level based on total XP
  const unlockedLevels = levels.filter(lvl => lvl.xpRequired <= totalXp);
  const currentLevel = unlockedLevels[unlockedLevels.length - 1];
  const nextLevel = levels.find(l => l.level === currentLevel.level + 1);
  const xpForNext = nextLevel?.xpRequired || currentLevel.xpRequired;
  const progress = nextLevel ? Math.min(totalXp / xpForNext, 1.0).toFixed(2) : 1.0;

  // Step 3: Fetch all existing user_levels
  const existingLevels = await UserLevel.findAll({
    where: { userId },
    order: [['level', 'ASC']]
  });
  const existingLevelNumbers = existingLevels.map(l => l.level);

  // Step 4: Insert missing levels and fix xpForNext
  for (const level of unlockedLevels) {
    if (!existingLevelNumbers.includes(level.level)) {
      const next = levels.find(l => l.level === level.level + 1);

      //  Before inserting new level, finalize previous one
      const prevLog = await UserLevel.findOne({
        where: { userId, level: level.level - 1 },
        order: [['createdAt', 'DESC']]
      });

      if (prevLog && prevLog.progress < 1.0) {
        await prevLog.update({
          progress: 1.0,
          totalXp: level.xpRequired, // Cap total XP to threshold of next level
          lastUpdatedAt: new Date()
        });
      }

      //  Insert new level
      await UserLevel.create({
        userId,
        season_id: null, // Global level not tied to specific season
        level: level.level,
        totalXp,
        xpForNext: next ? next.xpRequired : 0,
        progress: level.level === currentLevel.level ? progress : 1.0,
        lastUpdatedAt: new Date()
      });
    }
  }

  // Step 5: Update progress only on current level row
  const lastRow = await UserLevel.findOne({
    where: { userId, level: currentLevel.level },
    order: [['createdAt', 'DESC']]
  });

  if (lastRow) {
    await lastRow.update({
      totalXp,
      progress,
      lastUpdatedAt: new Date()
    });
  }

  // Step 6: Update users table summary
  await user.update({
    totalUserXp: totalXp,
    curr_levels: currentLevel.level
  });
  console.log("level_date", {
    level: currentLevel.level,
    totalXp,
    xpForNext,
    progress
  });
  return {
    level: currentLevel.level,
    totalXp,
    xpForNext,
    progress
  };
};

module.exports = updateLevelAndUserXP;
