const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs").promises;

const uploadPath = path.join(__dirname, "../uploads/documents");

// Ensure upload directory exists
(async () => {
  try {
    await fs.mkdir(uploadPath, { recursive: true });
  } catch (err) {
    console.error("Failed to create upload directory:", err);
  }
})();

// Allowed file types: PNG, JPG, JPEG, PDF
const allowedTypes = /jpeg|jpg|png|gif|webp|svg|bmp|tiff|pdf/;

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Multer Upload Configuration
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max file size
  fileFilter: (req, file, cb) => {
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and PDF files are allowed!"));
    }
  },
}).fields([
  { name: "aadharPhotos", maxCount: 2 },
  { name: "studentPhotos", maxCount: 2 },
  { name: "documents", maxCount: 2 }, // Allow PDF uploads
]);

// Image Compression Middleware (Compress only images)
const compressImage = async (req, res, next) => {
  if (!req.files) return next();

  try {
    const imageFiles = [...(req.files["aadharPhotos"] || []), ...(req.files["studentPhotos"] || [])];

    await Promise.all(
      imageFiles.map(async (file) => {
        if (!file.mimetype.startsWith("image/")) return; // Skip PDFs

        const compressedPath = path.join(uploadPath, `compressed-${file.filename}`);

        let quality = 70;
        let width = 800;
        let fileSize;

        do {
          await sharp(file.path)
            .resize({ width })
            .jpeg({ quality })
            .toFile(compressedPath);

          fileSize = (await fs.stat(compressedPath)).size / 1024;

          if (fileSize > 10) {
            quality -= 10;
            if (quality < 20) width -= 50;
          }
        } while (fileSize > 10 && quality >= 20 && width > 100);

        await fs.unlink(file.path).catch((err) => console.error("Failed to delete original file:", err));

        file.path = compressedPath;
        file.filename = `compressed-${file.filename}`;
      })
    );

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { upload, compressImage };
