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
      currentDate: new Date().toISOString().split("T")[0],
    });
  } catch (err) {
    console.error("[importController] Error:", err);
    res.render("books_import", {
      username: req.user?.username,
      role: req.user?.role,
      importReceipts: [],
      currentDate: new Date().toISOString().split("T")[0],
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

    // Validate ngày nhập không được sau ngày hôm nay
    const inputDate = new Date(NgayNhapPhieu);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inputDate.setHours(0, 0, 0, 0);

    if (inputDate > today) {
      return res
        .status(400)
        .json({ error: "Ngày nhập không được sau ngày hôm nay" });
    }

    // Validate chi tiết phiếu
    for (const item of chiTiet) {
      // Quy định 1: Số lượng nhập ít nhất là 150
      if (!item.SoLuong || item.SoLuong < 150) {
        return res.status(400).json({
          error: "Số lượng nhập phải từ 150 trở lên",
        });
      }

      // Quy định 2: Chỉ nhập các sách có số lượng tồn ít hơn 300
      const tongNhap =
        (await db.CT_PNS.sum("SoLuong", {
          where: { MaSach: item.MaSach },
        })) || 0;

      const tongBan =
        (await db.CT_HD.sum("SoLuongBan", {
          where: { MaSach: item.MaSach },
        })) || 0;

      const soLuongTonHienTai = tongNhap - tongBan;

      if (soLuongTonHienTai >= 300) {
        const sach = await db.Sach.findByPk(item.MaSach, {
          include: [{ model: db.DauSach, attributes: ["TenSach"] }],
        });
        const tenSach = sach?.DauSach?.TenSach || item.MaSach;
        return res.status(400).json({
          error: `Không thể nhập sách "${tenSach}" vì số lượng tồn hiện tại (${soLuongTonHienTai}) đã >= 300`,
        });
      }
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
        const donGiaNhap = Math.round(parseFloat(item.DonGiaNhap));
        const thanhTien = parseInt(item.SoLuong) * donGiaNhap;
        // Tự động tính đơn giá bán = đơn giá nhập * tỉ lệ (làm tròn)
        const donGiaBan = item.DonGiaBan
          ? Math.round(parseFloat(item.DonGiaBan))
          : Math.round(donGiaNhap * tiLe);

        await db.CT_PNS.create(
          {
            MaPhieuNhap: newMaPhieu,
            MaSach: item.MaSach,
            SoLuong: parseInt(item.SoLuong),
            DonGiaNhap: donGiaNhap,
            DonGiaBan: donGiaBan,
            ThanhTien: thanhTien,
          },
          { transaction: t }
        );

        const sach = await db.Sach.findByPk(item.MaSach, { transaction: t });
        if (sach) {
          await sach.update(
            {
              SoLuongTon: (sach.SoLuongTon || 0) + parseInt(item.SoLuong),
              DonGia: donGiaBan,
            },
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

    // Validate ngày nhập không được sau ngày hôm nay
    if (NgayNhapPhieu) {
      const inputDate = new Date(NgayNhapPhieu);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      inputDate.setHours(0, 0, 0, 0);

      if (inputDate > today) {
        return res
          .status(400)
          .json({ error: "Ngày nhập không được sau ngày hôm nay" });
      }
    }

    // Validate chi tiết phiếu
    for (const item of chiTiet) {
      // Quy định 1: Số lượng nhập ít nhất là 150
      if (!item.SoLuong || item.SoLuong < 150) {
        return res.status(400).json({
          error: "Số lượng nhập phải từ 150 trở lên",
        });
      }

      if (!item.DonGiaNhap || item.DonGiaNhap < 0) {
        return res.status(400).json({ error: "Đơn giá nhập không hợp lệ" });
      }

      // Quy định 2: Chỉ nhập các sách có số lượng tồn ít hơn 300
      // Tính số lượng tồn hiện tại (trước khi cập nhật)
      const oldDetail = await db.CT_PNS.findOne({
        where: {
          MaPhieuNhap: maPhieu,
          MaSach: item.MaSach,
        },
      });

      const tongNhap =
        (await db.CT_PNS.sum("SoLuong", {
          where: { MaSach: item.MaSach },
        })) || 0;

      const tongBan =
        (await db.CT_HD.sum("SoLuongBan", {
          where: { MaSach: item.MaSach },
        })) || 0;

      // Số lượng tồn sau khi trừ đi số lượng cũ của phiếu này
      const soLuongCu = oldDetail ? oldDetail.SoLuong : 0;
      const soLuongTonTruocCapNhat = tongNhap - tongBan - soLuongCu;

      if (soLuongTonTruocCapNhat >= 300) {
        const sach = await db.Sach.findByPk(item.MaSach, {
          include: [{ model: db.DauSach, attributes: ["TenSach"] }],
        });
        const tenSach = sach?.DauSach?.TenSach || item.MaSach;
        return res.status(400).json({
          error: `Không thể nhập sách "${tenSach}" vì số lượng tồn hiện tại (${soLuongTonTruocCapNhat}) đã >= 300`,
        });
      }
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
            {
              SoLuongTon: sach.SoLuongTon - old.SoLuong,
              DonGia: old.DonGiaBan,
            },
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
        const donGiaNhap = Math.round(parseFloat(item.DonGiaNhap));
        const soLuong = parseInt(item.SoLuong);
        const thanhTien = soLuong * donGiaNhap;
        // Tự động tính đơn giá bán = đơn giá nhập * tỉ lệ (làm tròn)
        const donGiaBan = item.DonGiaBan
          ? Math.round(parseFloat(item.DonGiaBan))
          : Math.round(donGiaNhap * tiLe);

        await db.CT_PNS.create(
          {
            MaPhieuNhap: maPhieu,
            MaSach: item.MaSach,
            SoLuong: soLuong,
            DonGiaNhap: donGiaNhap,
            DonGiaBan: donGiaBan,
            ThanhTien: thanhTien,
          },
          { transaction: t }
        );

        const sach = await db.Sach.findByPk(item.MaSach, { transaction: t });
        if (sach) {
          await sach.update(
            { SoLuongTon: sach.SoLuongTon + soLuong, DonGia: donGiaBan },
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
