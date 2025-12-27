const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Ánh xạ tới bảng TACGIA [cite: 656]
const TacGia = sequelize.define('TacGia', {
  MaTacGia: {
    type: DataTypes.STRING(15), 
    primaryKey: true,
    allowNull: false
  },
  HoTen: {
    type: DataTypes.STRING(50) 
  },
  NamSinh: {
    type: DataTypes.INTEGER
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  tableName: 'TACGIA',
  timestamps: false
});

module.exports = TacGia;