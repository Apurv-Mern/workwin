/**
 * XP Badge System
 * Manages user badges based on XP levels and provides badge progression logic
 */

const XP_BADGES = [
    {
        id: 1,
        name: "Sprouting Badge",
        description: "A tiny seed of potential, just beginning the journey.",
        xpRequired: 0,
        iconUrl: "https://workwin.24livehost.com:3025/badges/sprouting-badge.png"
    },
    {
        id: 2,
        name: "Glowleaf Badge",
        description: "A shimmering leaf that shows growth and early magic.",
        xpRequired: 10000,
        iconUrl: "https://workwin.24livehost.com:3025/badges/glowleaf-badge.png"
    },
    {
        id: 3,
        name: "Wandtip Badge",
        description: "The spark of spellcraft begins—players are learning the ropes.",
        xpRequired: 20000,
        iconUrl: "https://workwin.24livehost.com:3025/badges/wandtip-badge.png"
    },
    {
        id: 4,
        name: "Runecrest Badge",
        description: "Marked with ancient runes, this badge shows rising mastery.",
        xpRequired: 50000,
        iconUrl: "https://workwin.24livehost.com:3025/badges/runecrest-badge.png"
    },
    {
        id: 5,
        name: "Startrail Badge",
        description: "A badge that glows with cosmic energy—players are gaining momentum.",
        xpRequired: 75000,
        iconUrl: "https://workwin.24livehost.com:3025/badges/startrail-badge.png"
    },
    {
        id: 6,
        name: "Moonspire Badge",
        description: "A towering symbol of achievement, reaching for the stars.",
        xpRequired: 100000,
        iconUrl: "https://workwin.24livehost.com:3025/badges/moonspire-badge.png"
    },
    {
        id: 7,
        name: "Phoenix Crest",
        description: "Reborn in fire, this badge represents resilience and power.",
        xpRequired: 250000,
        iconUrl: "https://workwin.24livehost.com:3025/badges/phoenix-crest.png"
    },
    {
        id: 8,
        name: "Titan Sigil",
        description: "A mighty emblem of strength, earned by the truly dedicated.",
        xpRequired: 500000,
        iconUrl: "https://workwin.24livehost.com:3025/badges/titan-sigil.png"
    },
    {
        id: 9,
        name: "Mythborn Medal",
        description: "A legendary token bestowed upon those of near-mythical skill.",
        xpRequired: 750000,
        iconUrl: "https://workwin.24livehost.com:3025/badges/mythborn-medal.png"
    },
    {
        id: 10,
        name: "Elder Crown",
        description: "The ultimate badge of honor—worn only by the wisest and most powerful players.",
        xpRequired: 1000000,
        iconUrl: "https://workwin.24livehost.com:3025/badges/elder-crown.png"
    }
];

/**
 * Get all badge definitions
 */
const getAllBadges = () => {
    return XP_BADGES;
};

/**
 * Get user's current badge based on XP
 */
const getCurrentBadge = (totalXp) => {
    let currentBadge = XP_BADGES[0]; // Default to first badge

    for (const badge of XP_BADGES) {
        if (totalXp >= badge.xpRequired) {
            currentBadge = badge;
        } else {
            break;
        }
    }

    return currentBadge;
};

/**
 * Get next badge user can achieve
 */
const getNextBadge = (totalXp) => {
    for (const badge of XP_BADGES) {
        if (totalXp < badge.xpRequired) {
            return badge;
        }
    }
    return null; // Already at max badge
};

/**
 * Get all earned badges by user
 */
const getEarnedBadges = (totalXp) => {
    return XP_BADGES.filter(badge => totalXp >= badge.xpRequired);
};

/**
 * Get badge progress information
 */
const getBadgeProgress = (totalXp) => {
    const currentBadge = getCurrentBadge(totalXp);
    const nextBadge = getNextBadge(totalXp);

    if (!nextBadge) {
        return {
            currentBadge,
            nextBadge: null,
            progress: 100,
            xpToNext: 0,
            isMaxLevel: true
        };
    }

    const xpInCurrentTier = totalXp - currentBadge.xpRequired;
    const xpNeededForNext = nextBadge.xpRequired - currentBadge.xpRequired;
    const progress = Math.min((xpInCurrentTier / xpNeededForNext) * 100, 100);

    return {
        currentBadge,
        nextBadge,
        progress: Math.round(progress * 100) / 100, // Round to 2 decimal places
        xpToNext: nextBadge.xpRequired - totalXp,
        isMaxLevel: false
    };
};

/**
 * Calculate user level based on XP (simplified level system)
 */
const calculateLevel = (totalXp) => {
    // Simple level calculation: level = floor(sqrt(totalXp / 1000)) + 1
    // This gives a progressive leveling curve
    return Math.floor(Math.sqrt(totalXp / 1000)) + 1;
};

/**
 * Get XP required for next level
 */
const getXpForNextLevel = (currentLevel) => {
    // Reverse calculation: XP = (level - 1)^2 * 1000
    return Math.pow(currentLevel, 2) * 1000;
};

/**
 * Get unlocked seasons based on user level and XP
 */
const getUnlockedSeasons = (totalXp, userLevel) => {
    const unlockedSeasons = [];

    // Season unlock logic based on XP and level
    const seasonRequirements = [
        { season: 1, xpRequired: 0, levelRequired: 1 },
        { season: 2, xpRequired: 5000, levelRequired: 3 },
        { season: 3, xpRequired: 15000, levelRequired: 5 },
        { season: 4, xpRequired: 30000, levelRequired: 8 },
        { season: 5, xpRequired: 50000, levelRequired: 12 },
        { season: 6, xpRequired: 75000, levelRequired: 15 },
        { season: 7, xpRequired: 100000, levelRequired: 20 },
        { season: 8, xpRequired: 150000, levelRequired: 25 },
        { season: 9, xpRequired: 250000, levelRequired: 30 },
        { season: 10, xpRequired: 400000, levelRequired: 35 },
        { season: 11, xpRequired: 600000, levelRequired: 40 },
        { season: 12, xpRequired: 1000000, levelRequired: 50 }
    ];

    seasonRequirements.forEach(req => {
        if (totalXp >= req.xpRequired && userLevel >= req.levelRequired) {
            unlockedSeasons.push(req.season);
        }
    });

    return unlockedSeasons;
};

module.exports = {
    XP_BADGES,
    getAllBadges,
    getCurrentBadge,
    getNextBadge,
    getEarnedBadges,
    getBadgeProgress,
    calculateLevel,
    getXpForNextLevel,
    getUnlockedSeasons
};