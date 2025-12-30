const db = require("../models");
const { Op } = require("sequelize");

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

// =====================================================
// API: Lấy danh sách loại lý do kiểm kê
// =====================================================
const getAllReasons = async (req, res) => {
  try {
    const reasons = await db.LoaiLyDoKiemKe.findAll({
      where: { isDeleted: false },
      order: [["TenLyDo", "ASC"]],
    });
    return res.status(200).json({ reasons });
  } catch (err) {
    console.error("[inventoryController] getAllReasons error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =====================================================
// API: Thêm loại lý do kiểm kê mới
// =====================================================
const createReason = async (req, res) => {
  try {
    const { TenLyDo, MoTa } = req.body;

    if (!TenLyDo || TenLyDo.trim() === "") {
      return res.status(400).json({ error: "Tên lý do không được để trống" });
    }

    // Kiểm tra trùng tên
    const existing = await db.LoaiLyDoKiemKe.findOne({
      where: { TenLyDo: TenLyDo.trim(), isDeleted: false },
    });
    if (existing) {
      return res.status(400).json({ error: "Lý do này đã tồn tại" });
    }

    const newReason = await db.LoaiLyDoKiemKe.create({
      TenLyDo: TenLyDo.trim(),
      MoTa: MoTa || null,
    });

    return res.status(201).json({
      message: "Thêm lý do thành công!",
      reason: newReason,
    });
  } catch (err) {
    console.error("[inventoryController] createReason error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =====================================================
// API: Cập nhật loại lý do kiểm kê
// =====================================================
const updateReason = async (req, res) => {
  try {
    const { maLyDo } = req.params;
    const { TenLyDo, MoTa } = req.body;

    const reason = await db.LoaiLyDoKiemKe.findByPk(maLyDo);
    if (!reason || reason.isDeleted) {
      return res.status(404).json({ error: "Không tìm thấy lý do" });
    }

    if (TenLyDo) {
      // Kiểm tra trùng tên với lý do khác
      const existing = await db.LoaiLyDoKiemKe.findOne({
        where: {
          TenLyDo: TenLyDo.trim(),
          MaLyDo: { [Op.ne]: maLyDo },
          isDeleted: false,
        },
      });
      if (existing) {
        return res.status(400).json({ error: "Tên lý do này đã tồn tại" });
      }
    }

    await reason.update({
      TenLyDo: TenLyDo ? TenLyDo.trim() : reason.TenLyDo,
      MoTa: MoTa !== undefined ? MoTa : reason.MoTa,
    });

    return res
      .status(200)
      .json({ message: "Cập nhật lý do thành công!", reason });
  } catch (err) {
    console.error("[inventoryController] updateReason error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =====================================================
// API: Xóa loại lý do kiểm kê (soft delete)
// =====================================================
const deleteReason = async (req, res) => {
  try {
    const { maLyDo } = req.params;

    const reason = await db.LoaiLyDoKiemKe.findByPk(maLyDo);
    if (!reason || reason.isDeleted) {
      return res.status(404).json({ error: "Không tìm thấy lý do" });
    }

    // Kiểm tra xem có chi tiết kiểm kê nào đang dùng lý do này không
    const usageCount = await db.ChiTietKiemKe.count({
      where: { MaLyDo: maLyDo },
    });

    if (usageCount > 0) {
      return res.status(400).json({
        error: `Không thể xóa! Có ${usageCount} mục kiểm kê đang sử dụng lý do này.`,
      });
    }

    await reason.update({ isDeleted: true });

    return res.status(200).json({ message: "Xóa lý do thành công!" });
  } catch (err) {
    console.error("[inventoryController] deleteReason error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// Render trang quản lý phiếu kiểm kê
const getInventoryPage = async (req, res) => {
  console.log("=== [DEBUG] getInventoryPage CALLED ===");
  console.log("[DEBUG] req.query:", req.query);
  try {
    const userInfo = {
      id: req.user.id,
      username: req.user?.username,
      role: req.user?.role,
    };

    // Xử lý lyDo có thể là string, array, hoặc chuỗi phân tách bởi dấu phẩy
    const rawLyDo =
      req.query.lyDo !== undefined
        ? req.query.lyDo
        : req.query["lyDo[]"] !== undefined
        ? req.query["lyDo[]"]
        : [];

    console.log("[DEBUG] raw lyDoFilter:", rawLyDo, "type:", typeof rawLyDo);

    const normalizeLyDoValues = (value) => {
      if (value === undefined || value === null) return [];
      const valuesArray = Array.isArray(value) ? value : [value];
      return valuesArray
        .flatMap((v) => String(v).split(","))
        .map((v) => v.trim())
        .filter(Boolean);
    };

    const lyDoFilter = normalizeLyDoValues(rawLyDo);

    const filters = {
      maPhieuKiem: (req.query.maPhieuKiem || "").trim(),
      nguoiLap: (req.query.nguoiLap || "").trim(),
      maSach: (req.query.maSach || "").trim(),
      lyDo: lyDoFilter,
      from: (req.query.from || "").trim(),
      to: (req.query.to || "").trim(),
      status: (req.query.status || "").trim(),
      minLech: (req.query.minLech || "").trim(),
      maxLech: (req.query.maxLech || "").trim(),
    };

    let inventoryReceipts = [];
    let reasonsList = [];

    try {
      // Lấy danh sách lý do kiểm kê
      reasonsList = await db.LoaiLyDoKiemKe.findAll({
        where: { isDeleted: false },
        order: [["TenLyDo", "ASC"]],
        raw: true,
      });

      const andConditions = [{ isDeleted: false }];

      if (filters.maPhieuKiem) {
        andConditions.push({
          MaPhieuKiem: { [Op.like]: `%${filters.maPhieuKiem}%` },
        });
      }

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
          andConditions.push({ NgayKiem: { [Op.between]: [start, end] } });
        } else if (start) {
          andConditions.push({ NgayKiem: { [Op.gte]: start } });
        } else if (end) {
          andConditions.push({ NgayKiem: { [Op.lte]: end } });
        }
      }

      // PIPELINE SEARCH (theo yêu cầu):
      // 1) Lấy các phiếu CÓ LỆCH dựa trên CT_KIEMKE
      // 2) Trong tập phiếu có lệch, lọc theo lý do đã chọn (CT_LYDO_KIEMKE)
      let prefilteredEmpty = false;
      const needDiscrepancyPipeline =
        (filters.lyDo && filters.lyDo.length > 0) ||
        filters.status === "discrepancy";

      let discrepancyReceiptIds = null;
      if (needDiscrepancyPipeline) {
        // Nếu user chọn balanced nhưng lại filter theo lý do => vô nghĩa
        if (
          filters.status === "balanced" &&
          filters.lyDo &&
          filters.lyDo.length > 0
        ) {
          prefilteredEmpty = true;
        } else {
          const diffWhere = db.sequelize.where(
            db.sequelize.fn(
              "ABS",
              db.sequelize.literal("SoLuongThucTe - SoLuongHeThong")
            ),
            { [Op.gt]: 0 }
          );

          const discrepancyRows = await db.ChiTietKiemKe.findAll({
            attributes: ["MaPhieuKiem"],
            where: diffWhere,
            group: ["MaPhieuKiem"],
            raw: true,
          });

          discrepancyReceiptIds = discrepancyRows.map((r) => r.MaPhieuKiem);
          console.log("[DEBUG] discrepancyReceiptIds:", discrepancyReceiptIds);
          if (discrepancyReceiptIds.length === 0) {
            prefilteredEmpty = true;
          } else {
            andConditions.push({
              MaPhieuKiem: { [Op.in]: discrepancyReceiptIds },
            });
          }
        }
      }

      if (filters.lyDo && filters.lyDo.length > 0) {
        const wantsOther = filters.lyDo.includes("other");
        const selectedIds = filters.lyDo
          .filter((v) => v !== "other")
          .map((v) => parseInt(String(v), 10))
          .filter((n) => !isNaN(n));

        const orConditions = [];
        if (selectedIds.length > 0) {
          orConditions.push({ MaLyDo: { [Op.in]: selectedIds } });
        }
        if (wantsOther) {
          // TRIM(LyDoKhac) <> '' (NULL sẽ không match)
          orConditions.push(
            db.sequelize.where(
              db.sequelize.fn("TRIM", db.sequelize.col("LyDoKhac")),
              { [Op.ne]: "" }
            )
          );
        }

        if (orConditions.length > 0) {
          const matching = await db.CT_LyDoKiemKe.findAll({
            attributes: ["MaPhieuKiem"],
            where: { [Op.or]: orConditions },
            group: ["MaPhieuKiem"],
            raw: true,
          });

          let matchingIds = matching.map((r) => r.MaPhieuKiem);

          // Pipeline step 2: chỉ giữ trong tập phiếu có lệch
          if (Array.isArray(discrepancyReceiptIds)) {
            const discrepancySet = new Set(discrepancyReceiptIds);
            matchingIds = matchingIds.filter((id) => discrepancySet.has(id));
          }

          console.log(
            "[DEBUG] matching receipt ids by lyDo (after pipeline):",
            matchingIds
          );
          if (matchingIds.length === 0) {
            prefilteredEmpty = true;
          } else {
            andConditions.push({ MaPhieuKiem: { [Op.in]: matchingIds } });
          }
        }
      }

      const employeeWhere = {};
      if (filters.nguoiLap) {
        employeeWhere[Op.or] = [
          { HoTen: { [Op.like]: `%${filters.nguoiLap}%` } },
          { Username: { [Op.like]: `%${filters.nguoiLap}%` } },
        ];
      }
      const hasEmployeeWhere = Object.keys(employeeWhere).length > 0;

      const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

      // Xác định order theo sortBy
      let orderClause = [["NgayKiem", "DESC"]]; // default
      if (filters.sortBy === "date_asc") {
        orderClause = [["NgayKiem", "ASC"]];
      } else if (filters.sortBy === "date_desc") {
        orderClause = [["NgayKiem", "DESC"]];
      } else if (filters.sortBy === "id_desc") {
        orderClause = [["MaPhieuKiem", "DESC"]];
      }
      // lech_desc và lech_asc sẽ được xử lý sau khi tính TongLech

      if (!prefilteredEmpty) {
        inventoryReceipts = await db.PhieuKiemKe.findAll({
          where,
          include: [
            {
              model: db.ChiTietKiemKe,
              as: "ChiTiet",
              required: false,
              include: [
                {
                  model: db.Sach,
                  attributes: ["MaSach", "MaDauSach"],
                  required: false,
                  include: [
                    {
                      model: db.DauSach,
                      attributes: ["TenSach"],
                      required: false,
                    },
                  ],
                },
                {
                  model: db.CT_LyDoKiemKe,
                  as: "DanhSachLyDo",
                  required: false,
                  include: [
                    {
                      model: db.LoaiLyDoKiemKe,
                      as: "LoaiLyDoKiemKe",
                      attributes: ["MaLyDo", "TenLyDo"],
                      required: false,
                    },
                  ],
                },
              ],
            },
            {
              model: db.NhanVien,
              attributes: ["HoTen", "Username"],
              required: hasEmployeeWhere,
              ...(hasEmployeeWhere ? { where: employeeWhere } : {}),
            },
          ],
          order: orderClause,
          raw: false,
        });
      } else {
        inventoryReceipts = [];
      }

      // Lấy tất cả CT_LyDoKiemKe để map vào ChiTiet (vì association không hoạt động đúng với composite key)
      const allLyDoRecords = await db.CT_LyDoKiemKe.findAll({
        include: [
          {
            model: db.LoaiLyDoKiemKe,
            as: "LoaiLyDoKiemKe",
            attributes: ["MaLyDo", "TenLyDo"],
            required: false,
          },
        ],
        raw: false,
      });

      console.log("[DEBUG] allLyDoRecords count:", allLyDoRecords.length);
      if (allLyDoRecords.length > 0) {
        console.log(
          "[DEBUG] Sample lyDo record:",
          allLyDoRecords[0].get({ plain: true })
        );
      }

      // Tạo map theo MaPhieuKiem + MaSach
      const lyDoMap = {};
      allLyDoRecords.forEach((record) => {
        const plain = record.get({ plain: true });
        const key = `${plain.MaPhieuKiem}_${plain.MaSach}`;
        if (!lyDoMap[key]) {
          lyDoMap[key] = [];
        }
        lyDoMap[key].push(plain);
      });

      console.log("[DEBUG] lyDoMap keys:", Object.keys(lyDoMap));
      console.log("[DEBUG] filters.lyDo:", filters.lyDo);

      // Tính số lượng lệch và trạng thái cho mỗi phiếu
      inventoryReceipts = inventoryReceipts.map((receipt) => {
        const plain = receipt.get({ plain: true });
        let tongLech = 0;
        let hasDiscrepancy = false;
        let containsBook = false;
        let containsReason = false;

        if (plain.ChiTiet && plain.ChiTiet.length > 0) {
          plain.ChiTiet.forEach((item) => {
            // Gán DanhSachLyDo từ map
            const key = `${plain.MaPhieuKiem}_${item.MaSach}`;
            item.DanhSachLyDo = lyDoMap[key] || [];

            const slHeThong = item.SoLuongHeThong || 0;
            const slThucTe = item.SoLuongThucTe || 0;
            const lech = Math.abs(slThucTe - slHeThong);
            tongLech += lech;
            if (lech > 0) hasDiscrepancy = true;

            // Kiểm tra filter mã/tên sách
            if (filters.maSach) {
              const searchTerm = filters.maSach.toLowerCase();
              if (
                (item.MaSach &&
                  item.MaSach.toLowerCase().includes(searchTerm)) ||
                (item.Sach &&
                  item.Sach.DauSach &&
                  item.Sach.DauSach.TenSach &&
                  item.Sach.DauSach.TenSach.toLowerCase().includes(searchTerm))
              ) {
                containsBook = true;
              }
            }

            // Kiểm tra filter lý do (hỗ trợ nhiều lý do)
            if (filters.lyDo && filters.lyDo.length > 0) {
              const danhSachLyDo = item.DanhSachLyDo || [];
              // Kiểm tra từng lý do được chọn
              for (const lyDo of filters.lyDo) {
                if (lyDo === "other") {
                  // Tìm phiếu có lý do khác (nhập tay)
                  if (
                    danhSachLyDo.some(
                      (ld) => ld.LyDoKhac && ld.LyDoKhac.trim() !== ""
                    )
                  ) {
                    containsReason = true;
                    break;
                  }
                } else {
                  if (
                    danhSachLyDo.some(
                      (ld) => String(ld.MaLyDo) === String(lyDo)
                    )
                  ) {
                    containsReason = true;
                    break;
                  }
                }
              }
            }
          });
        }

        return {
          ...plain,
          TongLech: tongLech,
          HasDiscrepancy: hasDiscrepancy,
          _containsBook: containsBook,
          _containsReason: containsReason,
        };
      });

      // Lọc theo mã/tên sách
      if (filters.maSach) {
        inventoryReceipts = inventoryReceipts.filter((r) => r._containsBook);
      }

      // Lọc theo lý do đã thực hiện ở DB-level phía trên

      // Lọc theo trạng thái
      if (filters.status === "balanced") {
        inventoryReceipts = inventoryReceipts.filter((r) => !r.HasDiscrepancy);
      } else if (filters.status === "discrepancy") {
        inventoryReceipts = inventoryReceipts.filter((r) => r.HasDiscrepancy);
      }

      // Lọc theo khoảng số lượng lệch
      if (filters.minLech) {
        const minVal = parseInt(filters.minLech, 10);
        if (!isNaN(minVal)) {
          inventoryReceipts = inventoryReceipts.filter(
            (r) => r.TongLech >= minVal
          );
        }
      }
      if (filters.maxLech) {
        const maxVal = parseInt(filters.maxLech, 10);
        if (!isNaN(maxVal)) {
          inventoryReceipts = inventoryReceipts.filter(
            (r) => r.TongLech <= maxVal
          );
        }
      }

      // Sắp xếp theo số lượng lệch (post-filter sort)
      if (filters.sortBy === "lech_desc") {
        inventoryReceipts.sort((a, b) => b.TongLech - a.TongLech);
      } else if (filters.sortBy === "lech_asc") {
        inventoryReceipts.sort((a, b) => a.TongLech - b.TongLech);
      }
    } catch (dbError) {
      console.error("[inventoryController] Database error:", dbError);
    }

    res.render("inventory", {
      ...userInfo,
      inventoryReceipts: inventoryReceipts || [],
      reasonsList: reasonsList || [],
      currentDate: new Date().toISOString().split("T")[0],
      filters,
    });
  } catch (err) {
    console.error("[inventoryController] Error:", err);
    res.render("inventory", {
      username: req.user?.username,
      role: req.user?.role,
      id: req.user?.id,
      inventoryReceipts: [],
      reasonsList: [],
      currentDate: new Date().toISOString().split("T")[0],
      filters: {
        maPhieuKiem: "",
        nguoiLap: "",
        maSach: "",
        lyDo: [],
        from: "",
        to: "",
        status: "",
        minLech: "",
        maxLech: "",
        sortBy: "date_desc",
      },
    });
  }
};

// API: Lấy tất cả phiếu kiểm kê
const getAllInventoryReceipts = async (req, res) => {
  try {
    // Parse lyDo giống getInventoryPage: string/array/comma-separated
    const rawLyDo =
      req.query.lyDo !== undefined
        ? req.query.lyDo
        : req.query["lyDo[]"] !== undefined
        ? req.query["lyDo[]"]
        : [];
    const normalizeLyDoValues = (value) => {
      if (value === undefined || value === null) return [];
      const valuesArray = Array.isArray(value) ? value : [value];
      return valuesArray
        .flatMap((v) => String(v).split(","))
        .map((v) => v.trim())
        .filter(Boolean);
    };

    const filters = {
      maPhieuKiem: (req.query.maPhieuKiem || "").trim(),
      nguoiLap: (req.query.nguoiLap || "").trim(),
      from: (req.query.from || "").trim(),
      to: (req.query.to || "").trim(),
      status: (req.query.status || "").trim(),
      lyDo: normalizeLyDoValues(rawLyDo),
    };

    const andConditions = [{ isDeleted: false }];
    if (filters.maPhieuKiem) {
      andConditions.push({
        MaPhieuKiem: { [Op.like]: `%${filters.maPhieuKiem}%` },
      });
    }

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
        andConditions.push({ NgayKiem: { [Op.between]: [start, end] } });
      } else if (start) {
        andConditions.push({ NgayKiem: { [Op.gte]: start } });
      } else if (end) {
        andConditions.push({ NgayKiem: { [Op.lte]: end } });
      }
    }

    // PIPELINE: 1) phiếu có lệch  2) trong đó lọc theo lý do
    let prefilteredEmpty = false;
    const needDiscrepancyPipeline =
      (filters.lyDo && filters.lyDo.length > 0) ||
      filters.status === "discrepancy";

    let discrepancyReceiptIds = null;
    if (needDiscrepancyPipeline) {
      if (
        filters.status === "balanced" &&
        filters.lyDo &&
        filters.lyDo.length > 0
      ) {
        prefilteredEmpty = true;
      } else {
        const diffWhere = db.sequelize.where(
          db.sequelize.fn(
            "ABS",
            db.sequelize.literal("SoLuongThucTe - SoLuongHeThong")
          ),
          { [Op.gt]: 0 }
        );

        const discrepancyRows = await db.ChiTietKiemKe.findAll({
          attributes: ["MaPhieuKiem"],
          where: diffWhere,
          group: ["MaPhieuKiem"],
          raw: true,
        });
        discrepancyReceiptIds = discrepancyRows.map((r) => r.MaPhieuKiem);
        if (discrepancyReceiptIds.length === 0) {
          prefilteredEmpty = true;
        } else {
          andConditions.push({
            MaPhieuKiem: { [Op.in]: discrepancyReceiptIds },
          });
        }
      }
    }

    if (!prefilteredEmpty && filters.lyDo && filters.lyDo.length > 0) {
      const wantsOther = filters.lyDo.includes("other");
      const selectedIds = filters.lyDo
        .filter((v) => v !== "other")
        .map((v) => parseInt(String(v), 10))
        .filter((n) => !isNaN(n));

      const orConditions = [];
      if (selectedIds.length > 0) {
        orConditions.push({ MaLyDo: { [Op.in]: selectedIds } });
      }
      if (wantsOther) {
        orConditions.push(
          db.sequelize.where(
            db.sequelize.fn("TRIM", db.sequelize.col("LyDoKhac")),
            { [Op.ne]: "" }
          )
        );
      }

      if (orConditions.length > 0) {
        const matching = await db.CT_LyDoKiemKe.findAll({
          attributes: ["MaPhieuKiem"],
          where: { [Op.or]: orConditions },
          group: ["MaPhieuKiem"],
          raw: true,
        });

        let matchingIds = matching.map((r) => r.MaPhieuKiem);
        if (Array.isArray(discrepancyReceiptIds)) {
          const discrepancySet = new Set(discrepancyReceiptIds);
          matchingIds = matchingIds.filter((id) => discrepancySet.has(id));
        }

        if (matchingIds.length === 0) {
          prefilteredEmpty = true;
        } else {
          andConditions.push({ MaPhieuKiem: { [Op.in]: matchingIds } });
        }
      }
    }

    const employeeWhere = {};
    if (filters.nguoiLap) {
      employeeWhere[Op.or] = [
        { HoTen: { [Op.like]: `%${filters.nguoiLap}%` } },
        { Username: { [Op.like]: `%${filters.nguoiLap}%` } },
      ];
    }
    const hasEmployeeWhere = Object.keys(employeeWhere).length > 0;

    const where = prefilteredEmpty
      ? { MaPhieuKiem: { [Op.eq]: "__NO_MATCH__" } }
      : andConditions.length > 0
      ? { [Op.and]: andConditions }
      : {};

    let receipts = await db.PhieuKiemKe.findAll({
      where,
      include: [
        { model: db.ChiTietKiemKe, as: "ChiTiet", required: false },
        {
          model: db.NhanVien,
          attributes: ["HoTen", "Username"],
          required: hasEmployeeWhere,
          ...(hasEmployeeWhere ? { where: employeeWhere } : {}),
        },
      ],
      order: [["NgayKiem", "ASC"]],
      raw: false,
    });

    // Bổ sung trường tính toán để client hiển thị trạng thái
    receipts = receipts.map((receipt) => {
      const plain = receipt.get({ plain: true });
      let tongLech = 0;
      let hasDiscrepancy = false;

      if (plain.ChiTiet && plain.ChiTiet.length > 0) {
        plain.ChiTiet.forEach((item) => {
          const lech = Math.abs(
            (item.SoLuongThucTe || 0) - (item.SoLuongHeThong || 0)
          );
          tongLech += lech;
          if (lech > 0) hasDiscrepancy = true;
        });
      }

      return {
        ...plain,
        TongLech: tongLech,
        HasDiscrepancy: hasDiscrepancy,
      };
    });

    if (filters.status === "balanced") {
      receipts = receipts.filter((r) => !r.HasDiscrepancy);
    } else if (filters.status === "discrepancy") {
      receipts = receipts.filter((r) => r.HasDiscrepancy);
    }

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

    // Lấy danh sách lý do cho từng sách
    const plainReceipt = receipt.get({ plain: true });
    if (plainReceipt.ChiTiet && plainReceipt.ChiTiet.length > 0) {
      for (let item of plainReceipt.ChiTiet) {
        const lyDoList = await db.CT_LyDoKiemKe.findAll({
          where: { MaPhieuKiem: maPhieu, MaSach: item.MaSach },
          include: [{ model: db.LoaiLyDoKiemKe, attributes: ["TenLyDo"] }],
          raw: true,
          nest: true,
        });
        item.DanhSachLyDo = lyDoList;
      }
    }

    return res.status(200).json({ receipt: plainReceipt });
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
          },
          { transaction: t }
        );

        // Tạo danh sách lý do (nếu có)
        if (item.DanhSachLyDo && item.DanhSachLyDo.length > 0) {
          for (const lyDo of item.DanhSachLyDo) {
            if (lyDo.SoLuong > 0) {
              await db.CT_LyDoKiemKe.create(
                {
                  MaPhieuKiem: newMaPhieu,
                  MaSach: item.MaSach,
                  MaLyDo: lyDo.MaLyDo || null,
                  LyDoKhac: lyDo.LyDoKhac || null,
                  SoLuong: lyDo.SoLuong,
                },
                { transaction: t }
              );
            }
          }
        }

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
      await db.CT_LyDoKiemKe.destroy({
        where: { MaPhieuKiem: maPhieu },
        transaction: t,
      });
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
          },
          { transaction: t }
        );

        // Tạo danh sách lý do (nếu có)
        if (item.DanhSachLyDo && item.DanhSachLyDo.length > 0) {
          for (const lyDo of item.DanhSachLyDo) {
            if (lyDo.SoLuong > 0) {
              await db.CT_LyDoKiemKe.create(
                {
                  MaPhieuKiem: maPhieu,
                  MaSach: item.MaSach,
                  MaLyDo: lyDo.MaLyDo || null,
                  LyDoKhac: lyDo.LyDoKhac || null,
                  SoLuong: lyDo.SoLuong,
                },
                { transaction: t }
              );
            }
          }
        }

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
      // Xóa chi tiết lý do trước
      await db.CT_LyDoKiemKe.destroy({
        where: { MaPhieuKiem: maPhieu },
        transaction: t,
      });

      // Xóa chi tiết phiếu kiểm kê
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
  // Quản lý loại lý do kiểm kê
  getAllReasons,
  createReason,
  updateReason,
  deleteReason,
};
