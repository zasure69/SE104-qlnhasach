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
    const userInfo = { id: req.user.id, username: req.user?.username, role: req.user?.role };

    let importReceipts = [];

    try {
      importReceipts = await db.PhieuNhapSach.findAll({
        include: [{ model: db.CT_PNS, as: "ChiTiet", required: false }],
        order: [["NgayNhapPhieu", "DESC"]],
        raw: false,
      });
    } catch (dbError) {
      console.error("[importController] Database error:", dbError);
    }

    // Lấy tham số SoLuongNhapToiThieu từ database
    const soLuongNhapToiThieuParam = await db.ThamSo.findOne({
      where: { TenThamSo: "SoLuongNhapToiThieu" },
    });
    const soLuongNhapToiThieu = soLuongNhapToiThieuParam
      ? parseInt(soLuongNhapToiThieuParam.GiaTri)
      : 150;

    res.render("books_import", {
      ...userInfo,
      importReceipts: importReceipts || [],
      currentDate: new Date().toISOString().split("T")[0],
      soLuongNhapToiThieu: soLuongNhapToiThieu,
    });
  } catch (err) {
    console.error("[importController] Error:", err);
    res.render("books_import", {
      username: req.user?.username,
      role: req.user?.role,
      importReceipts: [],
      currentDate: new Date().toISOString().split("T")[0],
      soLuongNhapToiThieu: 150,
    });
  }
};

const getAllImportReceipts = async (req, res) => {
  try {
    const receipts = await db.PhieuNhapSach.findAll({
      include: [{ model: db.CT_PNS, as: "ChiTiet", required: false }],
      order: [["NgayNhapPhieu", "DESC"]],
      raw: false,
    });
    return res.status(200).json({ receipts });
  } catch (err) {
    console.error("[importController] getAllImportReceipts error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

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
              include: [{ model: db.DauSach, attributes: ["TenSach"] }],
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

    const inputDate = new Date(NgayNhapPhieu);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inputDate.setHours(0, 0, 0, 0);

    if (inputDate > today) {
      return res
        .status(400)
        .json({ error: "Ngày nhập không được sau ngày hôm nay" });
    }

    // Lấy tham số từ database
    const soLuongNhapToiThieuParam = await db.ThamSo.findOne({
      where: { TenThamSo: "SoLuongNhapToiThieu" },
    });
    const soLuongNhapToiThieu = soLuongNhapToiThieuParam
      ? parseInt(soLuongNhapToiThieuParam.GiaTri)
      : 150;

    const soLuongTonToiDaParam = await db.ThamSo.findOne({
      where: { TenThamSo: "SoLuongTonToiDaTruocKhiNhap" },
    });
    const soLuongTonToiDa = soLuongTonToiDaParam
      ? parseInt(soLuongTonToiDaParam.GiaTri)
      : 300;

    for (const item of chiTiet) {
      // Kiểm tra số lượng nhập tối thiểu theo tham số từ DB
      if (!item.SoLuong || item.SoLuong < soLuongNhapToiThieu) {
        return res.status(400).json({
          error: `Số lượng nhập phải từ ${soLuongNhapToiThieu} trở lên (theo quy định)`,
        });
      }

      const tongNhap =
        (await db.CT_PNS.sum("SoLuong", { where: { MaSach: item.MaSach } })) ||
        0;
      const tongBan =
        (await db.CT_HD.sum("SoLuongBan", {
          where: { MaSach: item.MaSach },
        })) || 0;
      const soLuongTonHienTai = tongNhap - tongBan;

      if (soLuongTonHienTai >= soLuongTonToiDa) {
        const sach = await db.Sach.findByPk(item.MaSach, {
          include: [{ model: db.DauSach, attributes: ["TenSach"] }],
        });
        const tenSach = sach?.DauSach?.TenSach || item.MaSach;
        return res.status(400).json({
          error: `Không thể nhập sách "${tenSach}" vì số lượng tồn hiện tại (${soLuongTonHienTai}) đã >= ${soLuongTonToiDa}`,
        });
      }
    }

    const tiLeGiaBan = await db.ThamSo.findOne({
      where: { TenThamSo: "TiLeTinhDonGiaBan" },
    });
    const tiLe = tiLeGiaBan ? tiLeGiaBan.GiaTri : 1.05;

    let newMaPhieu;
    let tongTien = 0;

    await db.sequelize.transaction(async (t) => {
      newMaPhieu = await generateNewPhieuNhapId();
      tongTien = chiTiet.reduce(
        (sum, item) => sum + item.SoLuong * item.DonGiaNhap,
        0
      );

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

    if (NgayNhapPhieu) {
      const inputDate = new Date(NgayNhapPhieu);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      inputDate.setHours(0, 0, 0, 0);
      if (inputDate > today)
        return res
          .status(400)
          .json({ error: "Ngày nhập không được sau ngày hôm nay" });
    }

    // --- LOGIC SỬA MỚI: CHECK TỒN KHO TRƯỚC KHI TRỪ ---
    // Kiểm tra xem việc xóa chi tiết cũ có làm âm kho không
    const oldDetailsToCheck = await db.CT_PNS.findAll({
      where: { MaPhieuNhap: maPhieu },
    });
    for (const oldDetail of oldDetailsToCheck) {
      const sach = await db.Sach.findByPk(oldDetail.MaSach);
      if (sach) {
        const tonMoi = sach.SoLuongTon - oldDetail.SoLuong;
        if (tonMoi < 0) {
          return res.status(400).json({
            error: `Không thể cập nhật phiếu nhập. Sách ${oldDetail.MaSach} đã bán, xóa phiếu này sẽ làm tồn kho bị âm (${tonMoi}).`,
          });
        }
      }
    }
    // ----------------------------------------------------

    // Lấy tham số từ database
    const soLuongNhapToiThieuParam = await db.ThamSo.findOne({
      where: { TenThamSo: "SoLuongNhapToiThieu" },
    });
    const soLuongNhapToiThieu = soLuongNhapToiThieuParam
      ? parseInt(soLuongNhapToiThieuParam.GiaTri)
      : 150;

    const soLuongTonToiDaParam = await db.ThamSo.findOne({
      where: { TenThamSo: "SoLuongTonToiDaTruocKhiNhap" },
    });
    const soLuongTonToiDa = soLuongTonToiDaParam
      ? parseInt(soLuongTonToiDaParam.GiaTri)
      : 300;

    // Logic kiểm tra nhập mới
    for (const item of chiTiet) {
      // Kiểm tra số lượng nhập tối thiểu theo tham số từ DB
      if (!item.SoLuong || item.SoLuong < soLuongNhapToiThieu) {
        return res.status(400).json({
          error: `Số lượng nhập phải từ ${soLuongNhapToiThieu} trở lên (theo quy định)`,
        });
      }
      if (!item.DonGiaNhap || item.DonGiaNhap < 0)
        return res.status(400).json({ error: "Đơn giá nhập không hợp lệ" });

      const oldDetail = await db.CT_PNS.findOne({
        where: { MaPhieuNhap: maPhieu, MaSach: item.MaSach },
      });
      const tongNhap =
        (await db.CT_PNS.sum("SoLuong", { where: { MaSach: item.MaSach } })) ||
        0;
      const tongBan =
        (await db.CT_HD.sum("SoLuongBan", {
          where: { MaSach: item.MaSach },
        })) || 0;
      const soLuongCu = oldDetail ? oldDetail.SoLuong : 0;
      const soLuongTonTruocCapNhat = tongNhap - tongBan - soLuongCu;

      if (soLuongTonTruocCapNhat >= soLuongTonToiDa) {
        const sach = await db.Sach.findByPk(item.MaSach, {
          include: [{ model: db.DauSach, attributes: ["TenSach"] }],
        });
        const tenSach = sach?.DauSach?.TenSach || item.MaSach;
        return res.status(400).json({
          error: `Không thể nhập sách "${tenSach}" vì số lượng tồn hiện tại (${soLuongTonTruocCapNhat}) đã >= ${soLuongTonToiDa}`,
        });
      }
    }

    const tiLeGiaBan = await db.ThamSo.findOne({
      where: { TenThamSo: "TiLeTinhDonGiaBan" },
    });
    const tiLe = tiLeGiaBan ? tiLeGiaBan.GiaTri : 1.05;

    await db.sequelize.transaction(async (t) => {
      // 1. Trừ tồn kho cũ (đã check an toàn ở trên)
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

      // 2. Cập nhật phiếu nhập
      const tongTien = chiTiet.reduce(
        (sum, item) => sum + item.SoLuong * item.DonGiaNhap,
        0
      );
      await receipt.update(
        {
          NgayNhapPhieu: NgayNhapPhieu || receipt.NgayNhapPhieu,
          TongTien: tongTien,
          MaNhanVien:
            MaNhanVien !== undefined ? MaNhanVien : receipt.MaNhanVien,
        },
        { transaction: t }
      );

      // 3. Thêm chi tiết mới và cộng tồn kho
      for (const item of chiTiet) {
        const donGiaNhap = Math.round(parseFloat(item.DonGiaNhap));
        const soLuong = parseInt(item.SoLuong);
        const thanhTien = soLuong * donGiaNhap;
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

    // --- LOGIC MỚI: CHECK TỒN KHO TRƯỚC KHI XÓA ---
    const detailsToCheck = await db.CT_PNS.findAll({
      where: { MaPhieuNhap: maPhieu },
    });
    for (const detail of detailsToCheck) {
      const sach = await db.Sach.findByPk(detail.MaSach);
      // Nếu sách tồn tại, kiểm tra tồn kho sau khi trừ
      if (sach) {
        const tonMoi = sach.SoLuongTon - detail.SoLuong;
        if (tonMoi < 0) {
          // VI PHẠM LOGIC: Xóa sẽ làm tồn kho < 0
          return res.status(400).json({
            error: `Không thể xóa phiếu nhập. Sách ${detail.MaSach} đã bán, xóa phiếu này sẽ làm tồn kho bị âm (${tonMoi}).`,
          });
        }
      }
    }
    // ------------------------------------------------

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
