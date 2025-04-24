'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_levels', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true
      },
      totalXp: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      xpForNext: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 200
      },
      progress: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      lastUpdatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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
    await queryInterface.dropTable('user_levels');
  }
};
