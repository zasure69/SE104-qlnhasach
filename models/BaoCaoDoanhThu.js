const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Ánh xạ tới bảng BAOCAODOANHTHU [cite: 839]
const BaoCaoDoanhThu = sequelize.define('BaoCaoDoanhThu', {
  MaTheLoai: {
    type: DataTypes.STRING(10), // Sửa: 20->10
    primaryKey: true, // Sửa: Thêm PK
    allowNull: false
  },
  Thang: {
    type: DataTypes.INTEGER,
    primaryKey: true, // Sửa: Thêm PK
    allowNull: false
  },
  Nam: {
    type: DataTypes.INTEGER,
    primaryKey: true, // Sửa: Thêm PK
    allowNull: false
  },
  SoLuongBan: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ThanhTien: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  TongDoanhThu: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  TiLe: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
}, {
  tableName: 'BAOCAODOANHTHU',
  timestamps: false
});

module.exports = BaoCaoDoanhThu;