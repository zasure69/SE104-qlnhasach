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
const BaoCaoDoanhThu = require("../models/BaoCaoDoanhThu");
const BaoCaoCongNo = require("../models/BaoCaoCongNo");
const BaoCaoTon = require("../models/BaoCaoTon");

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

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const startOfSelectedMonth = new Date(year, month - 1, 1);
    
    // Kiểm tra nếu tháng được chọn là tháng tương lai
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return res.status(400).json({ 
        error: `Báo cáo tháng ${month}/${year} chưa khả dụng. Tháng này chưa bắt đầu.` 
      });
    }

    // Xác định có phải tháng hiện tại không
    const isCurrentMonth = (year === currentYear && month === currentMonth);

    // Nếu KHÔNG phải tháng hiện tại -> kiểm tra cache
    if (!isCurrentMonth) {
      const cachedData = await BaoCaoDoanhThu.findAll({
        where: { Thang: month, Nam: year }
      });

      if (cachedData && cachedData.length > 0) {
        // Đã có trong DB -> lấy ra luôn
        const totalRevenue = cachedData.length > 0 ? cachedData[0].TongDoanhThu : 0;
        const result = cachedData.map(item => ({
          MaTheLoai: item.MaTheLoai,
          SoLuongBan: item.SoLuongBan,
          ThanhTien: item.ThanhTien,
          TiLe: item.TiLe.toFixed(2) + '%'
        }));
        return res.json({ data: result, totalRevenue, fromCache: true });
      }
    }

    // Chưa có -> tính toán
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

    // Lưu vào DB để cache (chỉ lưu nếu không phải tháng hiện tại)
    if (!isCurrentMonth) {
      for (const item of result) {
        await BaoCaoDoanhThu.upsert({
          MaTheLoai: item.MaTheLoai,
          Thang: month,
          Nam: year,
          SoLuongBan: item.SoLuongBan,
          ThanhTien: item.ThanhTien,
          TongDoanhThu: totalRevenue,
          TiLe: parseFloat(item.TiLe)
        });
      }
    }

    res.json({ data: result, totalRevenue, fromCache: false, isCurrentMonth });

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

      if (!month || !year) {
        return res.json({ data: [] });
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // Kiểm tra nếu tháng được chọn là tháng tương lai
      if (year > currentYear || (year === currentYear && month > currentMonth)) {
        return res.status(400).json({ 
          error: `Báo cáo tháng ${month}/${year} chưa khả dụng. Tháng này chưa bắt đầu.` 
        });
      }

      // Xác định có phải tháng hiện tại không
      const isCurrentMonth = (year === currentYear && month === currentMonth);

      // Nếu KHÔNG phải tháng hiện tại -> kiểm tra cache
      if (!isCurrentMonth) {
        const cachedData = await BaoCaoCongNo.findAll({
          where: { Thang: month, Nam: year },
          include: [{ model: KhachHang, attributes: ['HoVaTen'], required: false }]
        });

        if (cachedData && cachedData.length > 0) {
          // Đã có trong DB -> lấy ra luôn
          const result = cachedData.map(item => ({
            MaKhachHang: item.MaKhachHang,
            HoVaTen: item.KhachHang?.HoVaTen || 'Không xác định',
            NoDau: item.NoDau,
            NoPhatSinh: item.NoPhatSinh,
            NoCuoi: item.NoCuoi
          }));
          return res.json({ data: result, fromCache: true });
        }
      }

      // Chưa có -> tính toán
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

      // Lưu vào DB để cache (chỉ lưu nếu không phải tháng hiện tại)
      if (!isCurrentMonth) {
        for (const item of cleanResult) {
          await BaoCaoCongNo.upsert({
            MaKhachHang: item.MaKhachHang,
            Thang: month,
            Nam: year,
            NoDau: item.NoDau,
            NoPhatSinh: item.NoPhatSinh,
            NoCuoi: item.NoCuoi
          });
        }
      }

      res.json({ data: cleanResult, fromCache: false, isCurrentMonth });

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

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Kiểm tra nếu tháng được chọn là tháng tương lai
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return res.status(400).json({ 
        error: `Báo cáo tháng ${month}/${year} chưa khả dụng. Tháng này chưa bắt đầu.` 
      });
    }

    // Xác định có phải tháng hiện tại không
    const isCurrentMonth = (year === currentYear && month === currentMonth);

    // Nếu KHÔNG phải tháng hiện tại -> kiểm tra cache
    if (!isCurrentMonth) {
      const cachedData = await BaoCaoTon.findAll({
        where: { Thang: month, Nam: year },
        include: [{ 
          model: Sach, 
          attributes: ['MaSach'],
          include: [{ model: DauSach, attributes: ['TenSach'], required: false }],
          required: false 
        }]
      });

      if (cachedData && cachedData.length > 0) {
        // Đã có trong DB -> lấy ra luôn
        const result = cachedData.map(item => ({
          MaSach: item.MaSach,
          TenSach: item.Sach?.DauSach?.TenSach || 'Không xác định',
          TonDau: item.TonDau,
          Nhap: item.NhapTrongThang,
          Ban: item.BanTrongThang,
          TonCuoi: item.TonCuoi
        }));
        return res.json({ data: result, fromCache: true });
      }
    }

    // Chưa có -> tính toán
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

    // Lưu vào DB để cache (chỉ lưu nếu không phải tháng hiện tại)
    if (!isCurrentMonth) {
      for (const item of result) {
        await BaoCaoTon.upsert({
          MaSach: item.MaSach,
          Thang: month,
          Nam: year,
          TonDau: item.TonDau,
          TonCuoi: item.TonCuoi,
          NhapTrongThang: item.Nhap,
          BanTrongThang: item.Ban
        });
      }
    }

    res.json({ data: result, fromCache: false, isCurrentMonth });

  } catch (err) {
    console.error("Lỗi tồn kho:", err);
    res.status(500).json({ error: err.message });
  }
}};