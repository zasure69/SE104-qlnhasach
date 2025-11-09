const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Ánh xạ tới bảng BAOCAOCONGNO [cite: 836]
const BaoCaoCongNo = sequelize.define('BaoCaoCongNo', {
  MaKhachHang: {
    type: DataTypes.STRING(15),
    primaryKey: true, // Sửa: Thêm PK
    allowNull: false
  },
  Thang: {
    type: DataTypes.INTEGER,
    primaryKey: true, // Sửa: Thêm PK
    allowNull: false
  },
  Nam: {
    type: DataTypes.INTEGER,
    primaryKey: true, // Sửa: Thêm PK
    allowNull: false
  },
  NoDau: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  NoCuoi: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  NoPhatSinh: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'BAOCAOCONGNO',
  timestamps: false
});

module.exports = BaoCaoCongNo;