'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('permissions', [
      {
        name: 'user.create',
        description: 'Create new users',
        createdAt: '2025-03-25 12:38:08',
        updatedAt: '2025-03-25 12:38:08'
      },
      {
        name: 'user.read',
        description: 'Read user info',
        createdAt: '2025-03-25 12:38:08',
        updatedAt: '2025-03-25 12:38:08'
      },
      {
        name: 'user.update',
        description: 'Update user data',
        createdAt: '2025-03-25 12:38:08',
        updatedAt: '2025-03-25 12:38:08'
      },
      {
        name: 'user.delete',
        description: 'Delete users',
        createdAt: '2025-03-25 12:38:08',
        updatedAt: '2025-03-25 12:38:08'
      },
      {
        name: 'token.manage',
        description: 'Manage tokens & sessions',
        createdAt: '2025-03-25 12:38:08',
        updatedAt: '2025-03-25 12:38:08'
      }
    ]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('permissions', null, {});
  }
};
