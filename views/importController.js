const db = require("../models");
const { Op } = require("sequelize");

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
    console.log("[DEBUG] req.query:", req.query);

    const userInfo = {
      id: req.user.id,
      username: req.user?.username,
      role: req.user?.role,
    };

    // Parse filters from query
    const filters = {
      maPhieu: (req.query.maPhieu || "").trim(),
      nguoiLap: (req.query.nguoiLap || "").trim(),
      maSach: (req.query.maSach || "").trim(),
      from: (req.query.from || "").trim(),
      to: (req.query.to || "").trim(),
      minSoLuong: (req.query.minSoLuong || "").trim(),
      maxSoLuong: (req.query.maxSoLuong || "").trim(),
      minTien: (req.query.minTien || "").trim(),
      maxTien: (req.query.maxTien || "").trim(),
    };

    let importReceipts = [];

    try {
      const andConditions = [{ isDeleted: false }];

      // Filter by Mã phiếu
      if (filters.maPhieu) {
        andConditions.push({
          MaPhieuNhap: { [Op.like]: `%${filters.maPhieu}%` },
        });
      }

      // Filter by date range
      if (filters.from || filters.to) {
        let start = null;
        let end = null;
        if (filters.from) {
          start = new Date(filters.from);
          start.setHours(0, 0, 0, 0);
        }
        if (filters.to) {
          end = new Date(filters.to);
          end.setHours(23, 59, 59, 999);
        }

        if (start && end) {
          andConditions.push({ NgayNhapPhieu: { [Op.between]: [start, end] } });
        } else if (start) {
          andConditions.push({ NgayNhapPhieu: { [Op.gte]: start } });
        } else if (end) {
          andConditions.push({ NgayNhapPhieu: { [Op.lte]: end } });
        }
      }

      // Filter by Tổng tiền
      if (filters.minTien || filters.maxTien) {
        const minT = filters.minTien ? parseInt(filters.minTien, 10) : null;
        const maxT = filters.maxTien ? parseInt(filters.maxTien, 10) : null;

        if (minT !== null && maxT !== null) {
          andConditions.push({ TongTien: { [Op.between]: [minT, maxT] } });
        } else if (minT !== null) {
          andConditions.push({ TongTien: { [Op.gte]: minT } });
        } else if (maxT !== null) {
          andConditions.push({ TongTien: { [Op.lte]: maxT } });
        }
      }

      // Employee filter
      const employeeWhere = {};
      if (filters.nguoiLap) {
        employeeWhere[Op.or] = [
          { HoTen: { [Op.like]: `%${filters.nguoiLap}%` } },
          { Username: { [Op.like]: `%${filters.nguoiLap}%` } },
        ];
      }
      const hasEmployeeWhere = Object.keys(employeeWhere).length > 0;

      const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

      importReceipts = await db.PhieuNhapSach.findAll({
        where,
        include: [
          {
            model: db.CT_PNS,
            as: "ChiTiet",
            required: false,
            include: [
              {
                model: db.Sach,
                attributes: ["MaSach", "MaDauSach"],
                include: [{ model: db.DauSach, attributes: ["TenSach"] }],
              },
            ],
          },
          {
            model: db.NhanVien,
            attributes: ["HoTen", "Username"],
            required: hasEmployeeWhere,
            where: hasEmployeeWhere ? employeeWhere : undefined,
          },
        ],
        order: [[db.sequelize.literal("CAST(SUBSTRING(MaPhieuNhap, 3) AS UNSIGNED)"), "ASC"]],
        raw: false,
      });

      // Tính tổng số lượng cho mỗi phiếu và lọc theo các filter còn lại
      importReceipts = importReceipts.map((receipt) => {
        const plain = receipt.get({ plain: true });
        const tongSoLuong =
          plain.ChiTiet && plain.ChiTiet.length > 0
            ? plain.ChiTiet.reduce((sum, item) => sum + (item.SoLuong || 0), 0)
            : 0;
        return {
          ...plain,
          TongSoLuong: tongSoLuong,
        };
      });

      // Filter by Mã/Tên sách (in-memory filter vì cần join nhiều bảng)
      if (filters.maSach) {
        const searchTerm = filters.maSach.toLowerCase();
        importReceipts = importReceipts.filter((receipt) => {
          if (!receipt.ChiTiet || receipt.ChiTiet.length === 0) return false;
          return receipt.ChiTiet.some((item) => {
            const maSach = (item.MaSach || "").toLowerCase();
            const tenSach = (item.Sach?.DauSach?.TenSach || "").toLowerCase();
            return maSach.includes(searchTerm) || tenSach.includes(searchTerm);
          });
        });
      }

      // Filter by Số lượng (in-memory vì TongSoLuong được tính từ ChiTiet)
      if (filters.minSoLuong || filters.maxSoLuong) {
        const minSL = filters.minSoLuong
          ? parseInt(filters.minSoLuong, 10)
          : null;
        const maxSL = filters.maxSoLuong
          ? parseInt(filters.maxSoLuong, 10)
          : null;

        importReceipts = importReceipts.filter((receipt) => {
          const sl = receipt.TongSoLuong || 0;
          if (minSL !== null && sl < minSL) return false;
          if (maxSL !== null && sl > maxSL) return false;
          return true;
        });
      }
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

    // Lấy tham số TiLeTinhDonGiaBan từ database
    const tiLeTinhDonGiaBanParam = await db.ThamSo.findOne({
      where: { TenThamSo: "TiLeTinhDonGiaBan" },
    });
    const tiLeTinhDonGiaBan = tiLeTinhDonGiaBanParam
      ? parseFloat(tiLeTinhDonGiaBanParam.GiaTri)
      : 1.05;

    res.render("books_import", {
      ...userInfo,
      importReceipts: importReceipts || [],
      filters,
      currentDate: new Date().toISOString().split("T")[0],
      soLuongNhapToiThieu: soLuongNhapToiThieu,
      tiLeTinhDonGiaBan: tiLeTinhDonGiaBan,
    });
  } catch (err) {
    console.error("[importController] Error:", err);
    res.render("books_import", {
      username: req.user?.username,
      role: req.user?.role,
      importReceipts: [],
      filters: {},
      currentDate: new Date().toISOString().split("T")[0],
      soLuongNhapToiThieu: 150,
      tiLeTinhDonGiaBan: 1.05,
    });
  }
};

const getAllImportReceipts = async (req, res) => {
  try {
    const receipts = await db.PhieuNhapSach.findAll({
      where: { isDeleted: false },
      include: [{ model: db.CT_PNS, as: "ChiTiet", required: false }],
      order: [["NgayNhapPhieu", "ASC"]],
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
        {
          model: db.NhanVien,
          attributes: ["MaNhanVien", "HoTen"],
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

      // KIỂM TRA SÁCH TỒN TẠI VÀ CHƯA BỊ XÓA MỀM
      const sachCheck = await db.Sach.findOne({
        where: { MaSach: item.MaSach, isDeleted: false },
        include: [
          {
            model: db.DauSach,
            attributes: ["TenSach"],
            where: { isDeleted: false },
            required: false,
          },
        ],
      });
      if (!sachCheck) {
        return res.status(400).json({
          error: `Sách có mã ${item.MaSach} không tồn tại`,
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
        const tenSach = sachCheck?.DauSach?.TenSach || item.MaSach;
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
      // KIỂM TRA SÁCH TỒN TẠI VÀ CHƯA BỊ XÓA MỀM
      const sachCheck = await db.Sach.findOne({
        where: { MaSach: item.MaSach, isDeleted: false },
        include: [
          {
            model: db.DauSach,
            attributes: ["TenSach"],
            where: { isDeleted: false },
            required: false,
          },
        ],
      });
      if (!sachCheck) {
        return res.status(400).json({
          error: `Sách có mã ${item.MaSach} không tồn tại hoặc đã bị xóa`,
        });
      }

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

// API: Xóa phiếu nhập sách (SOFT DELETE)
const deleteImportReceipt = async (req, res) => {
  try {
    const maPhieu = req.params.maPhieu;
    const receipt = await db.PhieuNhapSach.findByPk(maPhieu);

    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu nhập" });
    }

    // Kiểm tra nếu phiếu nhập đã bị xóa rồi
    if (receipt.isDeleted) {
      return res
        .status(400)
        .json({ error: "Phiếu nhập này đã bị xóa trước đó." });
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

      // Soft delete: đánh dấu isDeleted = true thay vì xóa thật
      await receipt.update({ isDeleted: true }, { transaction: t });
    });

    return res.status(200).json({ message: "Xóa phiếu nhập thành công!" });
  } catch (err) {
    console.error("[importController] deleteImportReceipt error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =====================================================
// ADMIN ONLY: LẤY DANH SÁCH PHIẾU NHẬP ĐÃ XÓA
// =====================================================
const getDeletedImportReceipts = async (req, res) => {
  try {
    const receipts = await db.PhieuNhapSach.findAll({
      where: { isDeleted: true },
      include: [
        {
          model: db.CT_PNS,
          as: "ChiTiet",
          required: false,
          include: [
            {
              model: db.Sach,
              attributes: ["MaSach", "isDeleted"],
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
      order: [["NgayNhapPhieu", "DESC"]],
      raw: false,
    });

    const result = receipts.map((receipt) => {
      const plain = receipt.get({ plain: true });

      // Kiểm tra xem có sách nào đã bị xóa không
      let hasDeletedSach = false;
      let deletedSachCount = 0;

      if (plain.ChiTiet) {
        for (const detail of plain.ChiTiet) {
          if (detail.Sach && detail.Sach.isDeleted) {
            hasDeletedSach = true;
            deletedSachCount++;
          }
        }
      }

      return {
        ...plain,
        hasDeletedSach,
        deletedSachCount,
      };
    });

    return res.status(200).json({ receipts: result });
  } catch (err) {
    console.error("[importController] getDeletedImportReceipts error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =====================================================
// ADMIN ONLY: KHÔI PHỤC PHIẾU NHẬP ĐÃ XÓA
// =====================================================
const restoreImportReceipt = async (req, res) => {
  try {
    const maPhieu = req.params.maPhieu;
    const restoreSachToo = req.query.restoreSach === "true";

    const receipt = await db.PhieuNhapSach.findByPk(maPhieu, {
      include: [
        {
          model: db.CT_PNS,
          as: "ChiTiet",
          include: [
            {
              model: db.Sach,
              attributes: ["MaSach", "isDeleted"],
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
    });

    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu nhập" });
    }

    if (!receipt.isDeleted) {
      return res.status(400).json({ error: "Phiếu nhập này chưa bị xóa." });
    }

    // Kiểm tra xem có sách nào đã bị xóa không
    const deletedSachList = [];
    if (receipt.ChiTiet) {
      for (const detail of receipt.ChiTiet) {
        if (detail.Sach && detail.Sach.isDeleted) {
          deletedSachList.push({
            MaSach: detail.Sach.MaSach,
            TenSach: detail.Sach.DauSach?.TenSach || detail.Sach.MaSach,
          });
        }
      }
    }

    if (deletedSachList.length > 0 && !restoreSachToo) {
      const sachNames = deletedSachList
        .map((s) => `"${s.TenSach}" (${s.MaSach})`)
        .join(", ");
      return res.status(409).json({
        error: "Có sách liên kết đã bị xóa",
        requireSachRestore: true,
        deletedSachList: deletedSachList,
        message: `Các sách sau đã bị xóa: ${sachNames}. Bạn có muốn khôi phục cả các sách này không?`,
      });
    }

    // Khôi phục phiếu nhập và cộng lại tồn kho
    await db.sequelize.transaction(async (t) => {
      // Khôi phục các sách đã bị xóa nếu cần
      if (restoreSachToo && deletedSachList.length > 0) {
        for (const sachInfo of deletedSachList) {
          await db.Sach.update(
            { isDeleted: false },
            { where: { MaSach: sachInfo.MaSach }, transaction: t }
          );
        }
      }

      const details = await db.CT_PNS.findAll({
        where: { MaPhieuNhap: maPhieu },
        transaction: t,
      });

      for (const detail of details) {
        const sach = await db.Sach.findByPk(detail.MaSach, { transaction: t });
        if (sach) {
          await sach.update(
            { SoLuongTon: sach.SoLuongTon + detail.SoLuong },
            { transaction: t }
          );
        }
      }

      await receipt.update({ isDeleted: false }, { transaction: t });
    });

    const successMessage =
      restoreSachToo && deletedSachList.length > 0
        ? `Khôi phục phiếu nhập và ${deletedSachList.length} sách liên kết thành công!`
        : "Khôi phục phiếu nhập thành công!";

    return res.status(200).json({ message: successMessage });
  } catch (err) {
    console.error("[importController] restoreImportReceipt error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =====================================================
// ADMIN ONLY: XÓA VĨNH VIỄN PHIẾU NHẬP (HARD DELETE)
// =====================================================
const hardDeleteImportReceipt = async (req, res) => {
  try {
    const maPhieu = req.params.maPhieu;
    const receipt = await db.PhieuNhapSach.findByPk(maPhieu);

    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy phiếu nhập" });
    }

    if (!receipt.isDeleted) {
      return res.status(400).json({
        error: "Chỉ có thể xóa vĩnh viễn phiếu nhập đã được xóa mềm trước đó.",
      });
    }

    await db.sequelize.transaction(async (t) => {
      // Xóa chi tiết phiếu nhập trước
      await db.CT_PNS.destroy({
        where: { MaPhieuNhap: maPhieu },
        transaction: t,
      });

      // Xóa phiếu nhập
      await receipt.destroy({ transaction: t });
    });

    return res
      .status(200)
      .json({ message: "Đã xóa vĩnh viễn phiếu nhập khỏi hệ thống!" });
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        error:
          "Xóa thất bại! Phiếu nhập này có dữ liệu liên quan trong hệ thống.",
      });
    }
    console.error("[importController] hardDeleteImportReceipt error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

module.exports = {
  getImportPage,
  getAllImportReceipts,
  getDeletedImportReceipts,
  getImportReceiptById,
  createImportReceipt,
  updateImportReceipt,
  deleteImportReceipt,
  restoreImportReceipt,
  hardDeleteImportReceipt,
};
