const { Op, Sequelize } = require("sequelize");
const Sach = require("../models/Sach");
const DauSach = require("../models/DauSach");
const TheLoai = require("../models/TheLoai"); 
const KhachHang = require("../models/KhachHang");
const HoaDon = require("../models/HoaDon");
const CT_HD = require("../models/CT_HD");
const PhieuThuTien = require("../models/PhieuThuTien");
const PhieuNhapSach = require("../models/PhieuNhapSach");
const CT_PNS = require("../models/CT_PNS");

module.exports = {
  async RenderReportPage(req, res) {
    try {
            res.render("report", { 
                username: req.user.username,
                role: req.user.role,
                bcton: [], 
                bccongno: [],
                bcdoanhthu: []
            });
        } catch (err) {
          console.error(err);
            res.status(500).send("Lỗi tải trang");
        }
    },
 async getDoanhThuAPI(req, res) {
  try {
    let { month, year } = req.query;
    month = parseInt(month);
    year = parseInt(year);

    if (!month || !year) {
      return res.json({ data: [], totalRevenue: 0 });
    }

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const revenueByGenre = await CT_HD.findAll({
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('CT_HD.SoLuongBan')), 'SoLuongBan'],
        [Sequelize.fn('SUM', Sequelize.col('CT_HD.ThanhTien')), 'ThanhTien'],
      ],
      include: [
        {
          model: HoaDon,
          attributes: [],
          where: {
            isDeleted: false,
            NgayLapHoaDon: { [Op.between]: [startDate, endDate] }
          },
          required: true
        },
        {
          model: Sach,
          attributes: [],
          required: true,
          include: [
            {
              model: DauSach,
              attributes: ['MaTheLoai'],
              required: true
            }
          ]
        }
      ],
      group: ['Sach->DauSach.MaTheLoai'],
      raw: true
    });

    const totalRevenue = revenueByGenre.reduce(
      (sum, item) => sum + Number(item.ThanhTien || 0),
      0
    );

    const result = revenueByGenre.map(item => ({
      MaTheLoai: item['Sach.DauSach.MaTheLoai'], 
      SoLuongBan: Number(item.SoLuongBan),
      ThanhTien: Number(item.ThanhTien),
      TiLe: totalRevenue > 0
        ? ((item.ThanhTien / totalRevenue) * 100).toFixed(2) + '%'
        : '0%'
    }));

    res.json({ data: result, totalRevenue });

  } catch (err) {
    console.error("Lỗi báo cáo doanh thu:", err);
    res.status(500).json({ error: err.message });
  }
}

,
  async getCongNoAPI(req, res) {
    try {
      let { month, year } = req.query;
      month = parseInt(month);
      year = parseInt(year);

      const startDate = new Date(year, month - 1, 1, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      // For NgayThuTien, which is DATEONLY
      const formattedStartDateOnly = `${year}-${String(month).padStart(2, '0')}-01`;
      const formattedEndDateOnly = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

      const listKH = await KhachHang.findAll({ where: { isDeleted: false } });

      const result = await Promise.all(listKH.map(async (kh) => {
        const tongHD_Truoc = await HoaDon.sum('ConLai', {
          where: {
            MaKhachHang: kh.MaKhachHang,
            isDeleted: false,
            NgayLapHoaDon: { [Op.lt]: startDate }
          }
        }) || 0;
        const totalMua_Truoc = await HoaDon.sum('ConLai', {
           where: { MaKhachHang: kh.MaKhachHang, isDeleted: false, NgayLapHoaDon: { [Op.lt]: startDate } }
        }) || 0;
        
        const totalTra_Truoc = await PhieuThuTien.sum('SoTienThu', {
           where: { MaKhachHang: kh.MaKhachHang, isDeleted: false, NgayThuTien: { [Op.lt]: formattedStartDateOnly } }
        }) || 0;
        const noDau = totalMua_Truoc - totalTra_Truoc;
        const noPhatSinh = await HoaDon.sum('ConLai', {
          where: {
            MaKhachHang: kh.MaKhachHang,
            isDeleted: false,
            NgayLapHoaDon: { [Op.between]: [startDate, endDate] }
          }
        }) || 0;
        const daTra = await PhieuThuTien.sum('SoTienThu', {
          where: {
            MaKhachHang: kh.MaKhachHang,
            isDeleted: false,
            NgayThuTien: { [Op.between]: [formattedStartDateOnly, formattedEndDateOnly] }
          }
        }) || 0;
        const noCuoi = noDau + noPhatSinh - daTra;

        if (noDau !== 0 || noPhatSinh !== 0 || daTra !== 0) {
          return {
            MaKhachHang: kh.MaKhachHang,
            HoVaTen: kh.HoVaTen,
            NoDau: noDau,
            NoPhatSinh: noPhatSinh,
            NoCuoi: noCuoi
          };
        }
        return null;
      }));
      const cleanResult = result.filter(item => item !== null);
      res.json({ data: cleanResult });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Lỗi tính công nợ: " + err.message });
    }
  },


async getTonKhoAPI(req, res) {
  try {
    let { month, year } = req.query;
    month = parseInt(month);
    year = parseInt(year);

    if (!month || !year) {
      return res.json({ data: [] });
    }

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const listSach = await Sach.findAll({
      where: { isDeleted: false },
      include: [{ model: DauSach, where: { isDeleted: false }, required: false }]
    });

    const result = await Promise.all(
      listSach.map(async (sach) => {

        // 🔹 NHẬP TRƯỚC THÁNG
        const nhapTruoc = await CT_PNS.sum("SoLuong", {
          include: [{
            model: PhieuNhapSach,
            where: { isDeleted: false, NgayNhapPhieu: { [Op.lt]: startDate } }
          }],
          where: { MaSach: sach.MaSach }
        }) || 0;

        // 🔹 BÁN TRƯỚC THÁNG
        const banTruoc = await CT_HD.sum("SoLuongBan", {
          include: [{
            model: HoaDon,
            where: { isDeleted: false, NgayLapHoaDon: { [Op.lt]: startDate } }
          }],
          where: { MaSach: sach.MaSach }
        }) || 0;

        const tonDau = nhapTruoc - banTruoc;

        // 🔹 NHẬP TRONG THÁNG
        const nhapTrongThang = await CT_PNS.sum("SoLuong", {
          include: [{
            model: PhieuNhapSach,
            where: { isDeleted: false, NgayNhapPhieu: { [Op.between]: [startDate, endDate] } }
          }],
          where: { MaSach: sach.MaSach }
        }) || 0;

        // 🔹 BÁN TRONG THÁNG
        const banTrongThang = await CT_HD.sum("SoLuongBan", {
          include: [{
            model: HoaDon,
            where: { isDeleted: false, NgayLapHoaDon: { [Op.between]: [startDate, endDate] } }
          }],
          where: { MaSach: sach.MaSach }
        }) || 0;

        const tonCuoi = tonDau + nhapTrongThang - banTrongThang;

        return {
          MaSach: sach.MaSach,
          TenSach: sach.DauSach?.TenSach || "Không xác định",
          TonDau: tonDau,
          Nhap: nhapTrongThang,
          Ban: banTrongThang,
          TonCuoi: tonCuoi
        };
      })
    );

    res.json({ data: result });

  } catch (err) {
    console.error("Lỗi tồn kho:", err);
    res.status(500).json({ error: err.message });
  }
}};