const db = require("../models");
const { Op } = require("sequelize"); // Import Operator

// =============================================================
// HÀM TÌM KIẾM KHÁCH HÀNG
// =============================================================
const searchCustomers = async (req, res) => {
  try {
    const { hoTen, sdt, diaChi, tongNo } = req.body;
    let whereClause = {}; // Xây dựng điều kiện lọc động

    if (hoTen) whereClause.HoVaTen = { [Op.like]: `%${hoTen}%` };
    if (sdt) whereClause.SoDienThoai = { [Op.like]: `%${sdt}%` };
    if (diaChi) whereClause.DiaChi = { [Op.like]: `%${diaChi}%` };

    // Nếu nhập Tổng nợ, tìm những ai nợ LỚN HƠN hoặc BẰNG số đó
    if (tongNo) {
      whereClause.TongNo = { [Op.gte]: parseFloat(tongNo) || 0 };
    }

    const results = await db.KhachHang.findAll({
      where: whereClause,
      raw: true,
    });

    res.status(200).json(results);
  } catch (err) {
    console.error("Lỗi tìm kiếm khách hàng:", err);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =============================================================
// HÀM TÌM KIẾM SÁCH
// =============================================================
const searchBooks = async (req, res) => {
  try {
    const { tenSach, tacGia, theLoai, soLuongTon } = req.body;

    let whereDauSach = {}; // Điều kiện cho bảng DAUSACH
    let whereSach = {}; // Điều kiện cho bảng SACH
    let whereTheLoai = {}; // Điều kiện cho bảng THELOAI

    if (tenSach) whereDauSach.TenSach = { [Op.like]: `%${tenSach}%` };
    if (tacGia) whereDauSach.TacGia = { [Op.like]: `%${tacGia}%` };
    if (theLoai) whereTheLoai.TenTheLoai = { [Op.like]: `%${theLoai}%` };

    if (soLuongTon) {
      whereSach.SoLuongTon = { [Op.gte]: parseInt(soLuongTon) || 0 };
    }

    const results = await db.Sach.findAll({
      where: whereSach,
      include: [
        {
          model: db.DauSach,
          where: whereDauSach,
          required: true,
          include: [
            {
              model: db.TheLoai,
              where: whereTheLoai,
              required: !!theLoai, // Chỉ yêu cầu join nếu có nhập thể loại
            },
          ],
        },
      ],
      raw: true,
      nest: true, // Gộp kết quả
    });

    res.status(200).json(results);
  } catch (err) {
    console.error("Lỗi tìm kiếm sách:", err);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

module.exports = {
  searchCustomers,
  searchBooks,
};
