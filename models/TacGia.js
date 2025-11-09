const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Ánh xạ tới bảng TACGIA [cite: 656]
const TacGia = sequelize.define('TacGia', {
  MaTacGia: {
    type: DataTypes.STRING(15), // Giả định kiểu dữ liệu
    primaryKey: true,
    allowNull: false
  },
  HoTen: {
    type: DataTypes.STRING(100) // Giả định
  },
  NamSinh: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'TACGIA',
  timestamps: false
});

module.exports = TacGia;