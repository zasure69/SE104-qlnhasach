const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Ánh xạ tới bảng THAMSO [cite: 801]
const ThamSo = sequelize.define('ThamSo', {
  TenThamSo: {
    type: DataTypes.STRING(100),
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  GiaTri: {
    type: DataTypes.FLOAT
  }
}, {
  tableName: 'THAMSO',
  timestamps: false
});

module.exports = ThamSo;