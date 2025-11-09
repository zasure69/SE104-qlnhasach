// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /dashboard/ -> Trang tổng quan
router.get('/', dashboardController.getDashboardPage);

module.exports = router;