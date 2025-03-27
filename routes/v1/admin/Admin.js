const router = require("express").Router();
const moment = require("moment");
const config = require("config");
const path = require("path");
const { sequelize } = require("../../../models");
const initModels = require("../../../models/init-models");
const ModelsData = initModels(sequelize);
const { Users, Session, Roles, Permissions } = ModelsData;
const HelperUtils = require("./../../../utils/helpers");
// const HelperOpenAi = require("./../../../utils/openAiHelper");
const jwt = require("jsonwebtoken");
const JWT_SECRET = config.get("jwtSecret");
const { Sequelize } = require('sequelize');
// const authenticateToken = require("./../../middleware/authMiddleware");
const fs = require("fs/promises");
const { DateTime } = require("luxon");
const multer = require("multer");
const fsData = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const bcrypt = require('bcryptjs');
const TOKEN_EXPIRY = "1d";

router.post('/admin_login', async (req, res) => {
    const { email, password } = req.body;
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

    const permissions = user.Roles.flatMap(role => role.Permissions.map(p => p.name));
    const token = jwt.sign(
        { userId: user.id, roles: user.Roles.map(r => r.name), permissions },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );

    await Session.create({
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    // Convert Sequelize instance to plain object and remove password
    const userData = user.toJSON();
    delete userData.password;
    return res.status(200).send(
        HelperUtils.successObj("Login successful", {
        ...userData,
        token
        })
    );
});
module.exports = router;