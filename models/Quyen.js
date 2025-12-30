const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Model Quyen - Danh sách các quyền trong hệ thống
const Quyen = sequelize.define('Quyen', {
  MaQuyen: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  TenQuyen: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  MoTa: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  NhomQuyen: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Nhóm quyền: sach, nhapsach, hoadon, khachhang, nhanvien, baocao, caidat'
  }
}, {
  tableName: 'QUYEN',
  timestamps: false
});

module.exports = Quyen;
