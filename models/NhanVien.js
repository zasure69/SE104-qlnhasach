const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Định nghĩa model 'NhanVien' (Ánh xạ tới bảng NHANVIEN)
const NhanVien = sequelize.define('NhanVien', {
  MaNhanVien: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false
  },
  HoTen: {
    type: DataTypes.STRING(100), // NVARCHAR(100) -> STRING
    allowNull: false
  },
  NgaySinh: {
    type: DataTypes.DATEONLY // Dùng DATEONLY thay vì DATE
  },
  SoDienThoai: {
    type: DataTypes.STRING(15),
    unique: true // Ràng buộc UNIQUE
  },
  ChucVu: {
    type: DataTypes.STRING(50) // NVARCHAR(50) -> STRING
  },
  Username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true // Ràng buộc NOT NULL, UNIQUE
  },
  Password: {
    type: DataTypes.STRING(256), // Phải đủ dài để lưu hash
    allowNull: false
  },
  NgayNhanViec: {
    type: DataTypes.DATEONLY, // Dùng DATEONLY
    allowNull: false
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  MaVaiTro: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'VAITRO',
      key: 'MaVaiTro'
    }
  }
}, {
  tableName: 'NHANVIEN', // Chỉ định rõ tên bảng trong DB 
  timestamps: false 
});

module.exports = NhanVien;
