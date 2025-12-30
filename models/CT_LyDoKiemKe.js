const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CT_LyDoKiemKe = sequelize.define(
  "CT_LyDoKiemKe",
  {
    Id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    MaPhieuKiem: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    MaSach: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    MaLyDo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    LyDoKhac: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Lý do khác nếu không có trong danh sách",
    },
    SoLuong: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Số lượng lệch do lý do này",
    },
  },
  {
    tableName: "CT_LYDO_KIEMKE",
    timestamps: false,
  }
);

module.exports = CT_LyDoKiemKe;
