const { Router } = require('express');
const { getImportStatus } = require('../controllers/import.controller');

const router = Router();

router.get('/:jobId', getImportStatus);

module.exports = router;
