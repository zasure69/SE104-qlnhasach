const db = require("../models");

// Helper: Generate new MaPhieuKiem
async function generateNewPhieuKiemId() {
  const prefix = "PK";
  const paddingLength = 3;

  // Lấy tất cả phiếu và tìm số lớn nhất từ các mã có format PK + số
  const allReceipts = await db.PhieuKiemKe.findAll({
    attributes: ["MaPhieuKiem"],
    raw: true,
  });

  let lastIdNumber = 0;

  for (const receipt of allReceipts) {
    const maPhieu = receipt.MaPhieuKiem;
    // Chỉ xử lý các mã bắt đầu bằng "PK" và theo sau là số
    if (maPhieu && maPhieu.startsWith(prefix)) {
      const numPart = maPhieu.substring(prefix.length);
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > lastIdNumber) {
        lastIdNumber = num;
      }
    }
  }

  const newIdNumber = lastIdNumber + 1;
  return prefix + String(newIdNumber).padStart(paddingLength, "0");
}

// Render trang quản lý phiếu kiểm kê
const getInventoryPage = async (req, res) => {
  try {
    console.log("[inventoryController] getInventoryPage called");
    const userInfo = {
      id: req.user.id,
      username: req.user?.username,
      role: req.user?.role,
    };

    let inventoryReceipts = [];

    try {
      inventoryReceipts = await db.PhieuKiemKe.findAll({
        where: { isDeleted: false },
        include: [
          { model: db.ChiTietKiemKe, as: "ChiTiet", required: false },
          { model: db.NhanVien, attributes: ["HoTen"], required: false },
        ],
        order: [["NgayKiem", "DESC"]],
        raw: false,
      });
    } catch (dbError) {
      console.error("[inventoryController] Database error:", dbError);
    }

    res.render("inventory", {
      ...userInfo,
      inventoryReceipts: inventoryReceipts || [],
      currentDate: new Date().toISOString().split("T")[0],
    });
  } catch (err) {
    console.error("[inventoryController] Error:", err);
    res.render("inventory", {
      username: req.user?.username,
      role: req.user?.role,
      id: req.user?.id,
      inventoryReceipts: [],
      currentDate: new Date().toISOString().split("T")[0],
    });
  }
};

// API: Lấy tất cả phiếu kiểm kê
const getAllInventoryReceipts = async (req, res) => {
  try {
    const receipts = await db.PhieuKiemKe.findAll({
      where: { isDeleted: false },
      include: [
        { model: db.ChiTietKiemKe, as: "ChiTiet", required: false },
        { model: db.NhanVien, attributes: ["HoTen"], required: false },
      ],
      order: [["NgayKiem", "DESC"]],
      raw: false,
    });
    return res.status(200).json({ receipts });
  } catch (err) {
    console.error("[inventoryController] getAllInventoryReceipts error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// API: Lấy chi tiết phiếu kiểm kê theo mã
const getInventoryReceiptById = async (req, res) => {
  try {
    const maPhieu = req.params.maPhieu;
    const receipt = await db.PhieuKiemKe.findByPk(maPhieu, {
      include: [
        {
          model: db.ChiTietKiemKe,
          as: "ChiTiet",
          include: [
            {
              model: db.Sach,
              attributes: ["MaSach", "MaDauSach", "SoLuongTon"],
              include: [{ model: db.DauSach, attributes: ["TenSach"] }],
            },
          ],
        },
        { model: db.NhanVien, attributes: ["HoTen"], required: false },
      ],
      raw: false,
    });

    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu kiểm kê" });
    }

    return res.status(200).json({ receipt });
  } catch (err) {
    console.error("[inventoryController] getInventoryReceiptById error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// API: Tạo phiếu kiểm kê mới
const createInventoryReceipt = async (req, res) => {
  try {
    const { NgayKiem, MaNhanVien, GhiChu, chiTiet } = req.body;

    if (!NgayKiem || !MaNhanVien || !chiTiet || chiTiet.length === 0) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ. Vui lòng nhập đầy đủ thông tin.",
      });
    }

    // Kiểm tra ngày kiểm không được sau ngày hôm nay
    const inputDate = new Date(NgayKiem);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inputDate.setHours(0, 0, 0, 0);

    if (inputDate > today) {
      return res
        .status(400)
        .json({ error: "Ngày kiểm kê không được sau ngày hôm nay" });
    }

    // Kiểm tra nhân viên tồn tại
    const nhanVien = await db.NhanVien.findByPk(MaNhanVien);
    if (!nhanVien) {
      return res.status(400).json({ error: "Mã nhân viên không tồn tại" });
    }

    // Kiểm tra tất cả mã sách trong chi tiết
    for (const item of chiTiet) {
      const sach = await db.Sach.findByPk(item.MaSach);
      if (!sach) {
        return res
          .status(400)
          .json({ error: `Mã sách ${item.MaSach} không tồn tại` });
      }

      // Kiểm tra số lượng thực tế không âm
      if (item.SoLuongThucTe < 0) {
        return res
          .status(400)
          .json({ error: `Số lượng thực tế không được âm` });
      }
    }

    let newMaPhieu;

    await db.sequelize.transaction(async (t) => {
      newMaPhieu = await generateNewPhieuKiemId();

      // Tạo phiếu kiểm kê
      await db.PhieuKiemKe.create(
        {
          MaPhieuKiem: newMaPhieu,
          NgayKiem,
          MaNhanVien,
          GhiChu: GhiChu || null,
        },
        { transaction: t }
      );

      // Tạo chi tiết kiểm kê và cập nhật tồn kho
      for (const item of chiTiet) {
        await db.ChiTietKiemKe.create(
          {
            MaPhieuKiem: newMaPhieu,
            MaSach: item.MaSach,
            SoLuongHeThong: item.SoLuongHeThong,
            SoLuongThucTe: item.SoLuongThucTe,
            LyDo: item.LyDo || null,
          },
          { transaction: t }
        );

        // Cập nhật số lượng tồn trong bảng Sách theo số lượng thực tế
        const sach = await db.Sach.findByPk(item.MaSach, { transaction: t });
        if (sach) {
          await sach.update(
            { SoLuongTon: item.SoLuongThucTe },
            { transaction: t }
          );
        }
      }
    });

    // Lấy phiếu vừa tạo để trả về frontend
    const newReceipt = await db.PhieuKiemKe.findByPk(newMaPhieu, {
      include: [
        { model: db.ChiTietKiemKe, as: "ChiTiet", required: false },
        { model: db.NhanVien, attributes: ["HoTen"], required: false },
      ],
    });

    return res.status(201).json({
      message: "Tạo phiếu kiểm kê thành công!",
      MaPhieuKiem: newMaPhieu,
      receipt: newReceipt,
    });
  } catch (err) {
    console.error("[inventoryController] createInventoryReceipt error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ: " + err.message });
  }
};

// API: Cập nhật phiếu kiểm kê
const updateInventoryReceipt = async (req, res) => {
  try {
    const maPhieu = req.params.maPhieu;
    const { NgayKiem, MaNhanVien, GhiChu, chiTiet } = req.body;

    const receipt = await db.PhieuKiemKe.findByPk(maPhieu);
    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu kiểm kê" });
    }

    if (NgayKiem) {
      const inputDate = new Date(NgayKiem);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      inputDate.setHours(0, 0, 0, 0);
      if (inputDate > today) {
        return res
          .status(400)
          .json({ error: "Ngày kiểm kê không được sau ngày hôm nay" });
      }
    }

    // Lấy chi tiết cũ để khôi phục tồn kho
    const oldDetails = await db.ChiTietKiemKe.findAll({
      where: { MaPhieuKiem: maPhieu },
    });

    await db.sequelize.transaction(async (t) => {
      // Khôi phục tồn kho về số lượng hệ thống cũ
      for (const old of oldDetails) {
        const sach = await db.Sach.findByPk(old.MaSach, { transaction: t });
        if (sach) {
          await sach.update(
            { SoLuongTon: old.SoLuongHeThong },
            { transaction: t }
          );
        }
      }

      // Xóa chi tiết cũ
      await db.ChiTietKiemKe.destroy({
        where: { MaPhieuKiem: maPhieu },
        transaction: t,
      });

      // Cập nhật phiếu kiểm kê
      await receipt.update(
        {
          NgayKiem: NgayKiem || receipt.NgayKiem,
          MaNhanVien: MaNhanVien || receipt.MaNhanVien,
          GhiChu: GhiChu !== undefined ? GhiChu : receipt.GhiChu,
        },
        { transaction: t }
      );

      // Thêm chi tiết mới và cập nhật tồn kho
      for (const item of chiTiet) {
        await db.ChiTietKiemKe.create(
          {
            MaPhieuKiem: maPhieu,
            MaSach: item.MaSach,
            SoLuongHeThong: item.SoLuongHeThong,
            SoLuongThucTe: item.SoLuongThucTe,
            LyDo: item.LyDo || null,
          },
          { transaction: t }
        );

        const sach = await db.Sach.findByPk(item.MaSach, { transaction: t });
        if (sach) {
          await sach.update(
            { SoLuongTon: item.SoLuongThucTe },
            { transaction: t }
          );
        }
      }
    });

    return res
      .status(200)
      .json({ message: "Cập nhật phiếu kiểm kê thành công!" });
  } catch (err) {
    console.error("[inventoryController] updateInventoryReceipt error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ: " + err.message });
  }
};

// API: Xóa phiếu kiểm kê (SOFT DELETE)
const deleteInventoryReceipt = async (req, res) => {
  try {
    const maPhieu = req.params.maPhieu;
    const receipt = await db.PhieuKiemKe.findByPk(maPhieu);

    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu kiểm kê" });
    }

    if (receipt.isDeleted) {
      return res
        .status(400)
        .json({ error: "Phiếu kiểm kê này đã bị xóa trước đó." });
    }

    // Soft delete: đánh dấu isDeleted = true
    await receipt.update({ isDeleted: true });

    return res.status(200).json({ message: "Xóa phiếu kiểm kê thành công!" });
  } catch (err) {
    console.error("[inventoryController] deleteInventoryReceipt error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =====================================================
// ADMIN ONLY: LẤY DANH SÁCH PHIẾU KIỂM KÊ ĐÃ XÓA
// =====================================================
const getDeletedInventoryReceipts = async (req, res) => {
  try {
    const receipts = await db.PhieuKiemKe.findAll({
      where: { isDeleted: true },
      include: [
        { model: db.ChiTietKiemKe, as: "ChiTiet", required: false },
        { model: db.NhanVien, attributes: ["HoTen"], required: false },
      ],
      order: [["NgayKiem", "DESC"]],
      raw: false,
    });
    return res.status(200).json({ receipts });
  } catch (err) {
    console.error(
      "[inventoryController] getDeletedInventoryReceipts error",
      err
    );
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =====================================================
// ADMIN ONLY: KHÔI PHỤC PHIẾU KIỂM KÊ ĐÃ XÓA
// =====================================================
const restoreInventoryReceipt = async (req, res) => {
  try {
    const maPhieu = req.params.maPhieu;
    const receipt = await db.PhieuKiemKe.findByPk(maPhieu);

    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu kiểm kê" });
    }

    if (!receipt.isDeleted) {
      return res.status(400).json({ error: "Phiếu kiểm kê này chưa bị xóa." });
    }

    await receipt.update({ isDeleted: false });

    return res
      .status(200)
      .json({ message: "Khôi phục phiếu kiểm kê thành công!" });
  } catch (err) {
    console.error("[inventoryController] restoreInventoryReceipt error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =====================================================
// ADMIN ONLY: XÓA VĨNH VIỄN PHIẾU KIỂM KÊ (HARD DELETE)
// =====================================================
const hardDeleteInventoryReceipt = async (req, res) => {
  try {
    const maPhieu = req.params.maPhieu;
    const receipt = await db.PhieuKiemKe.findByPk(maPhieu);

    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu kiểm kê" });
    }

    if (!receipt.isDeleted) {
      return res.status(400).json({
        error:
          "Chỉ có thể xóa vĩnh viễn phiếu kiểm kê đã được xóa mềm trước đó.",
      });
    }

    await db.sequelize.transaction(async (t) => {
      // Xóa chi tiết phiếu kiểm kê trước
      await db.ChiTietKiemKe.destroy({
        where: { MaPhieuKiem: maPhieu },
        transaction: t,
      });

      // Xóa phiếu kiểm kê
      await receipt.destroy({ transaction: t });
    });

    return res
      .status(200)
      .json({ message: "Đã xóa vĩnh viễn phiếu kiểm kê khỏi hệ thống!" });
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        error:
          "Xóa thất bại! Phiếu kiểm kê này có dữ liệu liên quan trong hệ thống.",
      });
    }
    console.error(
      "[inventoryController] hardDeleteInventoryReceipt error",
      err
    );
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

module.exports = {
  getInventoryPage,
  getAllInventoryReceipts,
  getDeletedInventoryReceipts,
  getInventoryReceiptById,
  createInventoryReceipt,
  updateInventoryReceipt,
  deleteInventoryReceipt,
  restoreInventoryReceipt,
  hardDeleteInventoryReceipt,
};
