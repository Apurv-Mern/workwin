'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING },
      email: { type: Sequelize.STRING, unique: true },
      password: { type: Sequelize.STRING },
      status: { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};
