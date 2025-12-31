const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Model VaiTro - Các vai trò trong hệ thống
const VaiTro = sequelize.define('VaiTro', {
  MaVaiTro: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  TenVaiTro: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  MoTa: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'VAITRO',
  timestamps: false
});

module.exports = VaiTro;
