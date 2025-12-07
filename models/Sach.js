const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Sach = sequelize.define('Sach', {
  MaSach: { 
    type: DataTypes.STRING(15),
    primaryKey: true,
    allowNull: false
  },
  MaDauSach: { 
    type: DataTypes.STRING(15),
    allowNull: false
  },
  NamXB: {
    type: DataTypes.INTEGER
  },
  NhaXB: {
    type: DataTypes.STRING(50)
  },
  SoLuongTon: { 
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  }
}, {
  tableName: 'SACH',
  timestamps: false
});

module.exports = Sach;