const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Model VaiTro_Quyen - Bảng trung gian liên kết Vai trò và Quyền
const VaiTro_Quyen = sequelize.define('VaiTro_Quyen', {
  MaVaiTro: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'VAITRO',
      key: 'MaVaiTro'
    }
  },
  MaQuyen: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'QUYEN',
      key: 'MaQuyen'
    }
  }
}, {
  tableName: 'VAITRO_QUYEN',
  timestamps: false
});

module.exports = VaiTro_Quyen;
