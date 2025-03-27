'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('roles', [
      {
        name: 'SuperAdmin',
        description: 'Full access to everything',
        createdAt: '2025-03-25 12:38:08',
        updatedAt: '2025-03-25 12:38:08'
      },
      {
        name: 'SubAdmin',
        description: 'Manage teams and performance',
        createdAt: '2025-03-25 12:38:08',
        updatedAt: '2025-03-25 12:38:08'
      },
      {
        name: 'Employer',
        description: 'As like admin access to all leaderboard',
        createdAt: '2025-03-25 12:38:08',
        updatedAt: '2025-03-25 12:38:08'
      },
      {
        name: 'User',
        description: 'Basic access to games and leaderboard',
        createdAt: '2025-03-25 12:38:08',
        updatedAt: '2025-03-25 12:38:08'
      }
    ]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', null, {});
  }
};