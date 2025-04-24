const router = require("express").Router();
const moment = require("moment");
const config = require("config");
const { sequelize } = require("../../../models");
const initModels = require("../../../models/init-models");
const ModelsData = initModels(sequelize);
const { Users, Session, Roles, Permissions ,UserRoles } = ModelsData;
const HelperUtils = require("./../../../utils/helpers");
// const HelperOpenAi = require("./../../../utils/openAiHelper");
const jwt = require("jsonwebtoken");
const JWT_SECRET = config.get("jwtSecret");
const { Sequelize } = require('sequelize');
const adminAuthMiddleware = require("../../../middleware/adminAuthMiddleware");
const checkPermission = require("../../../middleware/checkPermission");
const fs = require("fs/promises");
const path = require("path");
const { DateTime } = require("luxon");
const multer = require("multer");
const fsData = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const TOKEN_EXPIRY = "1d";
const { Op } = require('sequelize');

router.post('/admin_login', async (req, res) => {
    const { email, password } = req.body;
    try {
      if (!email || !password) {
          return res.status(401).send(HelperUtils.errorObj("Invalid input: email and password are required"));
      }
      const user = await Users.findOne({
          where: { email },
          include: [
            {
              model: Roles,
              as: "Roles", 
              through: { attributes: [] }, // removes join table fields
              include: [
                {
                  model: Permissions,
                  as: "Permissions", 
                  through: { attributes: [] }
                }
              ]
            }
          ]
      });

      if (!user) return res.status(401).send(HelperUtils.errorObj("Invalid credentials"));

      const valid = await bcrypt.compare(password, user.password);

      if (!valid) return res.status(401).send(HelperUtils.errorObj("Invalid credentials"));

      // Check user role (must be "SuperAdmin , SubAdmin , Employer")
      const roles = await UserRoles.findAll({
        where: { userId: user.id },
        include: {
          model: Roles,
          as: "role", // Must match alias from init-models
        }
      });
      const allowedRoles = ["SuperAdmin", "SubAdmin", "Employer"];
      const roleNames = roles.map(r => r.role.name);
      const isAdmin = roleNames.some(role => allowedRoles.includes(role));

      if (!isAdmin) {
        return res.status(401).send({ success: false, message: "Access denied." });
      }

      // const permissions = user.Roles.flatMap(role => role.Permissions.map(p => p.name));
      const token = jwt.sign(
          { userId: user.id, 
            roles: user.Roles.map(r => r.name)
            // permissions 
          },
          JWT_SECRET,
          { expiresIn: TOKEN_EXPIRY }
      );

      await Session.upsert({
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      // Convert Sequelize instance to plain object and remove password
      const userData = user.toJSON();
      delete userData.password;
      // Comment out the Permissions list in response as well
      userData.Roles = userData.Roles.map(role => ({
        id: role.id,
        name: role.name
      }));
      return res.status(200).send(
          HelperUtils.successObj("Login successful", {
          ...userData,
          token
          })
      );
    }catch (error) {
      console.error("Error in /admin_login API:", error);
      return res.status(500).send({ success: false, message: "Something went wrong." });
    }
});

router.get('/me', adminAuthMiddleware, async (req, res) => {
  const user = req.user;
  const user_id = user.userId;
  try {
    if (!user_id) {
      return res.status(401).send(HelperUtils.errorObj("Invalid input: user is not defined."));
    }

    const userDetails = await Users.findByPk(user_id, {
      include: [
        {
          model: Roles,
          as: 'Roles', // Must match alias from init-models.js
          through: { attributes: [] } // Hides join table fields
        }
      ]
    });

    if (!userDetails) {
      return res.status(401).send(HelperUtils.errorObj("User not found"));
    }

    const userData = userDetails.toJSON();
    delete userData.password;

    // Extract role names
    userData.roles = userData.Roles?.map(role => role.name) || [];

    // Extract token from request header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    userData.token = token;

    res.status(200).send(HelperUtils.successObj("Profile fetched successfully.", userData));
  } catch (error) {
    console.error("Error in /me API:", error);
     return res.status(500).send(HelperUtils.errorObj("Something went wrong."));
  }
});

// GET /admin/roles
// router.get('/roles', adminAuthMiddleware, checkPermission('role.view'), async (req, res) => {
//   try {
//     const roles = await Roles.findAll({
//       include: {
//         model: Permissions,
//         as: 'Permissions',
//         through: { attributes: [] }
//       }
//     });

//     const formatted = roles.map(role => ({
//       id: role.id,
//       name: role.name,
//       description: role.description,
//       permissions: role.Permissions.map(p => ({ id: p.id, name: p.name }))
//     }));

//     res.status(200).send(HelperUtils.successObj("Roles fetched successfully", formatted));
//   } catch (err) {
//     console.error("Error fetching roles:", err);
//     res.status(500).send(HelperUtils.errorObj("Unable to fetch roles"));
//   }
// });

router.get('/roles', adminAuthMiddleware, checkPermission('role.view'), async (req, res) => {
  try {
    const userRoles = req.user.roles || []; // case-sensitive, as-is
    // console.log("Logged-in roles:", userRoles);
    // Priority logic
    const rolePriority = ['SuperAdmin', 'SubAdmin', 'Employer'];
    const userHighestRole = rolePriority.find(role => userRoles.includes(role));
    let whereCondition = {};

    if (userHighestRole === 'SuperAdmin') {
      whereCondition = {}; // All roles
    } else if (userHighestRole === 'SubAdmin') {
      whereCondition = { name: { [Op.ne]: 'SuperAdmin' } }; // All except SuperAdmin
    } else if (userHighestRole === 'Employer') {
      whereCondition = { name: 'User' }; // Only 'User' role
    } else {
      return res.status(400).send(HelperUtils.errorObj("You are not authorized to view roles"));
    }

    console.log("Where condition:", whereCondition);

    const roles = await Roles.findAll({
      where: whereCondition,
      include: {
        model: Permissions,
        as: 'Permissions',
        through: { attributes: [] }
      }
    });

    const formatted = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.Permissions.map(p => ({ id: p.id, name: p.name }))
    }));

    res.status(200).send(HelperUtils.successObj("Roles fetched successfully", formatted));
  } catch (err) {
    console.error(" Error fetching roles:", err);
    res.status(500).send(HelperUtils.errorObj("Unable to fetch roles"));
  }
});

// POST /admin/roles/create
router.post('/roles/create', adminAuthMiddleware, checkPermission('role.create'), async (req, res) => {
  let { name, description } = req.body;
  
  if (!name) {
    return res.status(400).send(HelperUtils.errorObj("Role Name is required"));
  }

  if (!description) {
    description = `this role is for ${name}`;
  }

  try {
    // Create the role
    const Userrole = req.user.roles;
    if (!Userrole.includes("SuperAdmin")) {
      return res.status(401).send(HelperUtils.errorObj("Access denied. only super admin can create this data."));
    }
    const role = await Roles.create({ name, description });

    // Assign permissions
    // await role.setPermissions(permissionIds);

    // Fetch the role with assigned permissions
    const fullRole = await Roles.findByPk(role.id, {
      // include: {
      //   model: Permissions,
      //   as: 'Permissions',
      //   through: { attributes: [] }
      // }
    });

    const formatted = {
      id: fullRole.id,
      name: fullRole.name,
      description: fullRole.description,
      permissions: []
      // permissions: fullRole.Permissions.map(p => ({ id: p.id, name: p.name }))
    };

    res.status(200).send(HelperUtils.successObj("Role created successfully", formatted));
  } catch (err) {
    console.error("Error creating role:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to create role"));
  }
});

// PUT /admin/roles/:id
router.put('/roles/:id', adminAuthMiddleware, checkPermission('role.edit'), async (req, res) => {
  const { id } = req.params;
  let { name, description } = req.body;

  if (!name) {
    return res.status(400).send(HelperUtils.errorObj("Role name is required"));
  }

  if (!description) {
    description = `this role is for ${name}`;
  }

  try {
    const Userrole = req.user.roles;
    if (!Userrole.includes("SuperAdmin")) {
      return res.status(401).send(HelperUtils.errorObj("Access denied. only super admin can edit this data."));
    }
    const role = await Roles.findByPk(id);
    if (!role) {
      return res.status(400).send(HelperUtils.errorObj("Role not found"));
    }

    await role.update({ name, description });

    const formatted = {
      id: role.id,
      name: role.name,
      description: role.description
    };

    res.status(200).send(HelperUtils.successObj("Role updated successfully", formatted));
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to update role"));
  }
});

// DELETE /admin/roles/:id
router.delete('/roles/:id', adminAuthMiddleware, checkPermission('role.delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const role = await Roles.findByPk(id, {
      include: {
        model: Permissions,
        as: 'Permissions',
        through: { attributes: [] }
      }
    });

    if (!role) {
      return res.status(404).send(HelperUtils.errorObj("Role not found"));
    }

    // Check if any users are linked with this role
    const userRoleCount = await UserRoles.count({ where: { roleId: id } });
    if (userRoleCount > 0) {
      return res.status(400).send(HelperUtils.errorObj("Cannot delete this role. It is currently assigned to one or more users."));
    }

    const Userrole = req.user.roles;
    if (!Userrole.includes("SuperAdmin")) {
      return res.status(401).send(HelperUtils.errorObj("Access denied. only super admin can delete this data."));
    }

    // Clear permissions
    await role.setPermissions([]);

    // Delete the role
    await role.destroy();

    res.status(200).send(HelperUtils.successObj("Role deleted successfully"));
  } catch (err) {
    console.error("Error deleting role:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to delete role"));
  }
});

// GET /admin/permissions
router.get('/permissions', adminAuthMiddleware, checkPermission('permission.view'), async (req, res) => {
  try {
    const permissions = await Permissions.findAll({
      attributes: ['id', 'name', 'description'],
      order: [['name', 'ASC']]
    });

    res.status(200).send(HelperUtils.successObj("Permissions fetched successfully", permissions));
  } catch (err) {
    console.error("Error fetching permissions:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to fetch permissions"));
  }
});

// POST /admin/permissions
router.post('/permissions/create', adminAuthMiddleware, checkPermission('permission.create'), async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).send(HelperUtils.errorObj("Permission name is required"));
  }

  try {
    const Userrole = req.user.roles;
    if (!Userrole.includes("SuperAdmin")) {
      return res.status(401).send(HelperUtils.errorObj("Access denied. only super admin can create this data."));
    }
    const [permission, created] = await Permissions.findOrCreate({
      where: { name },
      defaults: { description }
    });

    if (!created) {
      return res.status(400).send(HelperUtils.errorObj("Permission already exists"));
    }

    res.status(200).send(HelperUtils.successObj("Permission created successfully", {
      id: permission.id,
      name: permission.name,
      description: permission.description
    }));
  } catch (err) {
    console.error("Error creating permission:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to create permission"));
  }
});

// PUT /admin/permissions/:id
router.put('/permissions/:id', adminAuthMiddleware, checkPermission('permission.edit'), async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
 
  if (!name) {
    return res.status(400).send(HelperUtils.errorObj("Permission name is required"));
  }

  try {
    const permission = await Permissions.findByPk(id);
    if (!permission) {
      return res.status(400).send(HelperUtils.errorObj("Permission not found"));
    }
    const role = req.user.roles;
    if (!role.includes("SuperAdmin")) {
      return res.status(401).send(HelperUtils.errorObj("Access denied. only super admin can edit this data."));
    }
    await permission.update({ name, description });

    res.status(200).send(HelperUtils.successObj("Permission updated successfully", {
      id: permission.id,
      name: permission.name,
      description: permission.description
    }));
  } catch (err) {
    console.error("Error updating permission:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to update permission"));
  }
});

// DELETE /admin/permissions/:id
router.delete('/permissions/:id', adminAuthMiddleware, checkPermission('permission.delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const roles = req.user.roles;
    if (!roles.includes("SuperAdmin")) {
      return res.status(400).send(HelperUtils.errorObj("Access denied. Only SuperAdmin can delete permissions."));
    }

    const permission = await Permissions.findByPk(id, {
      include: {
        model: Roles,
        as: "Roles",
        through: { attributes: [] }
      }
    });

    if (!permission) {
      return res.status(400).send(HelperUtils.errorObj("Permission not found"));
    }

    if (permission.Roles && permission.Roles.length > 0) {
      return res.status(400).send(HelperUtils.errorObj("Cannot delete permission. It is currently assigned to one or more roles."));
    }

    await permission.destroy();

    res.status(200).send(HelperUtils.successObj("Permission deleted successfully"));
  } catch (err) {
    console.error("Error deleting permission:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to delete permission"));
  }
});

// POST /admin/roles/:id/assign-permissions
router.post('/roles/:id/assign-permissions', adminAuthMiddleware, checkPermission('role.assign_permission'), async (req, res) => {
  const { id } = req.params;
  const { permissionIds } = req.body;

  if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
    return res.status(400).send(HelperUtils.errorObj("permissionIds must be a non-empty array."));
  }

  try {
    const UserrolesName = req.user.roles;
    if (!UserrolesName.includes("SuperAdmin")) {
      return res.status(400).send(HelperUtils.errorObj("Access denied. Only SuperAdmin can delete permissions."));
    }
    const role = await Roles.findByPk(id, {
      include: {
        model: Permissions,
        as: 'Permissions',
        through: { attributes: [] }
      }
    });

    if (!role) {
      return res.status(400).send(HelperUtils.errorObj("Role not found."));
    }

    // Validate incoming permission IDs
    const validPermissions = await Permissions.findAll({
      where: { id: permissionIds }
    });
    const validIds = validPermissions.map(p => p.id);

    if (validIds.length !== permissionIds.length) {
      const invalidIds = permissionIds.filter(pid => !validIds.includes(pid));
      return res.status(400).send(HelperUtils.errorObj(`Invalid permission IDs: [${invalidIds.join(", ")}]`));
    }

    // Get current permission IDs already assigned
    const currentIds = role.Permissions.map(p => p.id);

    // Calculate permissions to add and remove
    const toAdd = validIds.filter(id => !currentIds.includes(id));
    const toRemove = currentIds.filter(id => !validIds.includes(id));

    // Add new ones
    if (toAdd.length > 0) {
      await role.addPermissions(toAdd);
    }

    // Remove obsolete ones
    if (toRemove.length > 0) {
      await role.removePermissions(toRemove);
    }

    // Refetch updated permissions after changes
    const updatedRole = await Roles.findByPk(id, {
      include: {
        model: Permissions,
        as: 'Permissions',
        through: { attributes: [] }
      }
    });

    res.status(200).send(HelperUtils.successObj("Permissions updated successfully", {
      role: {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        permissions: updatedRole.Permissions.map(p => ({ id: p.id, name: p.name ,description: p.description}))
      }
    }));
    // res.status(200).send(HelperUtils.successObj("Permissions updated successfully", {
    //   added: toAdd,
    //   removed: toRemove,
    //   kept: validIds.filter(id => currentIds.includes(id))
    // }));
  } catch (err) {
    console.error("Error assigning permissions:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to update permissions."));
  }
});



// POST /admin/xp/calculate-daily
router.post('/xp/calculate-daily', adminAuthMiddleware, async (req, res) => {
  try {
    const { date } = req.body;
    const calcDate = date || new Date().toISOString().split('T')[0];

    const attributes = await UserAttribute.findAll({ where: { date: calcDate } });

    for (const attr of attributes) {
      const xp = Math.round(50 * (
        0.15 * (attr.attendance / 100) +
        0.15 * (attr.punctuality / 100) +
        0.2  * (attr.communication / 100) +
        0.25 * (attr.cooperation / 100) +
        0.25 * (attr.ownership / 100)
      ));

      await UserXpLog.create({
        userId: attr.userId,
        source: 'attribute',
        type: 'daily_xp',
        xp,
        date: calcDate,
        description: 'Daily XP from attributes'
      });

      const level = await UserLevel.findOne({ where: { userId: attr.userId } });
      if (level) {
        const totalXp = level.totalXp + xp;
        const nextLevelXp = level.level * 200;
        const progress = Math.min(totalXp / nextLevelXp, 1.0).toFixed(2);

        await level.update({
          totalXp,
          xpForNext: nextLevelXp,
          level: Math.floor(totalXp / 200) + 1,
          progress,
          lastUpdatedAt: new Date()
        });
      }
    }

    res.status(200).send(HelperUtils.successObj("XP calculated successfully"));
  } catch (err) {
    console.error("XP calc error:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to calculate XP"));
  }
});

module.exports = router;