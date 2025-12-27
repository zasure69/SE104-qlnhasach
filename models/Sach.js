const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Model SÁCH -> bảng SACH
const Sach = sequelize.define(
  "Sach",
  {
    MaSach: {
      type: DataTypes.STRING(15),
      primaryKey: true,
      allowNull: false,
    },
    MaDauSach: {
      type: DataTypes.STRING(15),
    },
    NhaXB: {
      type: DataTypes.STRING(255),
    },
    NamXB: {
      type: DataTypes.INTEGER,
    },
    SoLuongTon: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    tableName: "SACH",
    timestamps: false,
  }
);

module.exports = Sach;
