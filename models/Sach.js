const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const DauSach = require("./DauSach");

const Sach = sequelize.define("Sach", {
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
    type: DataTypes.STRING(255)
  },
  SoLuongTon: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: "SACH",
  timestamps: false
});

module.exports = Sach;
