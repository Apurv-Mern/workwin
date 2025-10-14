const router = require("express").Router();
const config = require("config");
const { sequelize } = require("../../../models");
const initModels = require("../../../models/init-models");
const ModelsData = initModels(sequelize);
const {
  Users,
  Session,
  Roles,
  Permissions,
  UserRoles,
  RolePermissions,
  Weights,
  Rewards,
  EmployeeXpResults,
  SpinTheWheel,
  BonusSeason,
  XpThreshold,
  UserLevel,
  UserXpLog
} = ModelsData;
const HelperUtils = require("./../../../utils/helpers");
const xpBadgeSystem = require("./../../../utils/xpBadgeSystem");
const jwt = require("jsonwebtoken");
const JWT_SECRET = config.get("jwtSecret");
const adminAuthMiddleware = require("../../../middleware/adminAuthMiddleware");
const checkPermission = require("../../../middleware/checkPermission");
const bcrypt = require("bcryptjs");
const TOKEN_EXPIRY = "1d";
const { Op } = require("sequelize");
const upload = require("../../../middleware/fileUpload");
const XLSX = require("xlsx");
const nodemailer = require("nodemailer");


router.post("/admin_login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res
        .status(401)
        .send(
          HelperUtils.errorObj("Invalid input: email and password are required")
        );
    }
    const user = await Users.findOne({
      where: { email },
      include: [
        {
          model: Roles,
          as: "Roles",
          through: { attributes: [] },
          include: [
            {
              model: Permissions,
              as: "Permissions",
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!user)
      return res.status(401).send(HelperUtils.errorObj("Invalid credentials"));

    const valid = await bcrypt.compare(password, user.password);

    if (!valid)
      return res.status(401).send(HelperUtils.errorObj("Invalid credentials"));

    // Check user role (must be "SuperAdmin , SubAdmin , Employer")
    const roles = await UserRoles.findAll({
      where: { userId: user.id },
      include: {
        model: Roles,
        as: "role", // Must match alias from init-models
      },
    });
    const allowedRoles = ["SuperAdmin", "SubAdmin", "Employer"];
    const roleNames = roles.map((r) => r.role.name);
    const isAdmin = roleNames.some((role) => allowedRoles.includes(role));

    if (!isAdmin) {
      return res
        .status(401)
        .send({ success: false, message: "Access denied." });
    }

    const permissions = user.Roles.flatMap((role) =>
      role.Permissions.map((p) => p.name)
    );
    const token = jwt.sign(
      {
        userId: user.id,
        roles: user.Roles.map((r) => r.name),
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    await Session.upsert({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Convert Sequelize instance to plain object and remove password
    const userData = user.toJSON();
    delete userData.password;
    // Comment out the Permissions list in response as well
    userData.Roles = userData.Roles.map((role) => ({
      id: role.id,
      name: role.name,
    }));
    userData.permissions = permissions;
    return res.status(200).send(
      HelperUtils.successObj("Login successful", {
        ...userData,
        token,
      })
    );
  } catch (error) {
    console.error("Error in /admin_login API:", error);
    return res
      .status(500)
      .send({ success: false, message: "Something went wrong." });
  }
});

router.get("/me", adminAuthMiddleware, async (req, res) => {
  const user = req.user;
  const user_id = user.userId;
  try {
    if (!user_id) {
      return res
        .status(401)
        .send(HelperUtils.errorObj("Invalid input: user is not defined."));
    }

    const userDetails = await Users.findByPk(user_id, {
      include: [
        {
          model: Roles,
          as: "Roles", // Must match alias from init-models.js
          through: { attributes: [] }, // Hides join table fields
        },
      ],
    });

    if (!userDetails) {
      return res.status(401).send(HelperUtils.errorObj("User not found"));
    }

    const userData = userDetails.toJSON();
    delete userData.password;

    // Extract role names
    userData.roles = userData.Roles?.map((role) => role.name) || [];

    // Extract token from request header
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    userData.token = token;

    res
      .status(200)
      .send(HelperUtils.successObj("Profile fetched successfully.", userData));
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

router.get(
  "/roles",
  adminAuthMiddleware,
  // checkPermission("role.view"),
  async (req, res) => {
    try {
      const userRoles = req.user.roles || []; // case-sensitive, as-is
      // console.log("Logged-in roles:", userRoles);
      // Priority logic
      const rolePriority = ["SuperAdmin", "SubAdmin", "Employer"];
      const userHighestRole = rolePriority.find((role) =>
        userRoles.includes(role)
      );
      let whereCondition = {};

      if (userHighestRole === "SuperAdmin") {
        whereCondition = {}; // All roles
      } else if (userHighestRole === "SubAdmin") {
        whereCondition = { name: { [Op.ne]: "SuperAdmin" } }; // All except SuperAdmin
      } else if (userHighestRole === "Employer") {
        whereCondition = { name: "User" }; // Only 'User' role
      } else {
        return res
          .status(400)
          .send(HelperUtils.errorObj("You are not authorized to view roles"));
      }

      console.log("Where condition:", whereCondition);

      const roles = await Roles.findAll({
        where: whereCondition,
        include: {
          model: Permissions,
          as: "Permissions",
          through: { attributes: [] },
        },
      });

      const formatted = roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.Permissions.map((p) => ({ id: p.id, name: p.name })),
      }));

      res
        .status(200)
        .send(HelperUtils.successObj("Roles fetched successfully", formatted));
    } catch (err) {
      console.error(" Error fetching roles:", err);
      res.status(500).send(HelperUtils.errorObj("Unable to fetch roles"));
    }
  }
);

// POST /admin/roles/create
// router.post(
//   "/roles/create",
//   adminAuthMiddleware,
//   checkPermission("role.create"),
//   async (req, res) => {
//     let { name, description } = req.body;

//     if (!name) {
//       return res
//         .status(400)
//         .send(HelperUtils.errorObj("Role Name is required"));
//     }

//     if (!description) {
//       description = `this role is for ${name}`;
//     }

//     try {
//       // Create the role
//       const Userrole = req.user.roles;
//       if (!Userrole.includes("SuperAdmin")) {
//         return res
//           .status(401)
//           .send(
//             HelperUtils.errorObj(
//               "Access denied. only super admin can create this data."
//             )
//           );
//       }
//       const role = await Roles.create({ name, description });

//       // Assign permissions
//       // await role.setPermissions(permissionIds);

//       // Fetch the role with assigned permissions
//       const fullRole = await Roles.findByPk(role.id, {
//         // include: {
//         //   model: Permissions,
//         //   as: 'Permissions',
//         //   through: { attributes: [] }
//         // }
//       });

//       const formatted = {
//         id: fullRole.id,
//         name: fullRole.name,
//         description: fullRole.description,
//         permissions: [],
//         // permissions: fullRole.Permissions.map(p => ({ id: p.id, name: p.name }))
//       };

//       res
//         .status(200)
//         .send(HelperUtils.successObj("Role created successfully", formatted));
//     } catch (err) {
//       console.error("Error creating role:", err);
//       res.status(500).send(HelperUtils.errorObj("Failed to create role"));
//     }
//   }
// );

// PUT /admin/roles/:id
router.put(
  "/roles/:id",
  adminAuthMiddleware,
  checkPermission("role.edit"),
  async (req, res) => {
    const { id } = req.params;
    let { name, description, permissions } = req.body;

    if (!name) {
      return res
        .status(400)
        .send(HelperUtils.errorObj("Role name is required"));
    }

    if (!description) {
      description = `This role is for ${name}`;
    }

    if (
      permissions &&
      (!Array.isArray(permissions) || permissions.length === 0)
    ) {
      return res
        .status(400)
        .send(HelperUtils.errorObj("Permissions must be a non-empty array"));
    }

    try {
      const Userrole = req.user.roles;
      if (!Userrole.includes("SuperAdmin")) {
        return res
          .status(401)
          .send(
            HelperUtils.errorObj(
              "Access denied. Only SuperAdmin can edit roles."
            )
          );
      }

      const role = await Roles.findByPk(id);
      if (!role) {
        return res.status(404).send(HelperUtils.errorObj("Role not found"));
      }

      await role.update({ name, description });

      if (permissions) {
        await RolePermissions.destroy({ where: { roleId: id } });

        const rolePermissionsData = permissions.map((permissionId) => ({
          roleId: id,
          permissionId,
        }));

        await RolePermissions.bulkCreate(rolePermissionsData);
      }

      // Fetch the updated role with permissions
      const updatedRole = await Roles.findByPk(id, {
        include: {
          model: Permissions,
          as: "Permissions",
          through: { attributes: [] },
        },
      });

      const formatted = {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        permissions: updatedRole.Permissions.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      };

      res
        .status(200)
        .send(HelperUtils.successObj("Role updated successfully", formatted));
    } catch (err) {
      console.error("Error updating role:", err);
      res.status(500).send(HelperUtils.errorObj("Failed to update role"));
    }
  }
);

// DELETE /admin/roles/:id
router.delete(
  "/roles/:id",
  adminAuthMiddleware,
  checkPermission("role.delete"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const role = await Roles.findByPk(id, {
        include: {
          model: Permissions,
          as: "Permissions",
          through: { attributes: [] },
        },
      });

      if (!role) {
        return res.status(404).send(HelperUtils.errorObj("Role not found"));
      }

      // Check if any users are linked with this role
      const userRoleCount = await UserRoles.count({ where: { roleId: id } });
      if (userRoleCount > 0) {
        return res
          .status(400)
          .send(
            HelperUtils.errorObj(
              "Cannot delete this role. It is currently assigned to one or more users."
            )
          );
      }

      const Userrole = req.user.roles;
      if (!Userrole.includes("SuperAdmin")) {
        return res
          .status(401)
          .send(
            HelperUtils.errorObj(
              "Access denied. only super admin can delete this data."
            )
          );
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
  }
);

// GET /admin/permissions
router.get(
  "/permissions",
  adminAuthMiddleware,
  checkPermission("permission.view"),
  async (req, res) => {
    try {
      const permissions = await Permissions.findAll({
        attributes: ["id", "name", "description"],
        order: [["name", "ASC"]],
      });

      res
        .status(200)
        .send(
          HelperUtils.successObj(
            "Permissions fetched successfully",
            permissions
          )
        );
    } catch (err) {
      console.error("Error fetching permissions:", err);
      res.status(500).send(HelperUtils.errorObj("Failed to fetch permissions"));
    }
  }
);

// POST /admin/permissions
router.post(
  "/permissions/create",
  adminAuthMiddleware,
  checkPermission("permission.create"),
  async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
      return res
        .status(400)
        .send(HelperUtils.errorObj("Permission name is required"));
    }

    try {
      const Userrole = req.user.roles;
      if (!Userrole.includes("SuperAdmin")) {
        return res
          .status(401)
          .send(
            HelperUtils.errorObj(
              "Access denied. only super admin can create this data."
            )
          );
      }
      const [permission, created] = await Permissions.findOrCreate({
        where: { name },
        defaults: { description },
      });

      if (!created) {
        return res
          .status(400)
          .send(HelperUtils.errorObj("Permission already exists"));
      }

      res.status(200).send(
        HelperUtils.successObj("Permission created successfully", {
          id: permission.id,
          name: permission.name,
          description: permission.description,
        })
      );
    } catch (err) {
      console.error("Error creating permission:", err);
      res.status(500).send(HelperUtils.errorObj("Failed to create permission"));
    }
  }
);

// PUT /admin/permissions/:id
router.put(
  "/permissions/:id",
  adminAuthMiddleware,
  checkPermission("permission.edit"),
  async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res
        .status(400)
        .send(HelperUtils.errorObj("Permission name is required"));
    }

    try {
      const permission = await Permissions.findByPk(id);
      if (!permission) {
        return res
          .status(400)
          .send(HelperUtils.errorObj("Permission not found"));
      }
      const role = req.user.roles;
      if (!role.includes("SuperAdmin")) {
        return res
          .status(401)
          .send(
            HelperUtils.errorObj(
              "Access denied. only super admin can edit this data."
            )
          );
      }
      await permission.update({ name, description });

      res.status(200).send(
        HelperUtils.successObj("Permission updated successfully", {
          id: permission.id,
          name: permission.name,
          description: permission.description,
        })
      );
    } catch (err) {
      console.error("Error updating permission:", err);
      res.status(500).send(HelperUtils.errorObj("Failed to update permission"));
    }
  }
);

// DELETE /admin/permissions/:id
router.delete(
  "/permissions/:id",
  adminAuthMiddleware,
  checkPermission("permission.delete"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const roles = req.user.roles;
      if (!roles.includes("SuperAdmin")) {
        return res
          .status(400)
          .send(
            HelperUtils.errorObj(
              "Access denied. Only SuperAdmin can delete permissions."
            )
          );
      }

      const permission = await Permissions.findByPk(id, {
        include: {
          model: Roles,
          as: "Roles",
          through: { attributes: [] },
        },
      });

      if (!permission) {
        return res
          .status(400)
          .send(HelperUtils.errorObj("Permission not found"));
      }

      if (permission.Roles && permission.Roles.length > 0) {
        return res
          .status(400)
          .send(
            HelperUtils.errorObj(
              "Cannot delete permission. It is currently assigned to one or more roles."
            )
          );
      }

      await permission.destroy();

      res
        .status(200)
        .send(HelperUtils.successObj("Permission deleted successfully"));
    } catch (err) {
      console.error("Error deleting permission:", err);
      res.status(500).send(HelperUtils.errorObj("Failed to delete permission"));
    }
  }
);

// POST /admin/roles/:id/assign-permissions
router.post(
  "/roles/:id/assign-permissions",
  adminAuthMiddleware,
  checkPermission("role.assign_permission"),
  async (req, res) => {
    const { id } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      return res
        .status(400)
        .send(HelperUtils.errorObj("permissionIds must be a non-empty array."));
    }

    try {
      const UserrolesName = req.user.roles;
      if (!UserrolesName.includes("SuperAdmin")) {
        return res
          .status(400)
          .send(
            HelperUtils.errorObj(
              "Access denied. Only SuperAdmin can delete permissions."
            )
          );
      }
      const role = await Roles.findByPk(id, {
        include: {
          model: Permissions,
          as: "Permissions",
          through: { attributes: [] },
        },
      });

      if (!role) {
        return res.status(400).send(HelperUtils.errorObj("Role not found."));
      }

      // Validate incoming permission IDs
      const validPermissions = await Permissions.findAll({
        where: { id: permissionIds },
      });
      const validIds = validPermissions.map((p) => p.id);

      if (validIds.length !== permissionIds.length) {
        const invalidIds = permissionIds.filter(
          (pid) => !validIds.includes(pid)
        );
        return res
          .status(400)
          .send(
            HelperUtils.errorObj(
              `Invalid permission IDs: [${invalidIds.join(", ")}]`
            )
          );
      }

      // Get current permission IDs already assigned
      const currentIds = role.Permissions.map((p) => p.id);

      // Calculate permissions to add and remove
      const toAdd = validIds.filter((id) => !currentIds.includes(id));
      const toRemove = currentIds.filter((id) => !validIds.includes(id));

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
          as: "Permissions",
          through: { attributes: [] },
        },
      });

      res.status(200).send(
        HelperUtils.successObj("Permissions updated successfully", {
          role: {
            id: updatedRole.id,
            name: updatedRole.name,
            description: updatedRole.description,
            permissions: updatedRole.Permissions.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
            })),
          },
        })
      );
      // res.status(200).send(HelperUtils.successObj("Permissions updated successfully", {
      //   added: toAdd,
      //   removed: toRemove,
      //   kept: validIds.filter(id => currentIds.includes(id))
      // }));
    } catch (err) {
      console.error("Error assigning permissions:", err);
      res
        .status(500)
        .send(HelperUtils.errorObj("Failed to update permissions."));
    }
  }
);

// POST /admin/xp/calculate-daily
router.post("/xp/calculate-daily", adminAuthMiddleware, async (req, res) => {
  try {
    const { date } = req.body;
    const calcDate = date || new Date().toISOString().split("T")[0];

    const attributes = await UserAttribute.findAll({
      where: { date: calcDate },
    });

    for (const attr of attributes) {
      const xp = Math.round(
        50 *
        (0.15 * (attr.attendance / 100) +
          0.15 * (attr.punctuality / 100) +
          0.2 * (attr.communication / 100) +
          0.25 * (attr.cooperation / 100) +
          0.25 * (attr.ownership / 100))
      );

      await UserXpLog.create({
        userId: attr.userId,
        season_id: null, // Global XP not tied to specific season
        source: "attribute",
        type: "daily_xp",
        xp,
        date: calcDate,
        description: "Daily XP from attributes",
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
          lastUpdatedAt: new Date(),
        });
      }
    }

    res.status(200).send(HelperUtils.successObj("XP calculated successfully"));
  } catch (err) {
    console.error("XP calc error:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to calculate XP"));
  }
});

// Create a new user
router.post("/users/create", adminAuthMiddleware, async (req, res) => {
  try {
    const { firstname, lastname, email, roleId, password, userCode } = req.body;
    if (!firstname || !lastname || !email || !roleId || !password) {
      return res
        .status(400)
        .send(
          HelperUtils.errorObj(
            "First name, last name, email, role, and password are required"
          )
        );
    }

    const existingUser = await Users.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).send(HelperUtils.errorObj("User already exists"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const name = `${firstname} ${lastname}`;
    const roleData = await Roles.findOne({ where: { id: roleId } });
    if (!roleData) {
      return res.status(400).send(HelperUtils.errorObj("Role not found"));
    }
    let randomEmployerCode;

    if (parseInt(roleId) === 3 && userCode === "") {
      let isUnique = false;

      while (!isUnique) {
        const randomFourDigits = Math.floor(1000 + Math.random() * 9000);
        randomEmployerCode = `EMP${randomFourDigits}`;

        const existingEmployer = await Users.findOne({
          where: { employerCode: randomEmployerCode },
        });

        if (!existingEmployer) {
          isUnique = true;
        }
      }
    }

    const user = await Users.create({
      name,
      email,
      status: "active",
      password: hashedPassword,
      userCode: userCode || null,
      employerCode: randomEmployerCode || null,
    });
    await UserRoles.create({
      userId: user.id,
      roleId: roleData.id,
    });
    // // Assign default permissions to the user based on their role
    // const permissions = await roleData.getPermissions();
    // for (const permission of permissions) {
    //   await sequelize.models.UserPermissions.create({
    //     userId: user.id,
    //     permissionId: permission.id,
    //   });
    // }

    res
      .status(201)
      .send(HelperUtils.successObj("User created successfully", user));
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to create user"));
  }
});

// Get Users and roles with there permissions.
router.get("/all-users", adminAuthMiddleware, async (req, res) => {
  try {
    const users = await Users.findAll({
      include: [
        {
          model: Roles,
          as: "Roles",
          through: { attributes: [] },
          include: [
            {
              model: Permissions,
              as: "Permissions",
              through: { attributes: [] },
            },
          ],
        },
      ],
      where: {
        isDeleted: 0,
      },
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      employerCode: user.employerCode,
      roles: user.Roles.map((role) => ({
        id: role.id,
        name: role.name,
        permissions: role.Permissions.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      })),
    }));

    res
      .status(200)
      .send(
        HelperUtils.successObj("Users fetched successfully", formattedUsers)
      );
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to fetch users"));
  }
});

// Edit user
router.put("/users/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status, roleId } = req.body;

    const user = await Users.findByPk(id);
    if (!user) {
      return res.status(404).send(HelperUtils.errorObj("User not found"));
    }
    await user.update({
      name,
      email,
      status,
    });

    // Update user role if provided
    if (roleId) {
      const role = await Roles.findByPk(roleId);
      if (!role) {
        return res.status(400).send(HelperUtils.errorObj("Role not found"));
      }

      // Assign new role
      await UserRoles.update(
        {
          userId: user.id,
          roleId: role.id,
        },
        { where: { userId: user.id } }
      );
    }

    res
      .status(200)
      .send(HelperUtils.successObj("User updated successfully", user));
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to update user"));
  }
});

// Soft Delete user
router.delete("/users/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Users.findByPk(id);
    if (!user) {
      return res.status(404).send(HelperUtils.errorObj("User not found"));
    }
    console.log({ id });
    await user.update({ isDeleted: 1 });

    res.status(200).send(HelperUtils.successObj("User deleted successfully"));
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to delete user"));
  }
});

// Create a new role with permissions
router.post("/roles/create", adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res
        .status(400)
        .send(HelperUtils.errorObj("Role name is required"));
    }
    if (!description) {
      return res
        .status(400)
        .send(HelperUtils.errorObj("Description is required"));
    }
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res
        .status(400)
        .send(HelperUtils.errorObj("Permissions must be a non-empty array"));
    }
    const Userrole = req.user.roles;
    if (!Userrole.includes("SuperAdmin")) {
      return res
        .status(401)
        .send(
          HelperUtils.errorObj(
            "Access denied. only super admin can create this data."
          )
        );
    }

    const role = await Roles.create({ name, description });

    // Create the entry in the RolePermissions table
    const rolePermissionsData = permissions.map((permissionId) => ({
      roleId: role.id,
      permissionId,
    }));
    console.log({ rolePermissionsData });
    const createdPermissions = await RolePermissions.bulkCreate(
      rolePermissionsData
    );
    if (!createdPermissions) {
      return res
        .status(500)
        .send(HelperUtils.errorObj("Failed to create role permissions"));
    }

    res
      .status(201)
      .send(HelperUtils.successObj("Role created successfully", role));
  } catch (err) {
    console.error("Error creating role:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to create role"));
  }
});

// Get All Employers
router.get("/employers", adminAuthMiddleware, async (req, res) => {
  try {
    const employers = await Users.findAll({
      where: {
        employerCode: {
          [Op.ne]: null,
        },
      },
    });

    res
      .status(200)
      .send(
        HelperUtils.successObj("Employers fetched successfully", employers)
      );
  } catch (err) {
    console.error("Error fetching employers:", err);
    res.status(500).send(HelperUtils.errorObj("Unable to fetch employers"));
  }
});

// Get All Users with Employer Code
router.get(
  "/users-with-employer-code/:employerCode",
  adminAuthMiddleware,
  async (req, res) => {
    try {
      const { employerCode } = req.params;
      if (!employerCode) {
        return res
          .status(400)
          .send(HelperUtils.errorObj("Employer code is required"));
      }
      const users = await Users.findAll({
        where: {
          userCode: {
            [Op.eq]: employerCode,
          },
        },
      });

      res
        .status(200)
        .send(
          HelperUtils.successObj(
            "Users with Employer Code fetched successfully",
            users
          )
        );
    } catch (err) {
      console.error("Error fetching users with employer code:", err);
      res.status(500).send(HelperUtils.errorObj("Unable to fetch users"));
    }
  }
);

// Save User Weights
router.post("/users/weights", adminAuthMiddleware, async (req, res) => {
  try {
    const { emp_Id, attendance, punctuality, shift_compliance, consistency } =
      req.body;
    console.log({
      emp_Id,
      attendance,
      punctuality,
      shift_compliance,
      consistency,
    });
    const existingWeights = await Weights.findOne({
      where: { emp_Id },
    });

    let attributes;

    if (existingWeights) {
      attributes = await existingWeights.update({
        attendance,
        punctuality,
        shift_compliance,
        consistency,
      });
    } else {
      attributes = await Weights.create({
        emp_Id,
        attendance,
        punctuality,
        shift_compliance,
        consistency,
      });
    }

    res
      .status(200)
      .send(
        HelperUtils.successObj(
          existingWeights
            ? "Weights updated successfully"
            : "Weights created successfully",
          attributes
        )
      );
  } catch (err) {
    console.error("Error saving weights:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to save weights"));
  }
});

// Get User Weights
router.get("/users/weights/:emp_Id", adminAuthMiddleware, async (req, res) => {
  try {
    const { emp_Id } = req.params;
    if (!emp_Id) {
      return res
        .status(400)
        .send(HelperUtils.errorObj("Employee ID is required"));
    }
    const attributes = await Weights.findAll({
      where: { emp_Id },
    });

    res
      .status(200)
      .send(
        HelperUtils.successObj("Attributes fetched successfully", attributes)
      );
  } catch (err) {
    console.error("Error fetching user attributes:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to fetch attributes"));
  }
});

router.post(
  "/rewards/create",
  adminAuthMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const { name, description, reward_state } = req.body;
      const file = req.file;
      if (!name) {
        return res.status(400).send(HelperUtils.errorObj("Name is required"));
      }

      const reward = await Rewards.create({
        name,
        description,
        reward_state,
        filename: file ? file.filename : null,
      });

      res
        .status(201)
        .send(HelperUtils.successObj("Reward created successfully", reward));
    } catch (err) {
      console.error("Error creating reward:", err);
      res.status(500).send(HelperUtils.errorObj("Failed to create reward"));
    }
  }
);

// Get Spin Wheel Reward Winners (Admin only - only rewards, not XP)
router.get("/rewards/spin-wheel-winners", adminAuthMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, wheelType, dateFrom, dateTo } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause for rewards only
    const whereClause = {
      source: 'game',
      reward_type: 'reward',  // Only rewards, not XP
      type: {
        [Op.like]: 'wheel_spin_%'
      }
    };

    // Filter by wheel type if provided
    if (wheelType) {
      whereClause.type = `wheel_spin_${wheelType}`;
    }

    // Filter by date range if provided
    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) {
        whereClause.date[Op.gte] = dateFrom;
      }
      if (dateTo) {
        whereClause.date[Op.lte] = dateTo;
      }
    }

    // Get the rewards without joins first
    const rewardWinners = await UserXpLog.findAndCountAll({
      where: whereClause,
      attributes: [
        'id',
        'userId',
        'reward_type',
        'reward_value',
        'type',
        'date',
        'description',
        'season_id',
        'xp'
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get user details separately for each reward log
    const userIds = rewardWinners.rows.map(log => log.userId);
    const users = await Users.findAll({
      where: {
        id: userIds
      },
      attributes: ['id', 'name', 'email', 'userCode']
    });

    // Create a map for quick user lookup
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    // Format the response
    const formattedWinners = rewardWinners.rows.map(log => {
      const user = userMap[log.userId];
      return {
        id: log.id,
        user_name: user?.name || 'Unknown User',
        user_email: user?.email || 'Unknown Email',
        user_code: user?.userCode || 'Unknown Code',
        user_id: log.userId,
        reward_type: log.reward_type,
        reward_value: log.reward_value,
        description: log.description,
        type: log.type,
        date: log.date,
        xp_earned: log.xp || 0,
        season_id: log.season_id,
        created_at: log.date
      };
    });

    res.status(200).send(
      HelperUtils.successObj("Spin wheel reward winners retrieved successfully", {
        success: true,
        data: formattedWinners,
        pagination: {
          currentPage: parseInt(page),
          pageSize: parseInt(limit),
          totalRecords: rewardWinners.count,
          totalPages: Math.ceil(rewardWinners.count / limit),
          hasNextPage: parseInt(page) < Math.ceil(rewardWinners.count / limit),
          hasPreviousPage: parseInt(page) > 1
        },
        filters: {
          wheelType: wheelType || 'all',
          dateFrom,
          dateTo
        }
      })
    );
  } catch (error) {
    console.error("Error fetching spin wheel reward winners:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to fetch spin wheel reward winners")
    );
  }
});

// Get All Rewards
router.get("/rewards", adminAuthMiddleware, async (req, res) => {
  try {
    const { reward_state } = req.query;

    const whereClause = reward_state ? { reward_state } : {};

    const rewards = await Rewards.findAll({
      where: whereClause,
      attributes: [
        "id",
        "name",
        "description",
        "reward_state",
        "filename",
        "winner_id",
      ],
    });

    const formattedRewards = rewards.map((reward) => ({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      reward_state: reward.reward_state,
      filename: reward.filename
        ? `https://workwin.24livehost.com:3025/uploads/${reward.filename}`
        : null,
      winner_id: reward.winner_id ? reward.winner_id : null,
    }));

    res
      .status(200)
      .send(
        HelperUtils.successObj("Rewards fetched successfully", formattedRewards)
      );
  } catch (err) {
    console.error("Error fetching rewards:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to fetch rewards"));
  }
});

// update Reward
router.put(
  "/rewards/:id",
  adminAuthMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, reward_state } = req.body;
      const file = req.file;

      const reward = await Rewards.findByPk(id);
      if (!reward) {
        return res.status(404).send(HelperUtils.errorObj("Reward not found"));
      }

      await reward.update({
        name,
        description,
        reward_state,
        filename: file ? file.filename : reward.filename,
      });

      res
        .status(200)
        .send(HelperUtils.successObj("Reward updated successfully", reward));
    } catch (err) {
      console.error("Error updating reward:", err);
      res.status(500).send(HelperUtils.errorObj("Failed to update reward"));
    }
  }
);

// Delete Reward
router.delete("/rewards/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const reward = await Rewards.findByPk(id);
    if (!reward) {
      return res.status(404).send(HelperUtils.errorObj("Reward not found"));
    }

    await reward.destroy();

    res.status(200).send(HelperUtils.successObj("Reward deleted successfully"));
  } catch (err) {
    console.error("Error deleting reward:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to delete reward"));
  }
});

router.get("/leaderboard", adminAuthMiddleware, async (req, res) => {
  try {
    const { employerCode } = req.query;

    // Build the where condition
    let whereCondition = {};
    if (employerCode) {
      whereCondition.userCode = employerCode;
    }

    const leaderboardUsers = await Users.findAll({
      where: whereCondition,
      include: [
        {
          model: Roles,
          as: "Roles",
          where: { name: "User" },
          through: { attributes: [] },
          attributes: [], // ✅ Do not return Roles in result
        },
      ],
      attributes: ["id", "name", "email", "userCode", "curr_levels", "totalUserXp"],
      order: [["totalUserXp", "DESC"]],
      // limit: 10
    });

    res
      .status(200)
      .send(
        HelperUtils.successObj(
          "Leaderboard fetch successfully.",
          leaderboardUsers
        )
      );
  } catch (err) {
    console.error("Error in leaderboard API:", err);
    res.status(500).send(HelperUtils.errorObj("Something went wrong"));
  }
});

// Assign reward to the user
router.post("/rewards/assign", adminAuthMiddleware, async (req, res) => {
  try {
    const { userId, rewardId } = req.body;

    if (!rewardId) {
      return res
        .status(400)
        .send(HelperUtils.errorObj("Reward ID are required"));
    }

    if (userId !== null) {
      const user = await Users.findByPk(userId);
      if (!user) {
        return res.status(404).send(HelperUtils.errorObj("User not found"));
      }

      const reward = await Rewards.findByPk(rewardId);
      if (!reward) {
        return res.status(404).send(HelperUtils.errorObj("Reward not found"));
      }

      // Check if the user already has this reward
      const existingReward = await Rewards.findOne({
        where: { winner_id: userId, id: rewardId },
      });
      if (existingReward) {
        return res
          .status(400)
          .send(HelperUtils.errorObj("User already has this reward"));
      }
    }

    // Assign the reward to the user
    await Rewards.update(
      {
        winner_id: userId,
      },
      {
        where: {
          id: rewardId,
        },
      }
    );

    res
      .status(200)
      .send(HelperUtils.successObj("Reward assigned successfully"));
  } catch (err) {
    console.error("Error assigning reward:", err);
    res.status(500).send(HelperUtils.errorObj("Failed to assign reward"));
  }
});

router.get(
  "/progress-report/:userId",
  adminAuthMiddleware,
  async (req, res) => {
    try {
      const { userId } = req.params;

      const userRewards = await Rewards.findAll({
        where: { winner_id: userId },
      });

      const userDetails = await Users.findByPk(userId, {
        attributes: ["id", "name", "email", "curr_levels", "totalUserXp"],
      });

      res
        .status(200)
        .send(
          HelperUtils.successObj("Progress fetched successfully", {
            userDetails,
            userRewards,
          })
        );
    } catch (err) {
      console.error("Error fetching user progress:", err);
      res
        .status(500)
        .send(HelperUtils.errorObj("Failed to fetch user progress"));
    }
  }
);

// Upload Excel File
router.post("/users/excel-upload", adminAuthMiddleware, upload.single("file"), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const hasValue = (value) => {
      return value !== null && value !== undefined && value !== "";
    };

    // Season bonus configuration - based on consecutive perfect weeks
    const SEASON_BONUS_CONFIG = {
      milestones: [
        { perfectWeeks: 1, bonus: 250 },   // 1 perfect week = 250 XP
        { perfectWeeks: 2, bonus: 500 },   // 2 consecutive perfect weeks = 500 XP  
        { perfectWeeks: 3, bonus: 750 },   // 3 consecutive perfect weeks = 750 XP
        { perfectWeeks: 4, bonus: 1000 },  // 4 consecutive perfect weeks = 1000 XP
        { perfectWeeks: 5, bonus: 1000 }   // 5 consecutive perfect weeks = 1000 XP
      ]
    };

    // Function to calculate season bonus XP based on consecutive perfect weeks
    const calculateSeasonBonus = async (empCode, email, currentWeekPerfect, transaction) => {
      if (!currentWeekPerfect) {
        // If current week is not perfect, no bonus and reset streak
        return {
          bonusXP: 0,
          consecutivePerfectWeeks: 0
        };
      }

      // Get all previous records to count consecutive perfect weeks (using both empCode and email)
      const previousRecords = await EmployeeXpResults.findAll({
        where: {
          [Op.and]: [
            { emp_code: empCode },
            { email: email }
          ]
        },
        order: [["week_start_date", "DESC"]],
        attributes: ['total_days_present'],
        transaction
      });

      // Count consecutive perfect weeks from most recent backwards
      let consecutivePerfectWeeks = 1; // Current week is perfect

      for (const record of previousRecords) {
        if (record.total_days_present === 7) {
          consecutivePerfectWeeks++;
        } else {
          break; // Stop at first non-perfect week
        }
      }

      // Find the bonus for current consecutive perfect weeks
      let bonusXP = 0;
      for (const milestone of SEASON_BONUS_CONFIG.milestones) {
        if (consecutivePerfectWeeks >= milestone.perfectWeeks) {
          bonusXP = milestone.bonus;
        }
      }

      return {
        bonusXP: bonusXP,
        consecutivePerfectWeeks: consecutivePerfectWeeks
      };
    };

    // Updated XP calculation with penalty based on missing days
    const calculateXP = (employeeData, multiplier = 1) => {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const xpPerDay = 2500;
      const penaltyPerMissingDay = 1000; // Penalty is 1000 XP per missing day
      let baseXP = 0;
      let attendanceDetails = {};
      let perfectAttendance = true;
      let daysPresent = 0;
      let daysMissing = 0;

      days.forEach((day) => {
        const inTime = employeeData[`${day}_In`];
        const outTime = employeeData[`${day}_Out`];

        if (hasValue(inTime) && hasValue(outTime)) {
          baseXP += xpPerDay;
          daysPresent++;
          attendanceDetails[day.toLowerCase()] = {
            present: true,
            hours: employeeData[`${day}_Hours`] || 0
          };
        } else {
          daysMissing++;
          attendanceDetails[day.toLowerCase()] = {
            present: false,
            hours: 0
          };
          perfectAttendance = false;
        }
      });

      // Apply multiplier to base XP
      let totalXP = baseXP * multiplier;

      // Apply penalty: number of missing days * 1000
      let penaltyApplied = 0;
      if (daysMissing > 0) {
        penaltyApplied = daysMissing * penaltyPerMissingDay;
        totalXP -= penaltyApplied;
      }

      // Ensure XP cannot be negative - if negative, set to 0
      if (totalXP < 0) {
        totalXP = 0;
      }

      return {
        baseXP,
        totalXP,
        attendanceDetails,
        perfectAttendance,
        penaltyApplied: -penaltyApplied, // Show as negative for display purposes
        multiplierUsed: multiplier,
        daysPresent,
        daysMissing
      };
    };

    // Function to calculate streak within a week
    const calculateCurrentWeekStreak = (attendanceDetails) => {
      const daysOrder = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      let maxStreak = 0;
      let currentStreak = 0;

      for (const day of daysOrder) {
        if (attendanceDetails[day] && attendanceDetails[day].present) {
          currentStreak += 1;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      return maxStreak;
    };

    // Function to calculate overall streak (considering previous weeks)
    const calculateOverallStreak = async (empCode, email, currentWeekAttendance, transaction) => {
      const currentWeekStreak = calculateCurrentWeekStreak(currentWeekAttendance);

      // Get the most recent record for this specific employee (using both empCode and email)
      const latestRecord = await EmployeeXpResults.findOne({
        where: {
          [Op.and]: [
            { emp_code: empCode },
            { email: email }
          ]
        },
        order: [["upload_date", "DESC"]],
        transaction
      });

      if (!latestRecord) {
        return {
          currentStreak: currentWeekStreak,
          maxStreak: currentWeekStreak
        };
      }

      const previousDaysOrder = ["saturday", "friday", "thursday", "wednesday", "tuesday", "monday", "sunday"];
      let lastDayPresent = false;

      for (const day of previousDaysOrder) {
        const dayPresent = latestRecord[`${day}_present`];
        if (dayPresent !== null) {
          lastDayPresent = dayPresent;
          break;
        }
      }

      let newCurrentStreak;
      if (lastDayPresent && currentWeekAttendance.sun.present) {
        newCurrentStreak = latestRecord.current_streak + currentWeekStreak;
      } else if (currentWeekStreak > 0) {
        newCurrentStreak = currentWeekStreak;
      } else {
        newCurrentStreak = 0;
      }

      const newMaxStreak = Math.max(latestRecord.max_streak, newCurrentStreak);

      return {
        currentStreak: newCurrentStreak,
        maxStreak: newMaxStreak
      };
    };

    // Function to update user level and badges based on new XP
    const updateUserLevelAndBadges = async (empCode, email, weeklyAttendanceXP, transaction) => {
      try {
        // Find the user by both employee code AND email for unique identification
        const user = await Users.findOne({
          where: {
            [Op.and]: [
              { userCode: empCode },
              { email: email }
            ]
          },
          transaction
        });

        if (!user) {
          console.warn(`User not found for employee code: ${empCode} and email: ${email}`);
          return {
            updated: false,
            reason: 'User not found'
          };
        }

        // Get current total XP from users table (includes XP from all sources: login, registration, spin wheel, etc.)
        const currentTotalUserXp = user.totalUserXp || 0;

        // Add new weekly attendance XP to existing total XP
        const newTotalXp = currentTotalUserXp + weeklyAttendanceXP;

        console.log(`User ${empCode} XP Update: Current: ${currentTotalUserXp}, Weekly Attendance: ${weeklyAttendanceXP}, New Total: ${newTotalXp}`);

        // Calculate new level based on total XP
        const newLevel = xpBadgeSystem.calculateLevel(newTotalXp);
        const xpForNext = xpBadgeSystem.getXpForNextLevel(newLevel);
        const currentLevelXp = newLevel > 1 ? xpBadgeSystem.getXpForNextLevel(newLevel - 1) : 0;
        const progress = newTotalXp >= xpForNext ? 100 : ((newTotalXp - currentLevelXp) / (xpForNext - currentLevelXp)) * 100;

        // Get badge progress
        const badgeProgress = xpBadgeSystem.getBadgeProgress(newTotalXp);
        const earnedBadges = xpBadgeSystem.getEarnedBadges(newTotalXp);

        // Update or create UserLevel record
        const [userLevel, created] = await UserLevel.findOrCreate({
          where: { userId: user.id },
          defaults: {
            userId: user.id,
            season_id: null, // Global level not tied to specific season
            totalXp: newTotalXp,
            level: newLevel,
            xpForNext: xpForNext,
            progress: Math.min(progress, 100),
            lastUpdatedAt: new Date()
          },
          transaction
        });

        if (!created) {
          // Update existing record
          const oldLevel = userLevel.level;
          const leveledUp = newLevel > oldLevel;

          await userLevel.update({
            totalXp: newTotalXp,
            level: newLevel,
            xpForNext: xpForNext,
            progress: Math.min(progress, 100),
            lastUpdatedAt: new Date()
          }, { transaction });

          // Update the main users table with new TOTAL XP (adding to existing)
          await user.update({
            totalUserXp: newTotalXp,
            curr_levels: newLevel
          }, { transaction });

          return {
            updated: true,
            userId: user.id,
            empCode: empCode,
            oldLevel: oldLevel,
            newLevel: newLevel,
            leveledUp: leveledUp,
            oldTotalXp: currentTotalUserXp,
            weeklyXpAdded: weeklyAttendanceXP,
            newTotalXp: newTotalXp,
            currentBadge: badgeProgress.currentBadge,
            earnedBadges: earnedBadges.length,
            badgeProgress: badgeProgress.progress,
            xpToNextBadge: badgeProgress.xpToNext
          };
        } else {
          // Update the main users table with new TOTAL XP for new user
          await user.update({
            totalUserXp: newTotalXp,
            curr_levels: newLevel
          }, { transaction });

          return {
            updated: true,
            userId: user.id,
            empCode: empCode,
            oldLevel: 0,
            newLevel: newLevel,
            leveledUp: true,
            oldTotalXp: currentTotalUserXp,
            weeklyXpAdded: weeklyAttendanceXP,
            newTotalXp: newTotalXp,
            currentBadge: badgeProgress.currentBadge,
            earnedBadges: earnedBadges.length,
            badgeProgress: badgeProgress.progress,
            xpToNextBadge: badgeProgress.xpToNext,
            isNewUser: true
          };
        }
      } catch (error) {
        console.error(`Error updating user level for ${empCode}:`, error);
        return {
          updated: false,
          reason: error.message
        };
      }
    };

    // Function to log XP gain for attendance
    const logAttendanceXp = async (empCode, email, weeklyXp, seasonBonusXp, weekStartDate, description, transaction) => {
      try {
        const user = await Users.findOne({
          where: {
            [Op.and]: [
              { userCode: empCode },
              { email: email }
            ]
          },
          transaction
        });

        if (!user) return;

        // Log base attendance XP
        if (weeklyXp > 0) {
          await UserXpLog.create({
            userId: user.id,
            season_id: null, // Global attendance XP
            source: 'attribute',
            type: 'weekly_attendance',
            xp: weeklyXp,
            date: weekStartDate || new Date().toISOString().split('T')[0],
            description: description || `Weekly attendance XP for week starting ${weekStartDate}`
          }, { transaction });
        }

        // Log season bonus XP separately if applicable
        if (seasonBonusXp > 0) {
          await UserXpLog.create({
            userId: user.id,
            season_id: null, // Global season bonus XP
            source: 'attribute',
            type: 'season_bonus',
            xp: seasonBonusXp,
            date: weekStartDate || new Date().toISOString().split('T')[0],
            description: `Season bonus XP: ${seasonBonusXp} points for consecutive perfect weeks`
          }, { transaction });
        }
      } catch (error) {
        console.error(`Error logging XP for ${empCode}:`, error);
      }
    };

    // Function to extract actual week dates from Excel data
    const extractWeekDatesFromData = (rawData) => {
      // Look for week_start_date and related columns in the first valid row
      const firstRowWithWeekData = rawData.find(row =>
        row.week_start_date || row.Week_Start_Date || row['Week Start Date'] ||
        row.Sun_In || row.Mon_In || row.Tue_In // Also check for attendance date columns
      );
      if (firstRowWithWeekData) {
        // Try to get week_start_date directly from the column
        const weekStartRaw = firstRowWithWeekData.week_start_date ||
          firstRowWithWeekData.Week_Start_Date ||
          firstRowWithWeekData['Week Start Date'];

        if (weekStartRaw) {
          const formatDate = (dateValue) => {
            if (!dateValue) return null;

            // If it's already a date object
            if (dateValue instanceof Date) {
              const y = dateValue.getFullYear();
              const m = String(dateValue.getMonth() + 1).padStart(2, '0');
              const d = String(dateValue.getDate()).padStart(2, '0');
              // Format using local calendar values to avoid UTC shift
              return `${y}-${m}-${d}`;
            }

            // If it's a string in DD-MM-YYYY format (like "28-09-2025 00:00")
            if (typeof dateValue === 'string') {
              // Handle DD-MM-YYYY HH:MM format
              const ddmmyyyyMatch = dateValue.match(/(\d{2})-(\d{2})-(\d{4})/);
              if (ddmmyyyyMatch) {
                const [, day, month, year] = ddmmyyyyMatch;
                // Create YYYY-MM-DD string directly without Date object to avoid timezone issues
                const result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                console.log(`Parsed Excel date: ${dateValue} -> ${result} (direct string conversion, no timezone offset)`);
                return result;
              }

              // Try standard date parsing
              const parsed = new Date(dateValue);
              if (!isNaN(parsed.getTime())) {
                const y = parsed.getFullYear();
                const m = String(parsed.getMonth() + 1).padStart(2, '0');
                const d = String(parsed.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
              }
            }

            // If it's an Excel serial number (common in Excel exports)
            if (typeof dateValue === 'number' && dateValue > 40000) {
              const excelEpoch = new Date(1900, 0, 1);
              const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
            }

            return null;
          };

          const weekStart = formatDate(weekStartRaw);
          if (weekStart) {
            // Use the week_start_date from Excel directly - don't recalculate
            // The Excel already contains the correct week start date
            const startDate = new Date(weekStart);
            const weekEnd = new Date(startDate);
            weekEnd.setDate(startDate.getDate() + 6);

            return {
              weekStart: weekStart, // Use exactly what's in the Excel
              weekEnd: weekEnd.toISOString().split('T')[0],
              source: 'excel_data'
            };
          }
        }

        // Fallback: try to derive from attendance date columns
        // Look for Sun_In, Mon_In, etc. columns that contain dates
        const attendanceDateColumns = ['Sun_In', 'Mon_In', 'Tue_In', 'Wed_In', 'Thu_In', 'Fri_In', 'Sat_In'];

        for (const dateCol of attendanceDateColumns) {
          const dateValue = firstRowWithWeekData[dateCol];
          if (dateValue) {
            const formatAttendanceDate = (dateValue) => {
              if (!dateValue) return null;

              // Handle DD-MM-YYYY HH:MM format (like "28-09-2025 05:20")
              if (typeof dateValue === 'string') {
                const ddmmyyyyMatch = dateValue.match(/(\d{2})-(\d{2})-(\d{4})/);
                if (ddmmyyyyMatch) {
                  const [, day, month, year] = ddmmyyyyMatch;
                  // Create date using UTC to avoid timezone conversion issues
                  const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
                  if (!isNaN(date.getTime())) {
                    console.log(`Parsed attendance date: ${dateValue} -> Day: ${date.getUTCDay()} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getUTCDay()]})`);
                    return date;
                  }
                }
              }

              // Try other formats
              if (dateValue instanceof Date) {
                return dateValue;
              } else if (typeof dateValue === 'string') {
                const parsed = new Date(dateValue);
                if (!isNaN(parsed.getTime())) {
                  return parsed;
                }
              } else if (typeof dateValue === 'number' && dateValue > 40000) {
                const excelEpoch = new Date(1900, 0, 1);
                return new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
              }

              return null;
            };

            const parsedDate = formatAttendanceDate(dateValue);
            if (parsedDate) {
              console.log(`Processing attendance date: ${dateValue}`);
              console.log(`Parsed date: ${parsedDate.toISOString()} (Day of week: ${parsedDate.getDay()} - ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parsedDate.getDay()]})`);

              // Calculate week start (Sunday) and end (Saturday) from this date using UTC
              const weekStart = new Date(parsedDate);
              const dayOfWeek = parsedDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
              weekStart.setUTCDate(parsedDate.getUTCDate() - dayOfWeek);
              weekStart.setUTCHours(0, 0, 0, 0);

              const weekEnd = new Date(weekStart);
              weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
              weekEnd.setUTCHours(23, 59, 59, 999);

              console.log(`Calculated week start: ${weekStart.toISOString().split('T')[0]} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekStart.getUTCDay()]})`);
              console.log(`Calculated week end: ${weekEnd.toISOString().split('T')[0]} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekEnd.getUTCDay()]})`);

              return {
                weekStart: weekStart.toISOString().split('T')[0],
                weekEnd: weekEnd.toISOString().split('T')[0],
                source: 'derived_from_attendance_dates'
              };
            }
          }
        }
      }

      return null; // Could not extract dates from data
    };

    const weekStartDate = req.body.weekStartDate || null;
    const weekEndDate = req.body.weekEndDate || null;
    const uploadedBy = req.user?.id || null;

    // Try to extract actual week dates from Excel data first
    const extractedDates = extractWeekDatesFromData(rawData);

    // Determine final week dates with priority:
    // 1. Explicit dates from request body
    // 2. Dates extracted from Excel data
    // 3. Auto-calculated current week dates (fallback)
    let calculatedWeekStart = weekStartDate;
    let calculatedWeekEnd = weekEndDate;

    console.log(calculatedWeekStart, calculatedWeekEnd)
    let dateSource = 'manual';

    if (!weekStartDate || !weekEndDate) {
      if (extractedDates) {
        calculatedWeekStart = calculatedWeekStart || extractedDates.weekStart;
        calculatedWeekEnd = calculatedWeekEnd || extractedDates.weekEnd;
        dateSource = extractedDates.source;
      } else {
        // Fallback to auto-calculated current week dates
        const currentDate = new Date();

        // Calculate current week start (Sunday) and end (Saturday) using UTC
        const autoWeekStart = new Date(currentDate);
        autoWeekStart.setUTCDate(currentDate.getUTCDate() - currentDate.getUTCDay()); // Set to Sunday using UTC
        autoWeekStart.setUTCHours(0, 0, 0, 0);

        const autoWeekEnd = new Date(autoWeekStart);
        autoWeekEnd.setUTCDate(autoWeekStart.getUTCDate() + 6); // Set to Saturday using UTC
        autoWeekEnd.setUTCHours(23, 59, 59, 999);

        // Use auto-calculated dates if not provided
        calculatedWeekStart = calculatedWeekStart || autoWeekStart.toISOString().split('T')[0];
        calculatedWeekEnd = calculatedWeekEnd || autoWeekEnd.toISOString().split('T')[0];
        dateSource = 'auto_calculated';
      }
    }

    const processedEmployees = [];

    for (const row of rawData.filter(r => r.Person)) {
      const empCode = row.EmployeeCode || row.emp_code;
      const email = row.Email;
      const fullName = `${row.Firstname || ""} ${row.Surname || ""}`.trim();

      // Normalize identifiers to avoid mismatches due to spaces/case
      const normEmpCode = (empCode || '').trim();
      const normEmail = (email || '').trim().toLowerCase();

      // Get the latest record to check for existing data and multiplier (using both empCode and email)
      const latestRecord = await EmployeeXpResults.findOne({
        where: {
          [Op.and]: [
            { emp_code: normEmpCode },
            { email: normEmail }
          ]
        },
        order: [["upload_date", "DESC"]],
        transaction
      });

      // Get multiplier from latest record or default to 1
      const currentMultiplier = latestRecord ? latestRecord.multiplier : 1;

      // Calculate XP with current multiplier
      const xpCalculation = calculateXP(row, currentMultiplier);

      // Check if current week is perfect (all 7 days present)
      const currentWeekPerfect = Object.values(xpCalculation.attendanceDetails).filter(day => day.present).length === 7;

      // Calculate streak (pass email for unique identification)
      const streakData = await calculateOverallStreak(normEmpCode, normEmail, xpCalculation.attendanceDetails, transaction);

      // Calculate season bonus XP based on consecutive perfect weeks (pass email for unique identification)
      const seasonBonus = await calculateSeasonBonus(normEmpCode, normEmail, currentWeekPerfect, transaction);

      // Calculate weekly XP from this file (attendance + bonus)
      const weeklyXP = xpCalculation.totalXP + seasonBonus.bonusXP;

      // Compute delta for the same week to prevent double-counting on re-uploads
      const recentRecords = await EmployeeXpResults.findAll({
        where: {
          [Op.and]: [
            { emp_code: normEmpCode },
            { email: normEmail }
          ]
        },
        order: [["upload_date", "DESC"], ["id", "DESC"]],
        limit: 2,
        attributes: ["total_xp", "week_start_date"],
        transaction
      });

      const latestPrev = recentRecords[0] || null; // most recent cumulative
      const prevOfPrev = recentRecords[1] || null; // baseline before most recent

      const previousCumulativeXP = latestPrev ? (latestPrev.total_xp || 0) : 0;
      const previousBaselineXP = prevOfPrev ? (prevOfPrev.total_xp || 0) : 0;
      const lastRecordedWeekStart = latestPrev ? latestPrev.week_start_date : null;

      const lastWeekXPRecorded = (lastRecordedWeekStart && calculatedWeekStart && String(lastRecordedWeekStart) === String(calculatedWeekStart))
        ? Math.max(previousCumulativeXP - previousBaselineXP, 0)
        : 0;

      const deltaWeeklyXP = Math.max(weeklyXP - lastWeekXPRecorded, 0);
      const cumulativeAttendanceXP = previousCumulativeXP + deltaWeeklyXP; // new cumulative

      // Update user level and badges with only the delta
      const userLevelUpdate = await updateUserLevelAndBadges(normEmpCode, normEmail, deltaWeeklyXP, transaction);

      // Log only the delta XP (avoid duplicate logs on re-uploads)
      if (deltaWeeklyXP > 0) {
        const userForLog = await Users.findOne({
          where: {
            [Op.or]: [
              { userCode: normEmpCode },
              { email: normEmail }
            ]
          },
          attributes: ["id"],
          transaction
        });
        if (userForLog) {
          await UserXpLog.create({
            userId: userForLog.id,
            season_id: null,
            source: 'attribute',
            type: 'weekly_attendance',
            xp: deltaWeeklyXP,
            date: calculatedWeekStart || new Date().toISOString().split('T')[0],
            description: `Weekly attendance (delta): +${deltaWeeklyXP} XP for week starting ${calculatedWeekStart}`
          }, { transaction });
        }
      }

      // Always CREATE a new record (no updates to maintain history)
      await EmployeeXpResults.create({
        person_id: parseInt(row.Person),
        firstname: row.Firstname,
        surname: row.Surname,
        full_name: fullName,
        emp_code: normEmpCode,
        email: normEmail,
        location: row.locationName,
        client: row.ClientName,
        total_xp: cumulativeAttendanceXP, // cumulative attendance XP across all weeks
        season_bonus_xp: seasonBonus.bonusXP,
        season_streak_milestones: seasonBonus.consecutivePerfectWeeks,
        current_level: userLevelUpdate.updated ? userLevelUpdate.newLevel : 1, // Include calculated level
        multiplier: currentMultiplier,
        current_streak: streakData.currentStreak,
        max_streak: streakData.maxStreak,
        total_days_present: Object.values(xpCalculation.attendanceDetails).filter(day => day.present).length,
        total_hours: Object.values(xpCalculation.attendanceDetails).reduce((sum, day) => sum + (day.hours || 0), 0),
        sunday_present: xpCalculation.attendanceDetails.sun.present,
        monday_present: xpCalculation.attendanceDetails.mon.present,
        tuesday_present: xpCalculation.attendanceDetails.tue.present,
        wednesday_present: xpCalculation.attendanceDetails.wed.present,
        thursday_present: xpCalculation.attendanceDetails.thu.present,
        friday_present: xpCalculation.attendanceDetails.fri.present,
        saturday_present: xpCalculation.attendanceDetails.sat.present,
        sunday_hours: xpCalculation.attendanceDetails.sun.hours,
        monday_hours: xpCalculation.attendanceDetails.mon.hours,
        tuesday_hours: xpCalculation.attendanceDetails.tue.hours,
        wednesday_hours: xpCalculation.attendanceDetails.wed.hours,
        thursday_hours: xpCalculation.attendanceDetails.thu.hours,
        friday_hours: xpCalculation.attendanceDetails.fri.hours,
        saturday_hours: xpCalculation.attendanceDetails.sat.hours,
        upload_date: new Date(),
        week_start_date: calculatedWeekStart,
        week_end_date: calculatedWeekEnd,
        uploaded_by: uploadedBy
      }, { transaction });

      processedEmployees.push({
        emp_code: normEmpCode,
        name: fullName,
        weekly_xp: xpCalculation.totalXP, // XP earned this week only
        season_bonus_earned: seasonBonus.bonusXP,
        consecutive_perfect_weeks: seasonBonus.consecutivePerfectWeeks,
        current_week_perfect: currentWeekPerfect,
        cumulative_attendance_xp: cumulativeAttendanceXP, // Total attendance XP across all weeks
        total_user_xp: userLevelUpdate.updated ? userLevelUpdate.newTotalXp : null, // Total XP from all sources
        current_streak: streakData.currentStreak,
        max_streak: streakData.maxStreak,
        // Badge and Level Information
        level_update: userLevelUpdate.updated ? {
          old_level: userLevelUpdate.oldLevel,
          new_level: userLevelUpdate.newLevel,
          leveled_up: userLevelUpdate.leveledUp,
          old_total_xp: userLevelUpdate.oldTotalXp,
          weekly_xp_added: userLevelUpdate.weeklyXpAdded,
          new_total_xp: userLevelUpdate.newTotalXp,
          current_badge: userLevelUpdate.currentBadge,
          earned_badges: userLevelUpdate.earnedBadges,
          badge_progress: userLevelUpdate.badgeProgress,
          xp_to_next_badge: userLevelUpdate.xpToNextBadge,
          is_new_user: userLevelUpdate.isNewUser || false
        } : null,
        weekly_attendance: {
          sunday: xpCalculation.attendanceDetails.sun.present,
          monday: xpCalculation.attendanceDetails.mon.present,
          tuesday: xpCalculation.attendanceDetails.tue.present,
          wednesday: xpCalculation.attendanceDetails.wed.present,
          thursday: xpCalculation.attendanceDetails.thu.present,
          friday: xpCalculation.attendanceDetails.fri.present,
          saturday: xpCalculation.attendanceDetails.sat.present,
          days_present: Object.values(xpCalculation.attendanceDetails).filter(day => day.present).length
        }
      });
    }

    await transaction.commit();

    // Calculate statistics including season bonus
    const totalSeasonBonus = processedEmployees.reduce((sum, emp) => sum + emp.season_bonus_earned, 0);
    const totalWeeklyXP = processedEmployees.reduce((sum, emp) => sum + emp.weekly_xp, 0);
    const employeesWithPerfectWeek = processedEmployees.filter(emp => emp.current_week_perfect).length;
    const employeesWithSeasonBonus = processedEmployees.filter(emp => emp.season_bonus_earned > 0).length;

    // Badge and Level Statistics
    const employeesWhoLeveledUp = processedEmployees.filter(emp => emp.level_update?.leveled_up).length;
    const totalNewLevels = processedEmployees.reduce((sum, emp) => {
      if (emp.level_update?.leveled_up) {
        return sum + (emp.level_update.new_level - emp.level_update.old_level);
      }
      return sum;
    }, 0);
    const averageLevel = processedEmployees.reduce((sum, emp) => {
      return sum + (emp.level_update?.new_level || 1);
    }, 0) / processedEmployees.length;
    const highestLevel = Math.max(...processedEmployees.map(emp => emp.level_update?.new_level || 1));
    const employeesWithBadgeProgress = processedEmployees.filter(emp =>
      emp.level_update?.badge_progress > 0
    ).length;

    // // Send Mail
    const transporter = nodemailer.createTransport({
      host: config.get("MAIL_HOST"),
      port: config.get("MAIL_PORT"),
      secure: config.get("MAIL_PROTOCAL"),
      auth: {
        user: config.get("MAIL_USERNAME"),
        pass: config.get("MAIL_PASSWORD")
      }
    });

    transporter.sendMail({
      from: `WorkWin Support <${config.get("MAIL_FORM")}>`,
      to: "apurv.gupta@dotsquares.com",
      subject: "WorkWin Attendance Update",
      html: `<p>Attendance processed with automatic XP, level, and badge updates</p><p>Total employees: ${processedEmployees.length}</p><p>Total week  ly XP awarded: ${totalWeeklyXP}</p><p>Total season bonus awarded: ${totalSeasonBonus}</p><p>Employees with perfect week: ${employeesWithPerfectWeek}</p><p>Employees with season bonus: ${employeesWithSeasonBonus}</p><p>Week start date: ${calculatedWeekStart}</p><p>Week end date: ${calculatedWeekEnd}</p>`
    }).then(() => {
      console.log("Email sent successfully");
    }).catch((error) => {
      console.error("Error sending email:", error);
    });



    res.status(200).json({
      success: true,
      message: "Attendance processed with automatic XP, level, and badge updates",
      totalEmployees: processedEmployees.length,
      weekSummary: {
        totalWeeklyXPAwarded: totalWeeklyXP,
        totalSeasonBonusAwarded: totalSeasonBonus,
        employeesWithPerfectWeek: employeesWithPerfectWeek,
        employeesWithSeasonBonus: employeesWithSeasonBonus,
        weekStartDate: calculatedWeekStart,
        weekEndDate: calculatedWeekEnd,
        dateSource: dateSource, // Shows how dates were determined
        dateSourceExplanation: {
          manual: "Week dates provided in request body",
          excel_data: "Week dates extracted from Excel sheet columns",
          derived_from_attendance_dates: "Week dates calculated from attendance date columns in Excel",
          auto_calculated: "Week dates auto-calculated based on upload time (may be inaccurate for historical data)"
        }[dateSource],
        datesAutoCalculated: dateSource === 'auto_calculated'
      },
      badgeAndLevelSummary: {
        employeesWhoLeveledUp: employeesWhoLeveledUp,
        totalNewLevels: totalNewLevels,
        averageLevel: Math.round(averageLevel * 100) / 100,
        highestLevel: highestLevel,
        employeesWithBadgeProgress: employeesWithBadgeProgress,
        badgeSystemActive: true
      },
      seasonBonusSystem: {
        description: "Bonus XP awarded for consecutive perfect weeks (7 days each). Resets when any day is missed.",
        milestoneBreakdown: SEASON_BONUS_CONFIG.milestones,
        rules: [
          "1 perfect week (7 days) = 250 XP",
          "2 consecutive perfect weeks (14 days) = 500 XP",
          "3 consecutive perfect weeks (21 days) = 750 XP",
          "4 consecutive perfect weeks (28 days) = 1000 XP",
          "5+ consecutive perfect weeks (35+ days) = 1000 XP",
          "Missing any day resets the consecutive count"
        ]
      },
      xpBadgeSystem: {
        description: "Dynamic badge system with 10 progressive badges based on total XP",
        badges: xpBadgeSystem.getAllBadges().map(badge => ({
          name: badge.name,
          xpRequired: badge.xpRequired,
          description: badge.description
        })),
        levelFormula: "Level = floor(sqrt(totalXP / 1000)) + 1",
        features: [
          "Automatic level calculation based on total XP",
          "Progressive badge unlocking system",
          "Real-time progress tracking",
          "Season unlock requirements",
          "Integration with /me API for user profiles"
        ]
      },
      xpCalculation: {
        formula: "Cumulative XP = Sum of all previous weeks + ((Base XP × Multiplier) - 1000 penalty) + Perfect Week Bonus >= 0",
        description: "Each week creates a new record. Perfect week bonus increases with consecutive perfect weeks. Levels and badges update automatically.",
        xpPerDay: 2500,
        penaltyPerWeek: -1000,
        defaultMultiplier: 1,
        perfectWeekBonus: "250-1000 XP based on consecutive perfect weeks"
      },
      processedEmployees: processedEmployees
    });

  } catch (err) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to process Excel file and save to database",
      error: err.message
    });
  }
});

// Manual Badge and Level Update API - useful for migration or manual updates
router.post("/users/update-badges-levels", adminAuthMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    // Get all users with their latest XP data
    const users = await Users.findAll({
      attributes: ['id', 'userCode', 'name', 'email'],
      transaction
    });

    const updateResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Get user's latest XP from EmployeeXpResults
        const latestXpRecord = await EmployeeXpResults.findOne({
          where: { emp_code: user.userCode },
          order: [['week_start_date', 'DESC']],
          transaction
        });

        let totalXp = 0;
        if (latestXpRecord) {
          totalXp = latestXpRecord.total_xp || 0;
        }

        // Calculate new level and badges
        const newLevel = xpBadgeSystem.calculateLevel(totalXp);
        const xpForNext = xpBadgeSystem.getXpForNextLevel(newLevel);
        const currentLevelXp = newLevel > 1 ? xpBadgeSystem.getXpForNextLevel(newLevel - 1) : 0;
        const progress = totalXp >= xpForNext ? 100 : ((totalXp - currentLevelXp) / (xpForNext - currentLevelXp)) * 100;
        const badgeProgress = xpBadgeSystem.getBadgeProgress(totalXp);
        const earnedBadges = xpBadgeSystem.getEarnedBadges(totalXp);

        // Update or create UserLevel record
        const [userLevel, created] = await UserLevel.findOrCreate({
          where: { userId: user.id },
          defaults: {
            userId: user.id,
            season_id: null, // Global level not tied to specific season
            totalXp: totalXp,
            level: newLevel,
            xpForNext: xpForNext,
            progress: Math.min(progress, 100),
            lastUpdatedAt: new Date()
          },
          transaction
        });

        if (!created) {
          const oldLevel = userLevel.level;
          await userLevel.update({
            totalXp: totalXp,
            level: newLevel,
            xpForNext: xpForNext,
            progress: Math.min(progress, 100),
            lastUpdatedAt: new Date()
          }, { transaction });

          // Update the main users table with new XP and level
          await user.update({
            totalUserXp: totalXp,
            curr_levels: newLevel
          }, { transaction });

          updateResults.push({
            userId: user.id,
            userCode: user.userCode,
            name: user.name,
            oldLevel: oldLevel,
            newLevel: newLevel,
            levelChanged: newLevel !== oldLevel,
            totalXp: totalXp,
            currentBadge: badgeProgress.currentBadge.name,
            earnedBadges: earnedBadges.length,
            status: 'updated'
          });
        } else {
          // Update the main users table with new XP and level for new user
          await user.update({
            totalUserXp: totalXp,
            curr_levels: newLevel
          }, { transaction });

          updateResults.push({
            userId: user.id,
            userCode: user.userCode,
            name: user.name,
            oldLevel: 0,
            newLevel: newLevel,
            levelChanged: true,
            totalXp: totalXp,
            currentBadge: badgeProgress.currentBadge.name,
            earnedBadges: earnedBadges.length,
            status: 'created'
          });
        }

        successCount++;
      } catch (userError) {
        console.error(`Error updating user ${user.userCode}:`, userError);
        updateResults.push({
          userId: user.id,
          userCode: user.userCode,
          name: user.name,
          status: 'error',
          error: userError.message
        });
        errorCount++;
      }
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: "Badge and level update completed",
      summary: {
        totalUsers: users.length,
        successfulUpdates: successCount,
        errors: errorCount,
        usersWhoLeveledUp: updateResults.filter(r => r.levelChanged && r.status !== 'error').length
      },
      badgeSystemInfo: {
        totalBadges: xpBadgeSystem.getAllBadges().length,
        badgeNames: xpBadgeSystem.getAllBadges().map(b => b.name)
      },
      updateResults: updateResults
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error in manual badge update:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update badges and levels",
      error: error.message
    });
  }
});

// Get ExcelAttendence Data
router.get("/users/xp-records", adminAuthMiddleware, async (req, res) => {
  try {
    await sequelize.query("SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // Build where clause filters - use actual data week dates, not current system week
    const whereConditions = [];
    const queryParams = [];

    if (req.query.location) {
      whereConditions.push(`location LIKE ?`);
      queryParams.push(`%${req.query.location}%`);
    }

    if (req.query.client) {
      whereConditions.push(`client LIKE ?`);
      queryParams.push(`%${req.query.client}%`);
    }

    // Handle week filtering - use actual week_start_date from data, not current week
    let weekInfo = null;
    if (req.query.week_start_date) {
      // Use specific week provided
      whereConditions.push(`week_start_date = ?`);
      queryParams.push(req.query.week_start_date);

      // Get week info for the specified week
      const weekInfoQuery = `
        SELECT week_start_date, week_end_date, COUNT(*) as record_count
        FROM employee_xp_results 
        WHERE week_start_date = ?
        GROUP BY week_start_date, week_end_date
      `;

      const [weekInfoResult] = await sequelize.query(weekInfoQuery, {
        replacements: [req.query.week_start_date]
      });

      if (weekInfoResult.length > 0) {
        const specifiedWeek = weekInfoResult[0];
        weekInfo = {
          weekStartDate: specifiedWeek.week_start_date,
          weekEndDate: specifiedWeek.week_end_date,
          recordCount: specifiedWeek.record_count,
          source: 'specified_week'
        };
      }
    } else {
      // Get the most recent week available in data (not current system week)
      const latestWeekQuery = `
        SELECT week_start_date, week_end_date, COUNT(*) as record_count
        FROM employee_xp_results 
        ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
        GROUP BY week_start_date, week_end_date
        ORDER BY week_start_date DESC
        LIMIT 1
      `;

      const [latestWeekResult] = await sequelize.query(latestWeekQuery, {
        replacements: queryParams
      });

      if (latestWeekResult.length > 0) {
        const latestWeek = latestWeekResult[0];
        whereConditions.push(`week_start_date = ?`);
        queryParams.push(latestWeek.week_start_date);

        weekInfo = {
          weekStartDate: latestWeek.week_start_date,
          weekEndDate: latestWeek.week_end_date,
          recordCount: latestWeek.record_count,
          source: 'latest_available_week'
        };
      }
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get unique records with highest XP per person for the specified/latest week
    const uniqueHighestXpQuery = `
      SELECT e1.* FROM employee_xp_results e1
      INNER JOIN (
        SELECT person_id, MAX(total_xp) as max_xp
        FROM employee_xp_results
        ${whereClause}
        GROUP BY person_id
      ) e2 ON e1.person_id = e2.person_id AND e1.total_xp = e2.max_xp
      ${whereClause}
      ORDER BY e1.total_xp DESC
      LIMIT ? OFFSET ?
    `;

    // Get total count of unique persons for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT person_id) as total
      FROM employee_xp_results
      ${whereClause}
    `;

    // Execute queries with proper parameter duplication for repeated WHERE clauses
    const [rows] = await sequelize.query(uniqueHighestXpQuery, {
      replacements: [...queryParams, ...queryParams, pageSize, offset]
    });

    const [countResult] = await sequelize.query(countQuery, {
      replacements: queryParams
    });

    const count = countResult[0]?.total || 0;

    const totalPages = Math.ceil(count / pageSize);

    // Calculate statistics from unique highest XP records
    const allUniqueRecordsQuery = `
      SELECT e1.total_xp FROM employee_xp_results e1
      INNER JOIN (
        SELECT person_id, MAX(total_xp) as max_xp
        FROM employee_xp_results
        ${whereClause}
        GROUP BY person_id
      ) e2 ON e1.person_id = e2.person_id AND e1.total_xp = e2.max_xp
      ${whereClause}
    `;

    const [allUniqueRecords] = await sequelize.query(allUniqueRecordsQuery, {
      replacements: [...queryParams, ...queryParams]
    });

    const statistics = {
      highestXP: allUniqueRecords.length > 0 ? Math.max(...allUniqueRecords.map(r => r.total_xp)) : 0,
      lowestXP: allUniqueRecords.length > 0 ? Math.min(...allUniqueRecords.map(r => r.total_xp)) : 0,
      averageXP: allUniqueRecords.length > 0 ? Math.round(
        allUniqueRecords.reduce((sum, r) => sum + r.total_xp, 0) / allUniqueRecords.length
      ) : 0,
      totalUniqueEmployees: count,
      description: "Statistics based on highest XP per unique employee for the selected week"
    };

    // Get available weeks for dropdown/filter purposes
    const availableWeeksQuery = `
      SELECT DISTINCT week_start_date, week_end_date, COUNT(*) as employee_count
      FROM employee_xp_results
      ${req.query.location || req.query.client ?
        'WHERE ' + [
          req.query.location ? `location LIKE '%${req.query.location}%'` : null,
          req.query.client ? `client LIKE '%${req.query.client}%'` : null
        ].filter(Boolean).join(' AND ')
        : ''
      }
      GROUP BY week_start_date, week_end_date
      ORDER BY week_start_date DESC
      LIMIT 20
    `;

    const [availableWeeks] = await sequelize.query(availableWeeksQuery);

    res.status(200).json({
      success: true,
      data: rows,
      weekInfo: weekInfo || {
        weekStartDate: null,
        weekEndDate: null,
        recordCount: 0,
        source: 'no_data_found',
        message: 'No attendance data found for the specified filters'
      },
      availableWeeks: availableWeeks.map(week => ({
        weekStartDate: week.week_start_date,
        weekEndDate: week.week_end_date,
        employeeCount: week.employee_count,
        weekLabel: `${new Date(week.week_start_date).toLocaleDateString()} - ${new Date(week.week_end_date).toLocaleDateString()}`
      })),
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalPages: totalPages,
        totalRecords: count,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      filters: {
        location: req.query.location || null,
        client: req.query.client || null,
        weekStartDate: req.query.week_start_date || (weekInfo ? weekInfo.weekStartDate : null)
      },
      xpCalculation: {
        formula: "XP = (Days Present × 2500) - (Days Missing × 1000), minimum 0",
        description: "Employee gets 2500 XP per day present, loses 1000 XP per day missing. Shows highest XP record per employee. Uses actual week dates from Excel uploads, not current system week.",
        xpPerDay: 2500,
        penaltyPerMissingDay: 1000,
        dataSource: "Actual week dates from Excel uploads, not current system week"
      },
      statistics: statistics
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve employee records",
      error: err.message
    });
  }
});

// Spin the Wheel Save configuration
router.post("/wheel/save-configuration", async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id, sections, xpValues, totalXP, type, reward_images, section_probabilities, section_quantities } = req.body;

    // Validation
    if (!sections || sections < 2 || sections > 20) {
      return res.status(400).send(
        HelperUtils.errorObj("Number of sections must be between 2 and 20")
      );
    }

    if (!xpValues || !Array.isArray(xpValues) || xpValues.length !== sections) {
      return res.status(400).send(
        HelperUtils.errorObj("xpValues array length must match sections count")
      );
    }

    // Calculate and verify total XP
    const calculatedTotal = xpValues.reduce((sum, xp) => sum + xp, 0);

    if (type === "xp") {
      if (totalXP && totalXP !== calculatedTotal) {
        return res.status(400).send(
          HelperUtils.errorObj(`Total XP mismatch. Expected: ${calculatedTotal}, Received: ${totalXP}`)
        );
      }
    }

    // Validate reward_images if provided
    if (reward_images && !Array.isArray(reward_images)) {
      return res.status(400).send(
        HelperUtils.errorObj("reward_images must be an array")
      );
    }

    // Validate that reward_images array length matches sections if provided
    if (reward_images && reward_images.length > 0 && reward_images.length !== sections) {
      return res.status(400).send(
        HelperUtils.errorObj(`reward_images array length (${reward_images.length}) must match sections count (${sections}) or be empty`)
      );
    }

    console.log('Updating wheel configuration with reward_images:', reward_images);

    // Convert to internal format for storage
    const sectionsData = xpValues.map((xpValue, index) => ({
      sectionNumber: index + 1,
      xpValue: xpValue
    }));

    // Check if global wheel configuration already exists
    const existingConfig = await SpinTheWheel.findOne({
      where: { is_active: true, id },
      transaction
    });

    const configData = {
      number_of_sections: sections,
      sections: JSON.stringify(sectionsData),
      total_xp_pool: type === "xp" ? calculatedTotal : 0,
      type: type,
      is_active: true,
      is_global: true,
      created_by: "admin",
      created_at: new Date(),
      updated_at: new Date(),
      reward_images: reward_images || [],
      section_probabilities: (section_probabilities) || [],
      section_quantities: section_quantities || []
    };

    console.log(configData)

    let wheelConfig;
    if (existingConfig) {
      // Update existing global configuration
      wheelConfig = await existingConfig.update(configData, { transaction });
    } else {
      // Create new global configuration
      configData.created_at = new Date();
      wheelConfig = await SpinTheWheel.create(configData, { transaction });
    }

    await transaction.commit();

    // Return response in frontend-friendly format
    res.status(200).json({
      id: wheelConfig.id,
      sections: wheelConfig.number_of_sections,
      xpValues: xpValues,
      totalXP: wheelConfig.total_xp_pool,
      isActive: wheelConfig.is_active,
      isGlobal: wheelConfig.is_global,
      section_probabilities: wheelConfig.section_probabilities || [],
      section_quantities: wheelConfig.section_quantities || [],
      reward_images: wheelConfig.reward_images || [], // Include updated images
      updatedAt: wheelConfig.updated_at,
    });

  } catch (err) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error saving wheel configuration:", err);
    res.status(500).send(
      HelperUtils.errorObj("Failed to save wheel configuration")
    );
  }
});

// Get Wheel Configuration for users
router.get("/wheel/configuration/:id", async (req, res) => {
  try {
    const configId = req.params.id;
    // Get the global wheel configuration set by admin
    const wheelConfig = await SpinTheWheel.findOne({
      where: {
        is_active: true,
        id: configId
      },
      attributes: [
        'id',
        'number_of_sections',
        'sections',
        'total_xp_pool',
        'is_active',
        "is_big",
        "type",
        "reward_images",
        "section_probabilities",
        "section_quantities"
      ]
    });

    if (!wheelConfig) {
      return res.status(404).send(
        HelperUtils.errorObj("No wheel configuration available. Please contact admin.")
      );
    }

    // Format the response (limited info for users)
    const formattedConfig = {
      id: wheelConfig.id,
      numberOfSections: wheelConfig.number_of_sections,
      sections: JSON.parse(wheelConfig.sections),
      totalXpPool: wheelConfig.total_xp_pool,
      isActive: wheelConfig.is_active,
      isBig: wheelConfig.is_big,
      type: wheelConfig.type,
      reward_images: wheelConfig.reward_images || [],
      section_probabilities: (wheelConfig.section_probabilities) || [],
      section_quantities: wheelConfig.section_quantities || []
    };

    res.status(200).send(
      HelperUtils.successObj("Wheel configuration retrieved successfully", formattedConfig)
    );

  } catch (err) {
    console.error("Error fetching wheel configuration:", err);
    res.status(500).send(
      HelperUtils.errorObj("Failed to fetch wheel configuration")
    );
  }
});

// Activate Big Wheel
router.post("/big-wheel/activate", adminAuthMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).send(
        HelperUtils.errorObj("Configuration ID is required to activate")
      );
    }
    const wheelConfig = await SpinTheWheel.findOne({
      where: { id },
      transaction
    });
    if (!wheelConfig) {
      return res.status(404).send(
        HelperUtils.errorObj("Configuration not found")
      );
    }
    await wheelConfig.update({ is_big: true, updated_at: new Date() }, { transaction });
    await transaction.commit();
    res.status(200).send(
      HelperUtils.successObj("Wheel configuration activated successfully")
    );
  }
  catch (err) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error activating wheel configuration:", err);
    res.status(500).send(
      HelperUtils.errorObj("Failed to activate wheel configuration")
    );
  }
});

// Deactivate Big Wheel
router.post("/big-wheel/deactivate", adminAuthMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).send(
        HelperUtils.errorObj("Configuration ID is required to deactivate")
      );
    }
    const wheelConfig = await SpinTheWheel.findOne({
      where: { id },
      transaction
    });
    if (!wheelConfig) {
      return res.status(404).send(
        HelperUtils.errorObj("Active configuration not found")
      );
    }
    await wheelConfig.update({ is_big: false, updated_at: new Date() }, { transaction });
    await transaction.commit();
    res.status(200).send(
      HelperUtils.successObj("Wheel configuration deactivated successfully")
    );
  } catch (err) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error deactivating wheel configuration:", err);
    res.status(500).send(
      HelperUtils.errorObj("Failed to deactivate wheel configuration")
    );
  }
});

// ===== BONUS SEASON ROUTES =====

// GET /admin/bonus-seasons - Get all bonus seasons
router.get("/bonus-seasons", adminAuthMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, is_active } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const bonusSeasons = await BonusSeason.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.status(200).send(
      HelperUtils.successObj("Bonus seasons retrieved successfully", {
        seasons: bonusSeasons.rows,
        total: bonusSeasons.count,
        page: parseInt(page),
        totalPages: Math.ceil(bonusSeasons.count / limit)
      })
    );
  } catch (error) {
    console.error("Error fetching bonus seasons:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to fetch bonus seasons")
    );
  }
});

// GET /admin/bonus-seasons/:id - Get specific bonus season
router.get("/bonus-seasons/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const bonusSeason = await BonusSeason.findByPk(id);

    if (!bonusSeason) {
      return res.status(404).send(
        HelperUtils.errorObj("Bonus season not found")
      );
    }

    res.status(200).send(
      HelperUtils.successObj("Bonus season retrieved successfully", bonusSeason)
    );
  } catch (error) {
    console.error("Error fetching bonus season:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to fetch bonus season")
    );
  }
});

// POST /admin/bonus-seasons - Create new bonus season
router.post("/bonus-seasons", adminAuthMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      name,
      employer_code,
      season_type,
      duration_months,
      description,
      start_date,
      end_date,
      bonus_multiplier,
      bonus_type,
      fixed_bonus_amount,
      is_active,
      applies_to_games,
      min_xp_threshold,
      max_participants
    } = req.body;

    // Validation
    if (!name || !employer_code || !season_type) {
      return res.status(400).send(
        HelperUtils.errorObj("Name, employer_code, and season_type are required")
      );
    }

    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      return res.status(400).send(
        HelperUtils.errorObj("End date must be after start date")
      );
    }

    // Check for overlapping bonus seasons on the same dates
    if (start_date && end_date) {
      const overlappingSeason = await BonusSeason.findOne({
        where: {
          [Op.or]: [
            {
              // New season starts within existing season
              start_date: {
                [Op.lte]: start_date
              },
              end_date: {
                [Op.gte]: start_date
              }
            },
            {
              // New season ends within existing season
              start_date: {
                [Op.lte]: end_date
              },
              end_date: {
                [Op.gte]: end_date
              }
            },
            {
              // New season completely contains existing season
              start_date: {
                [Op.gte]: start_date
              },
              end_date: {
                [Op.lte]: end_date
              }
            }
          ],
          is_active: true
        }
      });

      if (overlappingSeason) {
        return res.status(400).json(
          {
            success: false,
            message: "Bonus season overlaps with an active season"
          });
      }
    }

    const bonusSeason = await BonusSeason.create({
      name,
      employer_code,
      season_type,
      duration_months,
      description,
      start_date,
      end_date,
      bonus_multiplier: bonus_multiplier || 1.00,
      bonus_type: bonus_type || 'percentage',
      fixed_bonus_amount,
      is_active: is_active !== undefined ? is_active : true,
      applies_to_games,
      min_xp_threshold,
      max_participants
    }, { transaction });

    await transaction.commit();
    res.status(201).send(
      HelperUtils.successObj("Bonus season created successfully", bonusSeason)
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error creating bonus season:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to create bonus season")
    );
  }
});

// PUT /admin/bonus-seasons/:id - Update bonus season
router.put("/bonus-seasons/:id", adminAuthMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const updateData = req.body;

    const bonusSeason = await BonusSeason.findByPk(id);
    if (!bonusSeason) {
      return res.status(404).send(
        HelperUtils.errorObj("Bonus season not found")
      );
    }

    // Validation for dates if provided
    if (updateData.start_date && updateData.end_date) {
      if (new Date(updateData.start_date) >= new Date(updateData.end_date)) {
        return res.status(400).send(
          HelperUtils.errorObj("End date must be after start date")
        );
      }

      // Check for overlapping bonus seasons (exclude current season from check)
      const overlappingSeason = await BonusSeason.findOne({
        where: {
          id: {
            [Op.ne]: id // Exclude current season being updated
          },
          [Op.or]: [
            {
              // Updated season starts within existing season
              start_date: {
                [Op.lte]: updateData.start_date
              },
              end_date: {
                [Op.gte]: updateData.start_date
              }
            },
            {
              // Updated season ends within existing season
              start_date: {
                [Op.lte]: updateData.end_date
              },
              end_date: {
                [Op.gte]: updateData.end_date
              }
            },
            {
              // Updated season completely contains existing season
              start_date: {
                [Op.gte]: updateData.start_date
              },
              end_date: {
                [Op.lte]: updateData.end_date
              }
            }
          ],
          is_active: true
        }
      });

      if (overlappingSeason) {
        return res.status(400).send(
          HelperUtils.errorObj(
            `Cannot update bonus season. There is already an active bonus season "${overlappingSeason.name}" that overlaps with the selected dates (${overlappingSeason.start_date.toISOString().split('T')[0]} to ${overlappingSeason.end_date.toISOString().split('T')[0]})`
          )
        );
      }
    }

    await bonusSeason.update(updateData, { transaction });
    await transaction.commit();

    res.status(200).send(
      HelperUtils.successObj("Bonus season updated successfully", bonusSeason)
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error updating bonus season:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to update bonus season")
    );
  }
});

// DELETE /admin/bonus-seasons/:id - Delete bonus season
router.delete("/bonus-seasons/:id", adminAuthMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const bonusSeason = await BonusSeason.findByPk(id);

    if (!bonusSeason) {
      return res.status(404).send(
        HelperUtils.errorObj("Bonus season not found")
      );
    }

    await bonusSeason.destroy({ transaction });
    await transaction.commit();

    res.status(200).send(
      HelperUtils.successObj("Bonus season deleted successfully")
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error deleting bonus season:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to delete bonus season")
    );
  }
});

// GET /admin/bonus-seasons/active/current - Get currently active bonus season
router.get("/bonus-seasons/active/current", adminAuthMiddleware, async (req, res) => {
  try {
    const activeSeason = await BonusSeason.getActiveSeason();

    if (!activeSeason) {
      return res.status(404).send(
        HelperUtils.errorObj("No active bonus season found")
      );
    }

    res.status(200).send(
      HelperUtils.successObj("Active bonus season retrieved successfully", activeSeason)
    );
  } catch (error) {
    console.error("Error fetching active bonus season:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to fetch active bonus season")
    );
  }
});

// ===== XP THRESHOLD ROUTES =====

// POST /admin/xp-thresholds/create-threshold - Create specific threshold for app login or registration
router.post("/xp-thresholds/create-threshold", adminAuthMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { threshold_type, xp_value } = req.body;

    // Validation
    if (!threshold_type || !['app_login', 'new_registration'].includes(threshold_type)) {
      return res.status(400).send(
        HelperUtils.errorObj("threshold_type must be either 'app_login' or 'new_registration'")
      );
    }

    if (xp_value === undefined || xp_value < 0) {
      return res.status(400).send(
        HelperUtils.errorObj("xp_value is required and must be a positive number")
      );
    }

    // Set predefined values based on threshold type
    const thresholdConfig = {
      app_login: {
        game_name: 'Weekly App Login',
        unlock_message: 'Earn XP points for logging into the app weekly!',
        lock_message: 'Complete Weekly login to earn XP',
        icon_url: null
      },
      new_registration: {
        game_name: 'New User Registration',
        unlock_message: 'Welcome bonus XP for new users!',
        lock_message: 'Registration required to earn bonus XP',
        icon_url: null
      }
    };

    const config = thresholdConfig[threshold_type];

    // Check if this threshold type already exists
    const existingThreshold = await XpThreshold.findOne({
      where: { game_type: threshold_type }
    });

    if (existingThreshold) {
      return res.status(400).send(
        HelperUtils.errorObj(`A threshold for ${threshold_type} already exists. Use update instead.`)
      );
    }

    const xpThreshold = await XpThreshold.create({
      game_name: config.game_name,
      game_type: threshold_type,
      min_xp_required: parseInt(xp_value),
      level_required: null,
      is_active: true,
      unlock_message: config.unlock_message,
      lock_message: config.lock_message,
      icon_url: config.icon_url,
      sort_order: threshold_type === 'new_registration' ? 1 : 2,
      requires_consecutive_days: threshold_type === 'app_login' ? 1 : null,
      additional_requirements: null,
      reward_on_unlock: null,
      cooldown_hours: threshold_type === 'app_login' ? 24 : null,
      max_plays_per_day: threshold_type === 'app_login' ? 1 : null
    }, { transaction });

    await transaction.commit();
    res.status(201).send(
      HelperUtils.successObj("XP threshold created successfully", xpThreshold)
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error creating XP threshold:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to create XP threshold")
    );
  }
});

// GET /admin/xp-thresholds/login-registration - Get login and registration thresholds
router.get("/xp-thresholds/login-registration", adminAuthMiddleware, async (req, res) => {
  try {
    const thresholds = await XpThreshold.findAll({
      where: {
        game_type: ['app_login', 'new_registration']
      },
      order: [['sort_order', 'ASC']]
    });

    res.status(200).send(
      HelperUtils.successObj("Login and registration thresholds retrieved successfully", thresholds)
    );
  } catch (error) {
    console.error("Error fetching login/registration thresholds:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to fetch login and registration thresholds")
    );
  }
});

// GET /admin/xp-thresholds - Get all XP thresholds
router.get("/xp-thresholds", adminAuthMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, game_type, is_active } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (game_type) {
      whereClause.game_type = game_type;
    }
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const xpThresholds = await XpThreshold.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['sort_order', 'ASC'], ['min_xp_required', 'ASC']]
    });

    res.status(200).send(
      HelperUtils.successObj("XP thresholds retrieved successfully", {
        thresholds: xpThresholds.rows,
        total: xpThresholds.count,
        page: parseInt(page),
        totalPages: Math.ceil(xpThresholds.count / limit)
      })
    );
  } catch (error) {
    console.error("Error fetching XP thresholds:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to fetch XP thresholds")
    );
  }
});

// GET /admin/xp-thresholds/:id - Get specific XP threshold
router.get("/xp-thresholds/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const xpThreshold = await XpThreshold.findByPk(id);

    if (!xpThreshold) {
      return res.status(404).send(
        HelperUtils.errorObj("XP threshold not found")
      );
    }

    res.status(200).send(
      HelperUtils.successObj("XP threshold retrieved successfully", xpThreshold)
    );
  } catch (error) {
    console.error("Error fetching XP threshold:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to fetch XP threshold")
    );
  }
});

// POST /admin/xp-thresholds - Create new XP threshold
router.post("/xp-thresholds", adminAuthMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      game_name,
      game_type,
      min_xp_required,
      level_required,
      is_active,
      unlock_message,
      lock_message,
      icon_url,
      sort_order,
      requires_consecutive_days,
      additional_requirements,
      reward_on_unlock,
      cooldown_hours,
      max_plays_per_day
    } = req.body;

    // Validation
    if (!game_name || !game_type || min_xp_required === undefined) {
      return res.status(400).send(
        HelperUtils.errorObj("game_name, game_type, and min_xp_required are required")
      );
    }

    // Check for duplicate game name
    const existingGame = await XpThreshold.findOne({
      where: { game_name }
    });

    if (existingGame) {
      return res.status(400).send(
        HelperUtils.errorObj("A game with this name already exists")
      );
    }

    const xpThreshold = await XpThreshold.create({
      game_name,
      game_type,
      min_xp_required: min_xp_required || 0,
      level_required,
      is_active: is_active !== undefined ? is_active : true,
      unlock_message,
      lock_message,
      icon_url,
      sort_order: sort_order || 0,
      requires_consecutive_days,
      additional_requirements,
      reward_on_unlock,
      cooldown_hours,
      max_plays_per_day
    }, { transaction });

    await transaction.commit();
    res.status(201).send(
      HelperUtils.successObj("XP threshold created successfully", xpThreshold)
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error creating XP threshold:", error);

    // Handle unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).send(
        HelperUtils.errorObj("A game with this name already exists")
      );
    }

    res.status(500).send(
      HelperUtils.errorObj("Failed to create XP threshold")
    );
  }
});

// PUT /admin/xp-thresholds/:id - Update XP threshold
router.put("/xp-thresholds/:id", adminAuthMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const updateData = req.body;

    const xpThreshold = await XpThreshold.findByPk(id);
    if (!xpThreshold) {
      return res.status(404).send(
        HelperUtils.errorObj("XP threshold not found")
      );
    }

    // Check for duplicate game name if name is being updated
    if (updateData.game_name && updateData.game_name !== xpThreshold.game_name) {
      const existingGame = await XpThreshold.findOne({
        where: {
          game_name: updateData.game_name,
          id: { [Op.ne]: id }
        }
      });

      if (existingGame) {
        return res.status(400).send(
          HelperUtils.errorObj("A game with this name already exists")
        );
      }
    }

    await xpThreshold.update(updateData, { transaction });
    await transaction.commit();

    res.status(200).send(
      HelperUtils.successObj("XP threshold updated successfully", xpThreshold)
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error updating XP threshold:", error);

    // Handle unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).send(
        HelperUtils.errorObj("A game with this name already exists")
      );
    }

    res.status(500).send(
      HelperUtils.errorObj("Failed to update XP threshold")
    );
  }
});

// DELETE /admin/xp-thresholds/:id - Delete XP threshold
router.delete("/xp-thresholds/:id", adminAuthMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const xpThreshold = await XpThreshold.findByPk(id);

    if (!xpThreshold) {
      return res.status(404).send(
        HelperUtils.errorObj("XP threshold not found")
      );
    }

    await xpThreshold.destroy({ transaction });
    await transaction.commit();

    res.status(200).send(
      HelperUtils.successObj("XP threshold deleted successfully")
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error deleting XP threshold:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to delete XP threshold")
    );
  }
});

// GET /admin/xp-thresholds/user/:userId/status - Get user's unlock status for all games
router.get("/xp-thresholds/user/:userId/status", adminAuthMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's XP and level
    const user = await Users.findByPk(userId, {
      include: [{
        model: UserLevel,
        as: 'UserLevel'
      }]
    });

    if (!user) {
      return res.status(404).send(
        HelperUtils.errorObj("User not found")
      );
    }

    // Calculate total XP for user (you might need to adjust this based on your XP calculation logic)
    const userXpLogs = await EmployeeXpResults.findAll({
      where: { userId: userId }
    });

    const totalXp = userXpLogs.reduce((sum, log) => sum + (log.totalXP || 0), 0);
    const userLevel = user.UserLevel?.level || 1;

    // Get all thresholds
    const allThresholds = await XpThreshold.getActiveThresholds();

    // Determine unlock status for each
    const gameStatus = allThresholds.map(threshold => ({
      id: threshold.id,
      game_name: threshold.game_name,
      game_type: threshold.game_type,
      min_xp_required: threshold.min_xp_required,
      level_required: threshold.level_required,
      is_unlocked: threshold.isUnlockedForUser(totalXp, userLevel),
      user_xp: totalXp,
      user_level: userLevel,
      xp_needed: threshold.min_xp_required > totalXp ? threshold.min_xp_required - totalXp : 0,
      unlock_message: threshold.unlock_message,
      lock_message: threshold.lock_message,
      icon_url: threshold.icon_url
    }));

    res.status(200).send(
      HelperUtils.successObj("User game status retrieved successfully", {
        user_id: userId,
        total_xp: totalXp,
        user_level: userLevel,
        games: gameStatus
      })
    );
  } catch (error) {
    console.error("Error fetching user game status:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to fetch user game status")
    );
  }
});

// GET /admin/xp-thresholds/game-types - Get available game types
router.get("/xp-thresholds/game-types", adminAuthMiddleware, async (req, res) => {
  try {
    const gameTypes = [
      { value: 'spin_wheel', label: 'Spin Wheel' },
      { value: 'quiz', label: 'Quiz Game' },
      { value: 'daily_challenge', label: 'Daily Challenge' },
      { value: 'achievement', label: 'Achievement' },
      { value: 'custom', label: 'Custom Game' }
    ];

    res.status(200).send(
      HelperUtils.successObj("Game types retrieved successfully", gameTypes)
    );
  } catch (error) {
    console.error("Error fetching game types:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to fetch game types")
    );
  }
});

// Upload reward image
router.post("/upload-reward-image", adminAuthMiddleware, upload.single('rewardImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send(
        HelperUtils.errorObj("No image file provided")
      );
    }

    // Store the file path or URL
    const imagePath = `/uploads/${req.file.filename}`;
    const baseURL = process.env.BASE_URL || 'https://workwin.24livehost.com:3025';
    const fullImageUrl = `${baseURL}${imagePath}`;

    console.log('Image uploaded successfully:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      imagePath: imagePath,
      fullUrl: fullImageUrl
    });

    res.status(200).send(
      HelperUtils.successObj("Image uploaded successfully", {
        imagePath: imagePath,
        fullUrl: fullImageUrl,
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      })
    );
  } catch (error) {
    console.error("Error uploading reward image:", error);
    res.status(500).send(
      HelperUtils.errorObj("Failed to upload image")
    );
  }
});

module.exports = router;
