const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const DauSach = sequelize.define("DauSach", {
  MaDauSach: {
    type: DataTypes.STRING(15),
    primaryKey: true,
    allowNull: false
  },
  MaTheLoai: {
    type: DataTypes.STRING(15),
    allowNull: false
  },
  TenSach: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  MoTa: {
    type: DataTypes.TEXT
  }
}, {
  tableName: "DAUSACH",
  timestamps: false
});

module.exports = DauSach;
