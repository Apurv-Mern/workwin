'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('bonus_seasons', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Name of the bonus season (e.g., "Summer Bonus 2024")'
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Description of the bonus season'
            },
            start_date: {
                type: Sequelize.DATE,
                allowNull: false,
                comment: 'Start date of the bonus season'
            },
            end_date: {
                type: Sequelize.DATE,
                allowNull: false,
                comment: 'End date of the bonus season'
            },
            bonus_multiplier: {
                type: Sequelize.DECIMAL(4, 2),
                allowNull: false,
                defaultValue: 1.00,
                comment: 'Multiplier for bonus calculations (e.g., 1.5 for 50% bonus)'
            },
            bonus_type: {
                type: Sequelize.ENUM('percentage', 'fixed_amount'),
                allowNull: false,
                defaultValue: 'percentage',
                comment: 'Type of bonus calculation'
            },
            fixed_bonus_amount: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Fixed bonus amount (if bonus_type is fixed_amount)'
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether the bonus season is currently active'
            },
            applies_to_games: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'JSON array of game types this bonus applies to'
            },
            min_xp_threshold: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Minimum XP required to be eligible for bonus'
            },
            max_participants: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Maximum number of participants (null for unlimited)'
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
        await queryInterface.addIndex('bonus_seasons', ['is_active', 'start_date', 'end_date']);
        await queryInterface.addIndex('bonus_seasons', ['start_date']);
        await queryInterface.addIndex('bonus_seasons', ['end_date']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('bonus_seasons');
    }
};