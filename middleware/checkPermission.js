const HelperUtils = require("./../utils/helpers");
const { sequelize } = require("../models");
const initModels = require("../models/init-models");
const Models = initModels(sequelize);
const { UserRoles, Roles, RolePermissions, Permissions } = Models;

const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    const userId = req.user.userId;

    try {
      const roles = await UserRoles.findAll({
        where: { userId },
        include: {
          model: Roles,
          as: "role",
          include: {
            model: Permissions,
            as: "Permissions",
            through: { attributes: [] }
          }
        }
      });

      const permissionNames = roles.flatMap(role =>
        role.role.Permissions.map(p => p.name)
      );

      if (!permissionNames.includes(permissionName)) {
        return res.status(403).send(HelperUtils.errorObj("Access denied: You are not authorized to perform this action."));
      }
      next();
    } catch (err) {
      console.error("checkPermission error:", err);
      return res.status(500).send(HelperUtils.errorObj("Internal server error while checking permissions"));
    }
  };
};

module.exports = checkPermission;

  