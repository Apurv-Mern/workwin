const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-"); // ISO with : and . replaced
    // Example: 2025-05-30T14-30-15-123Z

    const newFilename = `${originalName}-${timestamp}${extension}`;
    cb(null, newFilename);
  },
});

const upload = multer({ storage });
module.exports = upload;
