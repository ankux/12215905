const express = require('express');
const urlController = require('../controllers/urlController');

const router = express.Router();

router.post('/shorturls', urlController.createShortURL);

router.get('/shorturls/:shortcode', urlController.getStatistics);

router.get('/:shortcode', urlController.redirectToOriginalURL);

module.exports = router; 