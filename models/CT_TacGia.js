const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Ánh xạ tới bảng CT_TACGIA [cite: 656]
const CT_TacGia = sequelize.define('CT_TacGia', {
  MaDauSach: {
    type: DataTypes.STRING(15),
    primaryKey: true,
    allowNull: false
  },
  MaTacGia: {
    type: DataTypes.STRING(15),
    primaryKey: true,
    allowNull: false
  }
}, {
  tableName: 'CT_TACGIA',
  timestamps: false
});

module.exports = CT_TacGia;