'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('xp_thresholds', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            game_name: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Name of the game (e.g., "Spin Wheel", "Quiz Game", "Daily Challenge")'
            },
            game_type: {
                type: Sequelize.ENUM('spin_wheel', 'quiz', 'daily_challenge', 'achievement', 'custom'),
                allowNull: false,
                comment: 'Type/category of the game'
            },
            min_xp_required: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Minimum XP required to unlock this game'
            },
            level_required: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Minimum level required (optional alternative to XP)'
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether this threshold rule is currently active'
            },
            unlock_message: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Message to display when game is unlocked'
            },
            lock_message: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Message to display when game is locked'
            },
            icon_url: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'URL or path to game icon'
            },
            sort_order: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Order for displaying games in UI'
            },
            requires_consecutive_days: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Number of consecutive days of activity required (optional)'
            },
            additional_requirements: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'JSON object for additional unlock requirements'
            },
            reward_on_unlock: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'JSON object for rewards given when game is unlocked'
            },
            cooldown_hours: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Hours to wait between plays (null for no cooldown)'
            },
            max_plays_per_day: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Maximum plays per day (null for unlimited)'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Add indexes for better query performance
        await queryInterface.addIndex('xp_thresholds', ['is_active', 'min_xp_required']);
        await queryInterface.addIndex('xp_thresholds', ['game_type', 'is_active']);
        await queryInterface.addIndex('xp_thresholds', ['sort_order']);

        // Add unique constraint for game_name to prevent duplicates
        await queryInterface.addIndex('xp_thresholds', ['game_name'], {
            unique: true,
            name: 'unique_game_name'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('xp_thresholds');
    }
};