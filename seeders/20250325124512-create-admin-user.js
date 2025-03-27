'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Get SuperAdmin Role
    const [adminRole] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'SuperAdmin' LIMIT 1;",
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Insert Admin User
    await queryInterface.bulkInsert('users', [{
      name: 'Admin User',
      email: 'admin@gmail.com',
      password: hashedPassword,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // Fetch the inserted user manually
    const [adminUser] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'admin@gmail.com' LIMIT 1;",
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Assign Role to User
    await queryInterface.bulkInsert('user_roles', [{
      userId: adminUser.id,
      roleId: adminRole.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // Get all permissions
    const permissions = await queryInterface.sequelize.query(
      "SELECT id FROM permissions;",
      { type: Sequelize.QueryTypes.SELECT }
    );

    const rolePermissions = permissions.map(permission => ({
      roleId: adminRole.id,
      permissionId: permission.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Assign all permissions to SuperAdmin
    await queryInterface.bulkInsert('role_permissions', rolePermissions);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('user_roles', null, {});
    await queryInterface.bulkDelete('users', { email: 'admin@gmail.com' }, {});
  }
};
