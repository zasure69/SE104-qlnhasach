const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Ánh xạ tới bảng THELOAI [cite: 806]
const TheLoai = sequelize.define('TheLoai', {
  MaTheLoai: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false
  },
  TenTheLoai: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  MoTa: {
    type: DataTypes.STRING(500)
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  tableName: 'THELOAI',
  timestamps: false
});

module.exports = TheLoai;