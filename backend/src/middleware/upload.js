/**
 * Multer file upload middleware for local storage.
 * Files stored in backend/uploads/ directory.
 */
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOAD_DIR = path.resolve(__dirname, "../../", process.env.UPLOAD_DIR || "uploads");
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Storage config: organize by year/month
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const subDir = path.join(UPLOAD_DIR, `${now.getFullYear()}`, String(now.getMonth() + 1).padStart(2, "0"));
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    cb(null, subDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

// File filter: allow images and documents
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/zip", "application/x-zip-compressed",
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Allowed: JPEG, PNG, GIF, WebP, PDF, ZIP`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

/**
 * Convert uploaded file paths to API-accessible URLs.
 * @param {Express.Multer.File[]} files
 * @returns {string[]}
 */
function filesToUrls(files) {
  if (!files || files.length === 0) return [];
  return files.map(f => {
    // Convert absolute path to relative URL
    const relative = path.relative(UPLOAD_DIR, f.path).replace(/\\/g, "/");
    return `/uploads/${relative}`;
  });
}

module.exports = { upload, filesToUrls, UPLOAD_DIR };
