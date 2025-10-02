'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Update the ENUM type to include new game types
        await queryInterface.changeColumn('xp_thresholds', 'game_type', {
            type: Sequelize.ENUM('spin_wheel', 'quiz', 'daily_challenge', 'achievement', 'custom', 'app_login', 'new_registration'),
            allowNull: false
        });
    },

    async down(queryInterface, Sequelize) {
        // Revert back to original ENUM
        await queryInterface.changeColumn('xp_thresholds', 'game_type', {
            type: Sequelize.ENUM('spin_wheel', 'quiz', 'daily_challenge', 'achievement', 'custom'),
            allowNull: false
        });
    }
};