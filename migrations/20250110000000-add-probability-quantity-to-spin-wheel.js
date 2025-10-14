'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('spin_the_wheel', 'section_probabilities', {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'JSON array of section probabilities'
        });

        await queryInterface.addColumn('spin_the_wheel', 'section_quantities', {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'JSON array of section quantities'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('spin_the_wheel', 'section_probabilities');
        await queryInterface.removeColumn('spin_the_wheel', 'section_quantities');
    }
};
