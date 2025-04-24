'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_attributes', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      attendance: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      punctuality: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      communication: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      cooperation: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      ownership: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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
    await queryInterface.dropTable('user_attributes');
  }
};