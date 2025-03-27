const simulatedSession = {};

// Middleware to simulate session
const simulateSession = (req, res, next) => {
    const sessionId = req.headers['x-session-id'] || 'default';
    
    if (!simulatedSession[sessionId]) {
        simulatedSession[sessionId] = {};
    }

    // Attach session object to the request
    req.session = simulatedSession[sessionId];

    next();
};

// Utility functions to manage session data
const setUserId = (req, userId) => {
    req.session.userId = userId;
};

const setUsername = (req, username) => {
    req.session.username = username;
};

const getUserId = (req) => req.session.userId;

const clearSession = (req) => {
    req.session = {};
};

module.exports = {
    simulateSession,
    setUserId,
    setUsername,
    getUserId,
    clearSession
};
