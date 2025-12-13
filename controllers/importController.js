const db = require("../models");

// Helper: Generate new MaPhieuNhap
async function generateNewPhieuNhapId() {
  const prefix = "PN";
  const paddingLength = 3;

  const lastReceipt = await db.PhieuNhapSach.findOne({
    order: [
      [
        db.sequelize.literal(
          `CAST(SUBSTRING(MaPhieuNhap, ${prefix.length + 1}) AS UNSIGNED)`
        ),
        "DESC",
      ],
    ],
    attributes: ["MaPhieuNhap"],
    raw: true,
  });

  let lastIdNumber = 0;
  if (lastReceipt && lastReceipt.MaPhieuNhap) {
    try {
      lastIdNumber = parseInt(
        lastReceipt.MaPhieuNhap.substring(prefix.length),
        10
      );
    } catch (error) {
      console.error("Error parsing ID:", error);
    }
  }
  const newIdNumber = lastIdNumber + 1;
  return prefix + String(newIdNumber).padStart(paddingLength, "0");
}

// Render trang quản lý phiếu nhập sách
const getImportPage = async (req, res) => {
  try {
    console.log("[importController] getImportPage called");
    const userInfo = { username: req.user?.username, role: req.user?.role };

    let importReceipts = [];

    try {
      // Lấy danh sách phiếu nhập sách với chi tiết
      importReceipts = await db.PhieuNhapSach.findAll({
        include: [
          {
            model: db.CT_PNS,
            as: "ChiTiet",
            required: false,
          },
        ],
        order: [["NgayNhapPhieu", "DESC"]],
        raw: false,
      });
      console.log("[importController] Loaded receipts:", importReceipts.length);
    } catch (dbError) {
      console.error("[importController] Database error:", dbError);
    }

    res.render("books_import", {
      ...userInfo,
      importReceipts: importReceipts || [],
    });
  } catch (err) {
    console.error("[importController] Error:", err);
    res.render("books_import", {
      username: req.user?.username,
      role: req.user?.role,
      importReceipts: [],
    });
  }
};

// API: Lấy tất cả phiếu nhập sách
const getAllImportReceipts = async (req, res) => {
  try {
    const receipts = await db.PhieuNhapSach.findAll({
      include: [
        {
          model: db.CT_PNS,
          as: "ChiTiet",
          required: false,
        },
      ],
      order: [["NgayNhapPhieu", "DESC"]],
      raw: false,
    });
    return res.status(200).json({ receipts });
  } catch (err) {
    console.error("[importController] getAllImportReceipts error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// API: Lấy phiếu nhập sách theo ID
const getImportReceiptById = async (req, res) => {
  try {
    const maPhieu = req.params.maPhieu;
    const receipt = await db.PhieuNhapSach.findByPk(maPhieu, {
      include: [
        {
          model: db.CT_PNS,
          as: "ChiTiet",
          include: [
            {
              model: db.Sach,
              attributes: ["MaSach", "MaDauSach"],
              include: [
                {
                  model: db.DauSach,
                  attributes: ["TenSach"],
                },
              ],
            },
          ],
        },
      ],
      raw: false,
    });

    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu nhập" });
    }

    return res.status(200).json({ receipt });
  } catch (err) {
    console.error("[importController] getImportReceiptById error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// API: Tạo phiếu nhập sách mới
const createImportReceipt = async (req, res) => {
  try {
    const { NgayNhapPhieu, MaNhanVien, chiTiet } = req.body;

    if (!NgayNhapPhieu || !chiTiet || chiTiet.length === 0) {
      return res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    }

    // Lấy tỉ lệ tính giá bán từ THAMSO
    const tiLeGiaBan = await db.ThamSo.findOne({
      where: { TenThamSo: "TiLeTinhDonGiaBan" },
    });
    const tiLe = tiLeGiaBan ? tiLeGiaBan.GiaTri : 1.05;

    let newMaPhieu;
    let tongTien = 0;

    await db.sequelize.transaction(async (t) => {
      newMaPhieu = await generateNewPhieuNhapId();

      tongTien = chiTiet.reduce((sum, item) => {
        return sum + item.SoLuong * item.DonGiaNhap;
      }, 0);

      await db.PhieuNhapSach.create(
        {
          MaPhieuNhap: newMaPhieu,
          NgayNhapPhieu,
          TongTien: tongTien,
          MaNhanVien: MaNhanVien || null,
        },
        { transaction: t }
      );

      for (const item of chiTiet) {
        const thanhTien = item.SoLuong * item.DonGiaNhap;
        // Tự động tính đơn giá bán = đơn giá nhập * tỉ lệ
        const donGiaBan = item.DonGiaBan || Math.round(item.DonGiaNhap * tiLe);

        await db.CT_PNS.create(
          {
            MaPhieuNhap: newMaPhieu,
            MaSach: item.MaSach,
            SoLuong: item.SoLuong,
            DonGiaNhap: item.DonGiaNhap,
            DonGiaBan: donGiaBan,
            ThanhTien: thanhTien,
          },
          { transaction: t }
        );

        const sach = await db.Sach.findByPk(item.MaSach, { transaction: t });
        if (sach) {
          await sach.update(
            { SoLuongTon: (sach.SoLuongTon || 0) + item.SoLuong },
            { transaction: t }
          );
        }
      }
    });

    return res.status(201).json({
      message: "Tạo phiếu nhập sách thành công!",
      maPhieu: newMaPhieu,
      tongTien,
    });
  } catch (err) {
    console.error("[importController] createImportReceipt error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ: " + err.message });
  }
};

// API: Cập nhật phiếu nhập sách
const updateImportReceipt = async (req, res) => {
  try {
    const maPhieu = req.params.maPhieu;
    const { NgayNhapPhieu, MaNhanVien, chiTiet } = req.body;

    const receipt = await db.PhieuNhapSach.findByPk(maPhieu);
    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu nhập" });
    }

    // Lấy tỉ lệ tính giá bán từ THAMSO
    const tiLeGiaBan = await db.ThamSo.findOne({
      where: { TenThamSo: "TiLeTinhDonGiaBan" },
    });
    const tiLe = tiLeGiaBan ? tiLeGiaBan.GiaTri : 1.05;

    await db.sequelize.transaction(async (t) => {
      const oldDetails = await db.CT_PNS.findAll({
        where: { MaPhieuNhap: maPhieu },
        transaction: t,
      });

      for (const old of oldDetails) {
        const sach = await db.Sach.findByPk(old.MaSach, { transaction: t });
        if (sach) {
          await sach.update(
            { SoLuongTon: sach.SoLuongTon - old.SoLuong },
            { transaction: t }
          );
        }
      }

      await db.CT_PNS.destroy({
        where: { MaPhieuNhap: maPhieu },
        transaction: t,
      });

      const tongTien = chiTiet.reduce((sum, item) => {
        return sum + item.SoLuong * item.DonGiaNhap;
      }, 0);

      await receipt.update(
        {
          NgayNhapPhieu: NgayNhapPhieu || receipt.NgayNhapPhieu,
          TongTien: tongTien,
          MaNhanVien:
            MaNhanVien !== undefined ? MaNhanVien : receipt.MaNhanVien,
        },
        { transaction: t }
      );

      for (const item of chiTiet) {
        const thanhTien = item.SoLuong * item.DonGiaNhap;
        // Tự động tính đơn giá bán = đơn giá nhập * tỉ lệ
        const donGiaBan = item.DonGiaBan || Math.round(item.DonGiaNhap * tiLe);

        await db.CT_PNS.create(
          {
            MaPhieuNhap: maPhieu,
            MaSach: item.MaSach,
            SoLuong: item.SoLuong,
            DonGiaNhap: item.DonGiaNhap,
            DonGiaBan: donGiaBan,
            ThanhTien: thanhTien,
          },
          { transaction: t }
        );

        const sach = await db.Sach.findByPk(item.MaSach, { transaction: t });
        if (sach) {
          await sach.update(
            { SoLuongTon: sach.SoLuongTon + item.SoLuong },
            { transaction: t }
          );
        }
      }
    });

    return res.status(200).json({ message: "Cập nhật phiếu nhập thành công!" });
  } catch (err) {
    console.error("[importController] updateImportReceipt error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ: " + err.message });
  }
};

// API: Xóa phiếu nhập sách
const deleteImportReceipt = async (req, res) => {
  try {
    const maPhieu = req.params.maPhieu;
    const receipt = await db.PhieuNhapSach.findByPk(maPhieu);

    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu nhập" });
    }

    await db.sequelize.transaction(async (t) => {
      const details = await db.CT_PNS.findAll({
        where: { MaPhieuNhap: maPhieu },
        transaction: t,
      });

      for (const detail of details) {
        const sach = await db.Sach.findByPk(detail.MaSach, { transaction: t });
        if (sach) {
          await sach.update(
            { SoLuongTon: sach.SoLuongTon - detail.SoLuong },
            { transaction: t }
          );
        }
      }

      await db.CT_PNS.destroy({
        where: { MaPhieuNhap: maPhieu },
        transaction: t,
      });

      await receipt.destroy({ transaction: t });
    });

    return res.status(200).json({ message: "Xóa phiếu nhập thành công!" });
  } catch (err) {
    console.error("[importController] deleteImportReceipt error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

module.exports = {
  getImportPage,
  getAllImportReceipts,
  getImportReceiptById,
  createImportReceipt,
  updateImportReceipt,
  deleteImportReceipt,
};
