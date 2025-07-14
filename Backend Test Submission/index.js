const express = require('express');
const Log = require('../Logging Middleware/middleware/logger');
const urlRoutes = require('./routes/urlRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    Log("backend", "info", "route", `${req.method} ${req.path} - ${req.ip}`);
    next();
});

app.use('/', urlRoutes);

app.use('*', (req, res) => {
    Log("backend", "warn", "handler", `404 - Route not found: ${req.originalUrl}`);
    res.status(404).json({
        error: 'Route not found'
    });
});

app.use((error, req, res, next) => {
    Log("backend", "error", "handler", `Unhandled error: ${error.message}`);
    res.status(500).json({
        error: 'Internal server error'
    });
});

app.listen(PORT, () => {
    Log("backend", "info", "service", `URL Shortener Microservice started on port ${PORT}`);
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
