'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('spin_the_wheel', 'reward_images', {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'JSON array of reward image URLs/paths'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('spin_the_wheel', 'reward_images');
    }
};