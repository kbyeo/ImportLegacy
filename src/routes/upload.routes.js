const { Router } = require('express');
const upload = require('../middleware/upload');
const { uploadFile } = require('../controllers/upload.controller');

const router = Router();

router.post('/', upload.single('file'), uploadFile);

module.exports = router;
