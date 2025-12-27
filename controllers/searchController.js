const db = require("../models");
const { Op } = require("sequelize"); // Import Operator

// =============================================================
// HÀM TÌM KIẾM KHÁCH HÀNG
// =============================================================
const searchCustomers = async (req, res) => {
  try {
    const { hoTen, sdt, diaChi, tongNo } = req.body;
    let whereClause = { isDeleted: false }; // Xây dựng điều kiện lọc động - chỉ lấy chưa bị xóa

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

    let whereDauSach = { isDeleted: false }; // Điều kiện cho bảng DAUSACH - chỉ lấy chưa bị xóa
    let whereSach = { isDeleted: false }; // Điều kiện cho bảng SACH - chỉ lấy chưa bị xóa
    let whereTheLoai = { isDeleted: false }; // Điều kiện cho bảng THELOAI - chỉ lấy chưa bị xóa

    if (tenSach) whereDauSach.TenSach = { [Op.like]: `%${tenSach}%` };
    if (tacGia) whereDauSach.TacGia = { [Op.like]: `%${tacGia}%` };
    if (theLoai) whereTheLoai.TenTheLoai = { [Op.like]: `%${theLoai}%` };

    // Lọc theo số lượng tồn trong DB (đã được maintain bởi import/bill operations)
    if (soLuongTon) {
      whereSach.SoLuongTon = { [Op.gte]: parseInt(soLuongTon) || 0 };
    }

    const sachsRaw = await db.Sach.findAll({
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
              attributes: ["TenTheLoai"],
            },
            {
              model: db.TacGia,
              as: "TacGias",
              through: { attributes: [] },
              attributes: ["HoTen"],
              required: false,
            },
          ],
          attributes: ["TenSach", "MaTheLoai"],
        },
      ],
      raw: false,
    });

    // Transform data với SoLuongTon từ DB
    const results = sachsRaw.map((s) => {
      const plain = s.get({ plain: true });

      return {
        MaSach: plain.MaSach,
        TenSach: plain.DauSach ? plain.DauSach.TenSach : "",
        TenTheLoai:
          plain.DauSach && plain.DauSach.TheLoai
            ? plain.DauSach.TheLoai.TenTheLoai
            : "",
        TacGia:
          plain.DauSach && plain.DauSach.TacGias
            ? plain.DauSach.TacGias.map((tg) => tg.HoTen).join(", ")
            : "",
        NhaXB: plain.NhaXB || "",
        NamXB: plain.NamXB || "",
        SoLuongTon: plain.SoLuongTon || 0,
      };
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
