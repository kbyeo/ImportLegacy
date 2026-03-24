const path = require('path');
const multer = require('multer');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const isCsvExt = ext === '.csv';

  if (isCsvExt) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only .csv files are allowed', 'INVALID_FILE_TYPE'), false);
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter,
});

module.exports = upload;
