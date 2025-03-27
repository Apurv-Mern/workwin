const router = require("express").Router();
const moment = require("moment");
const config = require("config");
const { sequelize } = require("../../../models");
const initModels = require("../../../models/init-models");
const ModelsData = initModels(sequelize);
const { Users, Session, Roles, Permissions } = ModelsData;
const HelperUtils = require("./../../../utils/helpers");
// const HelperOpenAi = require("./../../../utils/openAiHelper");
const jwt = require("jsonwebtoken");
const JWT_SECRET = config.get("jwtSecret");
const { Sequelize } = require('sequelize');
const userAuthMiddleware = require("../../../middleware/userAuthMiddleware");
const fs = require("fs/promises");
const path = require("path");
const { DateTime } = require("luxon");
const multer = require("multer");
const fsData = require("fs");
const axios = require("axios");
const FormData = require("form-data");
// const ExcelJS = require("exceljs");

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".webm", ".ogg", ".mp3", ".wav"];
    const allowedMimeTypes = [
      "audio/webm",
      "audio/ogg",
      "audio/mpeg",
      "audio/wav",
      "video/webm",
    ];
    const fileExtension = require("path")
      .extname(file.originalname)
      .toLowerCase();

    console.log("Uploaded file extension:", fileExtension);
    console.log("Uploaded file MIME type:", file.mimetype);

    if (
      file.mimetype.startsWith("audio/") ||
      allowedMimeTypes.includes(file.mimetype) ||
      allowedExtensions.includes(fileExtension)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

/*  Signup Api and login api from google it's get response from google
 *  @Apipath: api/v1/user/user_signup
 *  @Method: POST
 *  @Params: in body type raw json{
 *    "email":"email of the user get from google."
 *    "name":"name of the user get from google"
 *  }
 *  @Tags: This API is used for signup user or login and return the token in response
 */

// User Signup
router.post('/user_signup', async (req, res) => {
  const { name, email, password } = req.body;
  try{
    if (!email || !password || !name) {
      return res.status(401).send(HelperUtils.errorObj("Name, email, and password are required"));
    }
  
    const existingUser = await Users.findOne({ where: { email } });
    if (existingUser) {
      return res.status(401).send(HelperUtils.errorObj("This email already exists"));
    }
  
    const hashedPassword = await require("bcryptjs").hash(password, 10);
    const user = await Users.create({ name, email, password: hashedPassword });
  
    let userRole = await Roles.findOne({ where: { name: "User" } });
    if (!userRole) {
      userRole = await Roles.create({ name: "User", description: "Default app user" });
    }
  
    await sequelize.models.UserRoles.create({
      userId: user.id,
      roleId: userRole.id
    });
  
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1d"
    });
  
    await Session.upsert({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  
    const userData = user.toJSON();
    delete userData.password;
  
    res.status(200).send(HelperUtils.successObj("Signup successful", { ...userData, token }));
  }catch(error){
    console.error("Error in api:", error);
    return res.status(401).send({ success: false, message: "Something went wrong." });
  }
});


// User Login
router.post('/user_login', async (req, res) => {
  const { email, password } = req.body;
  try{
    if (!email || !password) {
      return res.status(401).send(HelperUtils.errorObj("Email and password are required"));
    }
  
    const user = await Users.findOne({ where: { email } });
    if (!user) {
      return res.status(401).send(HelperUtils.errorObj("Invalid credentials"));
    }
  
    const valid = await require("bcryptjs").compare(password, user.password);
    if (!valid) {
      return res.status(401).send(HelperUtils.errorObj("Invalid credentials"));
    }
  
    if(user.status == "inactive"){
      return res.status(401).send(HelperUtils.errorObj("Your account has been blocked please contact adminstator."));
    }
  
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1d"
    });
  
    await Session.upsert({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  
    const userData = user.toJSON();
    delete userData.password;
  
    res.status(200).send(HelperUtils.successObj("Login successful", { ...userData, token }));
  
  }catch(error){
    console.error("Error in api:", error);
    return res.status(401).send({ success: false, message: "Something went wrong." });
  }
});


// Get User Profile

router.get('/me', userAuthMiddleware, async (req, res) => {
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
    
    res.status(200).send(HelperUtils.successObj("User profile fetched", userData));
  } catch (error) {
    console.error("Error in /me API:", error);
    return res.status(500).send({ success: false, message: "Something went wrong." });
  }
});

module.exports = router;
