'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_roles', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      roleId: {
        type: Sequelize.INTEGER,
        references: { model: 'roles', key: 'id' },
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_roles');
  }
};