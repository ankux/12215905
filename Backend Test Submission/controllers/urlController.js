const URLShortenerService = require('../services/urlShortener');
const Log = require('../../Logging Middleware/middleware/logger');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const urlService = new URLShortenerService(baseUrl);

class URLController {
    async createShortURL(req, res) {
        try {
            Log("backend", "info", "handler", "POST /shorturls - Creating short URL");
            const { url, validity = 30, shortcode } = req.body;
            if (!url) {
                Log("backend", "error", "handler", "Missing required field: url");
                return res.status(400).json({ error: 'Missing required field: url' });
            }
            if (validity && (!Number.isInteger(validity) || validity <= 0)) {
                Log("backend", "error", "handler", `Invalid validity value: ${validity}`);
                return res.status(400).json({ error: 'Validity must be a positive integer' });
            }
            const result = urlService.createShortURL(url, validity, shortcode);
            Log("backend", "info", "handler", `Short URL created successfully: ${result.shortLink}`);
            res.status(201).json({ shortLink: result.shortLink, expiry: result.expiry });
        } catch (error) {
            Log("backend", "error", "handler", `Error creating short URL: ${error.message}`);
            if (error.message.includes('Invalid URL format')) {
                return res.status(400).json({ error: 'Invalid URL format' });
            }
            if (error.message.includes('Invalid shortcode format')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes('already exists')) {
                return res.status(409).json({ error: error.message });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getStatistics(req, res) {
        try {
            const { shortcode } = req.params;
            Log("backend", "info", "handler", `GET /shorturls/${shortcode} - Getting statistics`);
            if (!urlService.isValidShortcode(shortcode)) {
                Log("backend", "error", "handler", `Invalid shortcode format: ${shortcode}`);
                return res.status(400).json({ error: 'Invalid shortcode format' });
            }
            const statistics = urlService.getStatistics(shortcode);
            Log("backend", "info", "handler", `Statistics retrieved successfully for: ${shortcode}`);
            res.json(statistics);
        } catch (error) {
            Log("backend", "error", "handler", `Error getting statistics: ${error.message}`);
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: 'Shortcode not found' });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async redirectToOriginalURL(req, res) {
        try {
            const { shortcode } = req.params;
            Log("backend", "info", "handler", `GET /${shortcode} - Redirecting to original URL`);
            if (!urlService.isValidShortcode(shortcode)) {
                Log("backend", "error", "handler", `Invalid shortcode format: ${shortcode}`);
                return res.status(400).json({ error: 'Invalid shortcode format' });
            }
            const requestInfo = {
                ip: req.ip || req.connection.remoteAddress,
                referrer: req.headers.referer || req.headers.referrer,
                userAgent: req.headers['user-agent']
            };
            const originalUrl = await urlService.getOriginalURL(shortcode, requestInfo);
            Log("backend", "info", "handler", `Redirecting ${shortcode} to ${originalUrl}`);
            res.redirect(originalUrl);
        } catch (error) {
            Log("backend", "error", "handler", `Error redirecting: ${error.message}`);
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: 'Shortcode not found' });
            }
            if (error.message.includes('expired')) {
                return res.status(410).json({ error: 'Short URL has expired' });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = new URLController(); 