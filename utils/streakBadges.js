const getStreakBadge = (streak) => {
    if (streak >= 35) {
        return {
            id: 5,
            name: "Legend Streak",
            description: "The ultimate streak, where players enter a realm of epic rewards and mythical status",
            streakRequired: 35,
            iconUrl: "https://workwin.24livehost.com:3025/streaks/legend-badge.png",
            tier: "legendary"
        };
    } else if (streak >= 28) {
        return {
            id: 4,
            name: "Arcane Streak",
            description: "A fiery streak of power and precision, lighting up the leaderboard",
            streakRequired: 28,
            iconUrl: "https://workwin.24livehost.com:3025/streaks/arcane-badge.png",
            tier: "epic"
        };
    } else if (streak >= 21) {
        return {
            id: 3,
            name: "Mystic Streak",
            description: "A surge of magical force that propels players forward with flair",
            streakRequired: 21,
            iconUrl: "https://workwin.24livehost.com:3025/streaks/mystic-badge.png",
            tier: "rare"
        };
    } else if (streak >= 14) {
        return {
            id: 2,
            name: "Charm Streak",
            description: "A streak powered by enchanted luck and playful energy",
            streakRequired: 14,
            iconUrl: "https://workwin.24livehost.com:3025/streaks/charm-badge.png",
            tier: "uncommon"
        };
    } else if (streak >= 7) {
        return {
            id: 1,
            name: "Spark Streak",
            description: "The first flicker of magic; a light burst of momentum that gets things glowing",
            streakRequired: 7,
            iconUrl: "https://workwin.24livehost.com:3025/streaks/spark-badge.png",
            tier: "common"
        };
    } else {
        return {
            id: 0,
            name: "No Streak Badge",
            description: "Build a 7-day attendance streak to earn your first badge!",
            streakRequired: 7,
            iconUrl: null,
            tier: "none"
        };
    }
};

module.exports = { getStreakBadge };