'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('level_definitions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true
      },
      xpRequired: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      reward: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('level_definitions');
  }
};