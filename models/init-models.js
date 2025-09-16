const Sequelize = require("sequelize");
const DataTypes = Sequelize.DataTypes;

const _Permissions = require("./Permissions");
const _RolePermissions = require("./RolePermissions");
const _Roles = require("./Roles");
const _Sequelizemeta = require("./Sequelizemeta");
const _UserRoles = require("./UserRoles");
const _Users = require("./Users");
const _Session = require("./Session");
const _UserXpLog = require("./UserXpLog");
const _UserLevel = require("./UserLevel");
const _UserAttribute = require("./UserAttribute");
const _LevelDefinition = require("./LevelDefinition");
const _Weights = require("./Weights");
const _Rewards = require("./Rewards");
const _EmployeeXpResults = require("./EmployeeXpResults");
const _SpinTheWheel = require("./SpinTheWheel");

function initModels(sequelize) {
  const Permissions = _Permissions.init(sequelize, DataTypes);
  const RolePermissions = _RolePermissions.init(sequelize, DataTypes);
  const Roles = _Roles.init(sequelize, DataTypes);
  const Sequelizemeta = _Sequelizemeta.init(sequelize, DataTypes);
  const UserRoles = _UserRoles.init(sequelize, DataTypes);
  const Users = _Users.init(sequelize, DataTypes);
  const Session = _Session.init(sequelize, DataTypes);
  const UserXpLog = _UserXpLog.init(sequelize, DataTypes);
  const UserLevel = _UserLevel.init(sequelize, DataTypes);
  const UserAttribute = _UserAttribute.init(sequelize, DataTypes);
  const LevelDefinition = _LevelDefinition.init(sequelize, DataTypes);
  const Weights = _Weights.init(sequelize, DataTypes);
  const Rewards = _Rewards.init(sequelize, DataTypes);
  const EmployeeXpResults = _EmployeeXpResults.init(sequelize, DataTypes);
  const SpinTheWheel = _SpinTheWheel.init(sequelize, DataTypes);

  // Define relationships
  RolePermissions.belongsTo(Permissions, {
    as: "permission",
    foreignKey: "permissionId",
  });
  Permissions.hasMany(RolePermissions, {
    as: "role_permissions",
    foreignKey: "permissionId",
  });

  RolePermissions.belongsTo(Roles, { as: "role", foreignKey: "roleId" });
  Roles.hasMany(RolePermissions, {
    as: "role_permissions",
    foreignKey: "roleId",
  });

  UserRoles.belongsTo(Roles, { as: "role", foreignKey: "roleId" });
  Roles.hasMany(UserRoles, { as: "user_roles", foreignKey: "roleId" });

  UserRoles.belongsTo(Users, { as: "user", foreignKey: "userId" });
  Users.hasMany(UserRoles, { as: "user_roles", foreignKey: "userId" });

  // Optional: Add M:N association helpers (needed for includes)
  Users.belongsToMany(Roles, {
    through: UserRoles,
    foreignKey: "userId",
    otherKey: "roleId",
    as: "Roles",
  });
  Roles.belongsToMany(Users, {
    through: UserRoles,
    foreignKey: "roleId",
    otherKey: "userId",
    as: "Users",
  });

  Roles.belongsToMany(Permissions, {
    through: RolePermissions,
    foreignKey: "roleId",
    otherKey: "permissionId",
    as: "Permissions",
  });
  Permissions.belongsToMany(Roles, {
    through: RolePermissions,
    foreignKey: "permissionId",
    otherKey: "roleId",
    as: "Roles",
  });
  UserLevel.belongsTo(LevelDefinition, {
    foreignKey: "level",
    targetKey: "level",
    as: "LevelDefinition",
  });

  return {
    Permissions,
    RolePermissions,
    Roles,
    Sequelizemeta,
    UserRoles,
    Users,
    Session,
    UserXpLog,
    UserLevel,
    UserAttribute,
    LevelDefinition,
    Weights,
    Rewards,
    EmployeeXpResults,
    SpinTheWheel
  };
}

module.exports = initModels;
