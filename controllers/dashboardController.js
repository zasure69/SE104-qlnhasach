// controllers/dashboardController.js
const db = require('../models');
const { Op } = require('sequelize');

// --- Lấy thông tin User (để hiển thị tên) ---
const getUserInfo = (req) => {
    return {
      username: req.user.username,
      role: req.user.role
    };
  };
  
  // =============================================================
  //  Render Trang Tổng Quan (dashboard.ejs)
  // =============================================================
  const getDashboardPage = (req, res) => {
    try {
      res.render('dashboard', { ...getUserInfo(req) });
    } catch (err) {
      res.status(500).send('Lỗi Server');
    }
  };

  // Xuất tất cả các hàm
module.exports = {
    getDashboardPage
  };