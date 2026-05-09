const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { ApiError } = require("../utils/http");

const uploadRoot = path.join(process.cwd(), "uploads", "profile_pictures");
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadRoot);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? ext : ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const uploadProfilePicture = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      cb(new ApiError(400, "invalid_file_type", "Only image files are allowed."));
      return;
    }
    cb(null, true);
  },
});

module.exports = {
  uploadProfilePicture,
};
