const { Op } = require("sequelize");
const Sach = require("../models/Sach");
const DauSach = require("../models/DauSach");
const KhachHang = require("../models/KhachHang");
const HoaDon = require("../models/HoaDon");
const CT_HD = require("../models/CT_HD");
const PhieuThuTien = require("../models/PhieuThuTien");

module.exports = {

  // -------------------- BÁO CÁO TỒN KHO --------------------
  async getTonKhoData() {
    const data = await Sach.findAll({
      include: [{ model: DauSach }]
    });

    return data.map(item => ({
      MaSach: item.MaSach,
      TenSach: item.DauSach?.TenSach,
      SoLuongTon: item.SoLuongTon,
      NamXB: item.NamXB,
      NhaXB: item.NhaXB
    }));
  },

  async BaoCaoTon(req, res) {
    try {
      const ton = await module.exports.getTonKhoData();
      res.json(ton);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // -------------------- BÁO CÁO CÔNG NỢ --------------------
  async getCongNoData() {
    const listKH = await KhachHang.findAll({
      include: [
        { model: HoaDon },
        { model: PhieuThuTien }
      ]
    });

    return listKH.map(kh => {
      const tongHoaDon = kh.HoaDons.reduce(
        (sum, hd) => sum + parseFloat(hd.ConLai || 0),
        0
      );

      const tongThu = kh.PhieuThuTiens.reduce(
        (sum, pt) => sum + parseFloat(pt.SoTienThu || 0),
        0
      );

      return {
        MaKhachHang: kh.MaKhachHang,
        HoVaTen: kh.HoVaTen,
        TongNo: tongHoaDon - tongThu
      };
    });
  },

  async BaoCaoCongNo(req, res) {
    try {
      const congno = await module.exports.getCongNoData();
      res.json(congno);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // -------------------- BÁO CÁO DOANH THU --------------------
  async getDoanhThuData() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const lastDay = new Date(year, month, 0).getDate();

    const listHD = await HoaDon.findAll({
      where: {
        NgayLapHoaDon: {
          [Op.between]: [
            `${year}-${month}-01`,
            `${year}-${month}-${lastDay}`
          ]
        }
      },
      include: [{
        model: CT_HD,
        include: [{
          model: Sach,
          include: [DauSach]
        }]
      }]
    });

    let totalRevenue = 0;
    let revenueByCategory = {};

    listHD.forEach(hd => {
      hd.CT_HDs.forEach(detail => {
        totalRevenue += parseFloat(detail.ThanhTien);

        const theLoai = detail.Sach.DauSach.MaTheLoai;

        if (!revenueByCategory[theLoai]) {
          revenueByCategory[theLoai] = 0;
        }

        revenueByCategory[theLoai] += parseFloat(detail.ThanhTien);
      });
    });

    return { totalRevenue, revenueByCategory };
  },

  async BaoCaoDoanhThu(req, res) {
    try {
      const data = await module.exports.getDoanhThuData();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // -------------------- RENDER TRANG REPORT --------------------
  async RenderReportPage(req, res) {
    try {
      const username = req.session.username;

      const ton = await module.exports.getTonKhoData();
      const congno = await module.exports.getCongNoData();
      const doanhthu = await module.exports.getDoanhThuData();

      res.render("report", {
        username,
        ton,
        congno,
        doanhthu
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Lỗi tải báo cáo");
    }
  }

};
