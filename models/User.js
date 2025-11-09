const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Định nghĩa model 'User' (Ánh xạ tới bảng NHANVIEN)
const User = sequelize.define('User', {
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
    type: DataTypes.DATEONLY // Dùng DATEONLY thay vì DATE [cite: 761]
  },
  SoDienThoai: {
    type: DataTypes.STRING(15),
    unique: true // Ràng buộc UNIQUE [cite: 761]
  },
  ChucVu: {
    type: DataTypes.STRING(50) // NVARCHAR(50) -> STRING
  },
  Username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true // Ràng buộc NOT NULL, UNIQUE [cite: 761]
  },
  Password: {
    type: DataTypes.STRING(256), // Phải đủ dài để lưu hash [cite: 761]
    allowNull: false
  },
  NgayNhanViec: {
    type: DataTypes.DATEONLY, // Dùng DATEONLY [cite: 761]
    allowNull: false
  }
}, {
  // Cấu hình thêm
  tableName: 'NHANVIEN', // Chỉ định rõ tên bảng trong DB 
  timestamps: false // Tắt tự động thêm cột createdAt và updatedAt
});

module.exports = User;