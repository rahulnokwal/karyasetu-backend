import multer from "multer";
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "/public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

export const uploadProfile = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedImages = ["image/jpeg", "image/png", "image/webp"];
    if (allowedImages.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new apiError(400, "Only JPG, PNG, and WebP are allowed."), false);
    }
  },
});

export const uploadNotes = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTextFiles = ["text/plain", "text/markdown"];
    if (allowedTextFiles.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new apiError(400, "Only .txt and .md files are allowed for notes."),
        false
      );
    }
  },
});
