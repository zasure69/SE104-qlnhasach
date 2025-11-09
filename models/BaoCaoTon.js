const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Ánh xạ tới bảng BAOCAOTON [cite: 833]
const BaoCaoTon = sequelize.define('BaoCaoTon', {
  MaSach: {
    type: DataTypes.STRING(15),
    primaryKey: true,
    allowNull: false
  },
  Thang: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  Nam: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  TonDau: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  TonCuoi: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  NhapTrongThang: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  BanTrongThang: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'BAOCAOTON',
  timestamps: false
});

module.exports = BaoCaoTon;