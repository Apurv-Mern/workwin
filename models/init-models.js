var DataTypes = require("sequelize").DataTypes;
var _permissions = require("./permissions");
var _role_permissions = require("./role_permissions");
var _roles = require("./roles");
var _sequelizemeta = require("./sequelizemeta");
var _user_roles = require("./user_roles");
var _users = require("./users");

function initModels(sequelize) {
  var permissions = _permissions(sequelize, DataTypes);
  var role_permissions = _role_permissions(sequelize, DataTypes);
  var roles = _roles(sequelize, DataTypes);
  var sequelizemeta = _sequelizemeta(sequelize, DataTypes);
  var user_roles = _user_roles(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);

  role_permissions.belongsTo(permissions, { as: "permission", foreignKey: "permissionId"});
  permissions.hasMany(role_permissions, { as: "role_permissions", foreignKey: "permissionId"});
  role_permissions.belongsTo(roles, { as: "role", foreignKey: "roleId"});
  roles.hasMany(role_permissions, { as: "role_permissions", foreignKey: "roleId"});
  user_roles.belongsTo(roles, { as: "role", foreignKey: "roleId"});
  roles.hasMany(user_roles, { as: "user_roles", foreignKey: "roleId"});
  user_roles.belongsTo(users, { as: "user", foreignKey: "userId"});
  users.hasMany(user_roles, { as: "user_roles", foreignKey: "userId"});

  return {
    permissions,
    role_permissions,
    roles,
    sequelizemeta,
    user_roles,
    users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
