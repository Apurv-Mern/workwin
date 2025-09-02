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
  EmployeeXpResults
} = ModelsData;
const HelperUtils = require("./../../../utils/helpers");
const jwt = require("jsonwebtoken");
const JWT_SECRET = config.get("jwtSecret");
const adminAuthMiddleware = require("../../../middleware/adminAuthMiddleware");
const checkPermission = require("../../../middleware/checkPermission");
const bcrypt = require("bcryptjs");
const TOKEN_EXPIRY = "1d";
const { Op } = require("sequelize");
const upload = require("../../../middleware/fileUpload");
const XLSX = require("xlsx");

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

// Upload Excel File
router.post("/users/excel-upload", upload.single("file"), async (req, res) => {
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

    // Updated XP calculation with refined penalty logic
    const calculateXP = (employeeData, multiplier = 1) => {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const xpPerDay = 2500;
      const penaltyXP = -1000;
      let baseXP = 0;
      let attendanceDetails = {};
      let perfectAttendance = true;

      days.forEach((day) => {
        const inTime = employeeData[`${day}_In`];
        const outTime = employeeData[`${day}_Out`];

        if (hasValue(inTime) && hasValue(outTime)) {
          baseXP += xpPerDay;
          attendanceDetails[day.toLowerCase()] = {
            present: true,
            hours: employeeData[`${day}_Hours`] || 0
          };
        } else {
          attendanceDetails[day.toLowerCase()] = {
            present: false,
            hours: 0
          };
          perfectAttendance = false;
        }
      });

      // Apply multiplier to base XP
      let totalXP = baseXP * multiplier;

      // Apply penalty ONLY if:
      // 1. Not perfect attendance (missing some days)
      // 2. Has some base XP (baseXP > 0)
      let penaltyApplied = 0;
      if (!perfectAttendance && baseXP > 0) {
        totalXP += penaltyXP;
        penaltyApplied = penaltyXP;
      }

      // Ensure XP cannot be negative
      if (totalXP < 0) {
        totalXP = 0;
      }

      return {
        baseXP,
        totalXP,
        attendanceDetails,
        perfectAttendance,
        penaltyApplied,
        multiplierUsed: multiplier
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
    const calculateOverallStreak = async (personId, currentWeekAttendance, existingRecord, transaction) => {
      const currentWeekStreak = calculateCurrentWeekStreak(currentWeekAttendance);

      if (!existingRecord) {
        return {
          currentStreak: currentWeekStreak,
          maxStreak: currentWeekStreak
        };
      }

      const previousDaysOrder = ["saturday", "friday", "thursday", "wednesday", "tuesday", "monday", "sunday"];
      let lastDayPresent = false;

      for (const day of previousDaysOrder) {
        const dayPresent = existingRecord[`${day}_present`];
        if (dayPresent !== null) {
          lastDayPresent = dayPresent;
          break;
        }
      }

      let newCurrentStreak;
      if (lastDayPresent && currentWeekAttendance.sun.present) {
        newCurrentStreak = existingRecord.current_streak + currentWeekStreak;
      } else if (currentWeekStreak > 0) {
        newCurrentStreak = currentWeekStreak;
      } else {
        newCurrentStreak = 0;
      }

      const newMaxStreak = Math.max(existingRecord.max_streak, newCurrentStreak);

      return {
        currentStreak: newCurrentStreak,
        maxStreak: newMaxStreak
      };
    };

    const weekStartDate = req.body.weekStartDate || null;
    const weekEndDate = req.body.weekEndDate || null;
    const uploadedBy = req.user?.id || null;

    for (const row of rawData.filter(r => r.Person)) {
      const empCode = row.EmployeeCode || row.emp_code;
      const fullName = `${row.Firstname || ""} ${row.Surname || ""}`.trim();

      // Check if record already exists for this person
      const existingRecord = await EmployeeXpResults.findOne({
        where: {
          emp_code: empCode
        },
        order: [["upload_date", "DESC"]],
        transaction
      });

      // Get multiplier from existing record or default to 1
      const currentMultiplier = existingRecord ? existingRecord.multiplier : 1;

      // Calculate XP with current multiplier
      const xpCalculation = calculateXP(row, currentMultiplier);

      // Calculate streak
      const streakData = await calculateOverallStreak(
        parseInt(row.Person),
        xpCalculation.attendanceDetails,
        existingRecord,
        transaction
      );

      // console.log({
      //   person_id: row.Person,
      //   baseXP: xpCalculation.baseXP,
      //   multiplier: currentMultiplier,
      //   totalXP: xpCalculation.totalXP,
      //   perfectAttendance: xpCalculation.perfectAttendance,
      //   penaltyApplied: xpCalculation.penaltyApplied,
      //   penaltySkipped: !xpCalculation.perfectAttendance && xpCalculation.baseXP === 0
      // });

      if (existingRecord) {
        // If record exists, update all data but ADD XP to existing XP
        const newTotalXP = existingRecord.total_xp + xpCalculation.totalXP;

        await existingRecord.update({
          firstname: row.Firstname,
          surname: row.Surname,
          full_name: fullName,
          emp_code: empCode,
          email: row.Email,
          location: row.locationName,
          client: row.ClientName,

          // ADD current week's XP (with multiplier and penalty logic) to existing XP
          total_xp: newTotalXP,

          // Keep existing multiplier
          // multiplier: currentMultiplier, // This stays the same

          // Update streak information
          current_streak: streakData.currentStreak,
          max_streak: streakData.maxStreak,

          total_days_present: Object.values(xpCalculation.attendanceDetails).filter(day => day.present).length,
          total_hours: Object.values(xpCalculation.attendanceDetails).reduce((sum, day) => sum + (day.hours || 0), 0),

          // Update daily attendance flags for current week
          sunday_present: xpCalculation.attendanceDetails.sun.present,
          monday_present: xpCalculation.attendanceDetails.mon.present,
          tuesday_present: xpCalculation.attendanceDetails.tue.present,
          wednesday_present: xpCalculation.attendanceDetails.wed.present,
          thursday_present: xpCalculation.attendanceDetails.thu.present,
          friday_present: xpCalculation.attendanceDetails.fri.present,
          saturday_present: xpCalculation.attendanceDetails.sat.present,

          // Update daily hours for current week
          sunday_hours: xpCalculation.attendanceDetails.sun.hours,
          monday_hours: xpCalculation.attendanceDetails.mon.hours,
          tuesday_hours: xpCalculation.attendanceDetails.tue.hours,
          wednesday_hours: xpCalculation.attendanceDetails.wed.hours,
          thursday_hours: xpCalculation.attendanceDetails.thu.hours,
          friday_hours: xpCalculation.attendanceDetails.fri.hours,
          saturday_hours: xpCalculation.attendanceDetails.sat.hours,

          upload_date: new Date(),
          week_start_date: weekStartDate,
          week_end_date: weekEndDate,
          uploaded_by: uploadedBy
        }, { transaction });

      } else {
        await EmployeeXpResults.create({
          person_id: parseInt(row.Person),
          firstname: row.Firstname,
          surname: row.Surname,
          full_name: fullName,
          emp_code: empCode,
          email: row.Email,
          location: row.locationName,
          client: row.ClientName,
          total_xp: xpCalculation.totalXP,

          // Set default multiplier for new employees
          multiplier: 1,

          current_streak: streakData.currentStreak,
          max_streak: streakData.maxStreak,

          total_days_present: Object.values(xpCalculation.attendanceDetails).filter(day => day.present).length,
          total_hours: Object.values(xpCalculation.attendanceDetails).reduce((sum, day) => sum + (day.hours || 0), 0),

          // Daily attendance flags
          sunday_present: xpCalculation.attendanceDetails.sun.present,
          monday_present: xpCalculation.attendanceDetails.mon.present,
          tuesday_present: xpCalculation.attendanceDetails.tue.present,
          wednesday_present: xpCalculation.attendanceDetails.wed.present,
          thursday_present: xpCalculation.attendanceDetails.thu.present,
          friday_present: xpCalculation.attendanceDetails.fri.present,
          saturday_present: xpCalculation.attendanceDetails.sat.present,

          // Daily hours
          sunday_hours: xpCalculation.attendanceDetails.sun.hours,
          monday_hours: xpCalculation.attendanceDetails.mon.hours,
          tuesday_hours: xpCalculation.attendanceDetails.tue.hours,
          wednesday_hours: xpCalculation.attendanceDetails.wed.hours,
          thursday_hours: xpCalculation.attendanceDetails.thu.hours,
          friday_hours: xpCalculation.attendanceDetails.fri.hours,
          saturday_hours: xpCalculation.attendanceDetails.sat.hours,

          upload_date: new Date(),
          week_start_date: weekStartDate,
          week_end_date: weekEndDate,
          uploaded_by: uploadedBy
        }, { transaction });
      }
    }

    await transaction.commit();
    res.status(200).json({
      success: true,
      message: "Data saved successfully to database",
      xpCalculation: {
        formula: "XP = ((Base XP × Multiplier) - 1000 penalty) >= 0",
        description: "Base XP is multiplied by multiplier. Penalty (-1000) applies only if employee has some XP and missed days. Final XP cannot be negative.",
        xpPerDay: 2500,
        penaltyPerWeek: -1000,
        defaultMultiplier: 1,
        rules: [
          "Perfect attendance: No penalty",
          "Missing days + has XP: -1000 penalty",
          "Missing days + no XP: No penalty",
          "Final XP cannot be negative"
        ],
        examples: {
          "0 days present": "0 XP (no penalty applied)",
          "2 days present": "(2 × 2500 × 1) - 1000 = 4000 XP",
          "1 day present": "(1 × 2500 × 1) - 1000 = 1500 XP",
          "7 days present": "7 × 2500 × 1 = 17500 XP (no penalty)"
        }
      },
      streakCalculation: {
        description: "Streak counts consecutive days of attendance. Resets when a day is missed.",
        example: "If employee comes Sun, Mon, Tue, Wed then streak = 4"
      },
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

// Get ExcelAttendence Data
router.get("/users/xp-records", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // Optional filters
    const whereClause = {};
    if (req.query.location) whereClause.location = { [Op.like]: `%${req.query.location}%` };
    if (req.query.client) whereClause.client = { [Op.like]: `%${req.query.client}%` };
    if (req.query.week_start_date) whereClause.week_start_date = req.query.week_start_date;

    const { count, rows } = await EmployeeXpResults.findAndCountAll({
      where: whereClause,
      limit: pageSize,
      offset: offset,
      order: [['total_xp', 'DESC']],
    });

    const totalPages = Math.ceil(count / pageSize);

    const allRecords = await EmployeeXpResults.findAll({
      where: whereClause,
    });

    const statistics = {
      highestXP: allRecords.length > 0 ? Math.max(...allRecords.map(r => r.total_xp)) : 0,
      lowestXP: allRecords.length > 0 ? Math.min(...allRecords.map(r => r.total_xp)) : 0,
      averageXP: allRecords.length > 0 ? Math.round(
        allRecords.reduce((sum, r) => sum + r.total_xp, 0) / allRecords.length
      ) : 0,
      totalEmployees: count
    };

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalPages: totalPages,
        totalRecords: count,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      xpCalculation: {
        formula: "XP = 2500 × Number of Days Present (Cumulative across weeks)",
        description: "Employee gets 2500 XP for each day they have both check-in and check-out entries. XP accumulates weekly.",
        xpPerDay: 2500,
        maxWeeklyXP: 17500,
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
    const leaderboardUsers = await Users.findAll({
      include: [
        {
          model: Roles,
          as: "Roles",
          where: { name: "User" },
          through: { attributes: [] },
          attributes: [], // ✅ Do not return Roles in result
        },
      ],
      attributes: ["id", "name", "email", "curr_levels", "totalUserXp"],
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

module.exports = router;
