const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Ánh xạ tới bảng PHIEUTHUTIEN
const PhieuThuTien = sequelize.define('PhieuThuTien', {
  MaPhieuThu: {
    type: DataTypes.STRING(20),
    primaryKey: true
  },
  MaKhachHang: {
    type: DataTypes.STRING(15)
  },
  MaNhanVien: {
    type: DataTypes.STRING(20),
  },
  NgayThuTien: {
    type: DataTypes.DATEONLY, // DATE
    allowNull: false
  },
  SoTienThu: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'PHIEUTHUTIEN',
  timestamps: false
});

module.exports = PhieuThuTien;