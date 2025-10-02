'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Make season_id nullable in user_xp_logs table
        await queryInterface.changeColumn('user_xp_logs', 'season_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null
        });
    },

    async down(queryInterface, Sequelize) {
        // Revert back to NOT NULL (note: this may fail if there are null values)
        await queryInterface.changeColumn('user_xp_logs', 'season_id', {
            type: Sequelize.INTEGER,
            allowNull: false
        });
    }
};