'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('role_permissions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      roleId: {
        type: Sequelize.INTEGER,
        references: { model: 'roles', key: 'id' },
        onDelete: 'CASCADE'
      },
      permissionId: {
        type: Sequelize.INTEGER,
        references: { model: 'permissions', key: 'id' },
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('role_permissions');
  }
};