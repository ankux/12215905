const axios = require('axios');
const Log = require('../../Logging Middleware/middleware/logger');

class URLShortenerService {
    constructor(baseUrl = 'http://localhost:3000') {
        this.urlMap = new Map();
        this.statsMap = new Map();
        this.baseUrl = baseUrl;
        Log("backend", "info", "service", "URL Shortener Service initialized");
    }

    async getCoarseLocationFromIP(ip) {
        if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
            return 'Local';
        }
        try {
            const response = await axios.get(`http://ip-api.com/json/${ip}?fields=country,regionName,city`);
            const { country, regionName } = response.data;
            if (country) {
                return regionName ? `${country}, ${regionName}` : country;
            } else {
                return 'Unknown';
            }
        } catch (error) {
            return 'Unknown';
        }
    }

    generateShortcode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    isValidShortcode(shortcode) {
        const shortcodeRegex = /^[a-zA-Z0-9]{3,20}$/;
        return shortcodeRegex.test(shortcode);
    }

    isShortcodeUnique(shortcode) {
        return !this.urlMap.has(shortcode);
    }

    createShortURL(originalUrl, validity = 30, customShortcode = null) {
        Log("backend", "info", "service", `Creating short URL for: ${originalUrl}`);
        if (!this.isValidURL(originalUrl)) {
            Log("backend", "error", "service", `Invalid URL provided: ${originalUrl}`);
            throw new Error('Invalid URL format');
        }
        if (customShortcode) {
            if (!this.isValidShortcode(customShortcode)) {
                Log("backend", "error", "service", `Invalid custom shortcode format: ${customShortcode}`);
                throw new Error('Invalid shortcode format. Must be 3-20 alphanumeric characters');
            }
            if (!this.isShortcodeUnique(customShortcode)) {
                Log("backend", "error", "service", `Custom shortcode already exists: ${customShortcode}`);
                throw new Error('Custom shortcode already exists');
            }
        }
        let shortcode = customShortcode;
        if (!shortcode) {
            do {
                shortcode = this.generateShortcode();
            } while (!this.isShortcodeUnique(shortcode));
        }
        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + validity);
        const urlData = {
            originalUrl,
            shortcode,
            createdAt: new Date(),
            expiryTime,
            validity
        };
        this.urlMap.set(shortcode, urlData);
        this.statsMap.set(shortcode, {
            totalClicks: 0,
            clicks: []
        });
        Log("backend", "info", "service", `Short URL created successfully: ${shortcode}`);
        return {
            shortLink: `${this.baseUrl}/${shortcode}`,
            expiry: expiryTime.toISOString()
        };
    }

    getOriginalURL(shortcode, requestInfo = {}) {
        Log("backend", "info", "service", `Looking up shortcode: ${shortcode}`);
        const urlData = this.urlMap.get(shortcode);
        if (!urlData) {
            Log("backend", "error", "service", `Shortcode not found: ${shortcode}`);
            throw new Error('Shortcode not found');
        }
        if (new Date() > urlData.expiryTime) {
            Log("backend", "warn", "service", `Short URL expired: ${shortcode}`);
            throw new Error('Short URL has expired');
        }
        return this.recordClick(shortcode, requestInfo).then(() => {
            Log("backend", "info", "service", `Redirecting ${shortcode} to ${urlData.originalUrl}`);
            return urlData.originalUrl;
        });
    }

    async recordClick(shortcode, requestInfo = {}) {
        const stats = this.statsMap.get(shortcode);
        if (stats) {
            stats.totalClicks++;
            const referrer = requestInfo.referrer || requestInfo.referer || 'direct';
            const ip = requestInfo.ip || 'unknown';
            const location = await this.getCoarseLocationFromIP(ip);
            stats.clicks.push({
                timestamp: new Date().toISOString(),
                referrer: referrer,
                location: location,
                ip: ip
            });
        }
    }

    getStatistics(shortcode) {
        Log("backend", "info", "service", `Getting statistics for shortcode: ${shortcode}`);
        const urlData = this.urlMap.get(shortcode);
        if (!urlData) {
            Log("backend", "error", "service", `Shortcode not found for statistics: ${shortcode}`);
            throw new Error('Shortcode not found');
        }
        const stats = this.statsMap.get(shortcode) || { totalClicks: 0, clicks: [] };
        return {
            shortcode,
            originalUrl: urlData.originalUrl,
            totalClicks: stats.totalClicks,
            createdAt: urlData.createdAt.toISOString(),
            expiryTime: urlData.expiryTime.toISOString(),
            clicks: stats.clicks
        };
    }
}

module.exports = URLShortenerService; 