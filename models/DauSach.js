const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DauSach = sequelize.define('DauSach', {
  MaDauSach: {
    type: DataTypes.STRING(15),
    primaryKey: true,
    allowNull: false
  },
  MaTheLoai: { // Foreign Key
    type: DataTypes.STRING(10), 
    allowNull: true
  },
  TenSach: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  MoTa: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'DAUSACH',
  timestamps: false
});

module.exports = DauSach;