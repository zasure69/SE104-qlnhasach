const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Model ĐẦU SÁCH -> bảng DAUSACH
const DauSach = sequelize.define(
  "DauSach",
  {
    MaDauSach: {
      type: DataTypes.STRING(15),
      primaryKey: true,
      allowNull: false,
    },
    TenSach: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    MaTheLoai: {
      type: DataTypes.STRING(10),
    },
    MoTa: {
      type: DataTypes.STRING(1000),
    },
  },
  {
    tableName: "DAUSACH",
    timestamps: false,
  }
);

module.exports = DauSach;
