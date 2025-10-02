'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add new columns to bonus_seasons table
        await queryInterface.addColumn('bonus_seasons', 'employer_code', {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Employer code for this bonus season'
        });

        await queryInterface.addColumn('bonus_seasons', 'season_type', {
            type: Sequelize.ENUM('easter', 'christmas', 'summer', 'winter', 'custom'),
            allowNull: true,
            comment: 'Type of seasonal bonus'
        });

        await queryInterface.addColumn('bonus_seasons', 'duration_months', {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 1,
            comment: 'Duration of the bonus season in months'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('bonus_seasons', 'employer_code');
        await queryInterface.removeColumn('bonus_seasons', 'season_type');
        await queryInterface.removeColumn('bonus_seasons', 'duration_months');
    }
};