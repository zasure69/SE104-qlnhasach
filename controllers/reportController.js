const { Op } = require("sequelize");
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
                username: req.session.username,
                
            });
        } catch (err) {
            res.status(500).send("Lỗi tải trang");
        }
    },
    async getDoanhThuAPI(req, res) {
    try {
      let { month, year } = req.query;
      month = parseInt(month);
      year = parseInt(year);
      const startDate = new Date(year, month - 1, 1); 
      const endDate = new Date(year, month, 0, 23, 59, 59);
      const listHD = await HoaDon.findAll({
        where: {
          NgayLapHoaDon: {
            [Op.between]: [startDate, endDate] 
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
      let reportData = {};
      let totalRevenue = 0;
      listHD.forEach(hd => {
        hd.CT_HD.forEach(ct => {
           const donGia = parseFloat(ct.DonGiaBan);
           const soLuong = parseInt(ct.SoLuong);
           const thanhTien = donGia * soLuong;
           const theLoai = ct.Sach.DauSach.MaTheLoai || "Khác"; 
           if (!reportData[theLoai]) {
               reportData[theLoai] = {
                   MaTheLoai: theLoai,
                   SoLuongBan: 0,
                   ThanhTien: 0
               };
           }
           reportData[theLoai].SoLuongBan += soLuong;
           reportData[theLoai].ThanhTien += thanhTien;
           totalRevenue += thanhTien;
        });
      });
      const result = Object.values(reportData).map(item => ({
          ...item,
          TiLe: totalRevenue > 0 ? ((item.ThanhTien / totalRevenue) * 100).toFixed(2) + "%" : "0%"
      }));
      res.json({ data: result, totalRevenue });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },
  async getCongNoAPI(req, res) {
    try {
      let { month, year } = req.query;
      month = parseInt(month);
      year = parseInt(year);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      const listKH = await KhachHang.findAll();
      const result = await Promise.all(listKH.map(async (kh) => {
        const tongHD_Truoc = await HoaDon.sum('ConLai', { 
          where: {
            MaKhachHang: kh.MaKhachHang,
            NgayLapHoaDon: { [Op.lt]: startDate } 
          }
        }) || 0;
        const totalMua_Truoc = await HoaDon.sum('TongTien', { // Lấy cột tổng tiền hóa đơn
           where: { MaKhachHang: kh.MaKhachHang, NgayLapHoaDon: { [Op.lt]: startDate } }
        }) || 0;
        
        const totalTra_Truoc = await PhieuThuTien.sum('SoTienThu', {
           where: { MaKhachHang: kh.MaKhachHang, NgayThuTien: { [Op.lt]: startDate } }
        }) || 0;
        const noDau = totalMua_Truoc - totalTra_Truoc;
        const noPhatSinh = await HoaDon.sum('TongTien', {
          where: {
            MaKhachHang: kh.MaKhachHang,
            NgayLapHoaDon: { [Op.between]: [startDate, endDate] }
          }
        }) || 0;
        const daTra = await PhieuThuTien.sum('SoTienThu', {
          where: {
            MaKhachHang: kh.MaKhachHang,
            NgayThuTien: { [Op.between]: [startDate, endDate] }
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

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Cần import thêm model PhieuNhap và CT_PhieuNhap ở đầu file nếu chưa có
      // const PhieuNhap = require("../models/PhieuNhap");
      // const CT_PhieuNhap = require("../models/CT_PhieuNhap");

      const listSach = await Sach.findAll({
        include: [{ model: DauSach }]
      });

      const result = await Promise.all(listSach.map(async (sach) => {
        
        // 1. Tính Tồn Đầu: (Tổng Nhập < Start) - (Tổng Bán < Start)
        // Lưu ý: Đây là query khá nặng nếu dữ liệu lớn. 
        
        // Lấy tổng nhập trước tháng này
        const nhapTruoc = await CT_PNS.sum('SoLuong', {
            include: [{
                model: require("../models/PhieuNhapSach"), // Include để check ngày
                where: { NgayNhap: { [Op.lt]: startDate } }
            }],
            where: { MaSach: sach.MaSach }
        }) || 0;

        // Lấy tổng bán trước tháng này
        const banTruoc = await CT_HD.sum('SoLuong', {
            include: [{
                model: HoaDon,
                where: { NgayLapHoaDon: { [Op.lt]: startDate } }
            }],
            where: { MaSach: sach.MaSach }
        }) || 0;

        const tonDau = nhapTruoc - banTruoc;

        // 2. Tính Nhập Trong Tháng
        const nhapTrongThang = await CT_PNS.sum('SoLuong', {
            include: [{
                model: require("../models/PhieuNhapSach"),
                where: { NgayNhap: { [Op.between]: [startDate, endDate] } }
            }],
            where: { MaSach: sach.MaSach }
        }) || 0;

        // 3. Tính Bán Trong Tháng
        const banTrongThang = await CT_HD.sum('SoLuong', {
            include: [{
                model: HoaDon,
                where: { NgayLapHoaDon: { [Op.between]: [startDate, endDate] } }
            }],
            where: { MaSach: sach.MaSach }
        }) || 0;

        // 4. Tính Tồn Cuối
        const tonCuoi = tonDau + nhapTrongThang - banTrongThang;

        return {
          MaSach: sach.MaSach,
          TenSach: sach.DauSach ? sach.DauSach.TenSach : "Sách lỗi",
          TonDau: tonDau,
          Nhap: nhapTrongThang,
          Ban: banTrongThang,
          TonCuoi: tonCuoi
        };
      }));

      res.json({ data: result });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Lỗi tính tồn kho: " + err.message });
    }
  }
};