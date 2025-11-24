const db = require("../models");

// Helper: generate new MaDauSach (prefix DS)
async function generateNewDauSachId() {
  const prefix = "DS";
  const padding = 3;
  const last = await db.DauSach.findOne({
    order: [
      [
        db.sequelize.literal(
          `CAST(SUBSTRING(MaDauSach, ${prefix.length + 1}) AS UNSIGNED)`
        ),
        "DESC",
      ],
    ],
    attributes: ["MaDauSach"],
    raw: true,
  });
  let lastNum = 0;
  if (last && last.MaDauSach) {
    try {
      lastNum = parseInt(last.MaDauSach.substring(prefix.length), 10);
    } catch (e) {
      /* ignore */
    }
  }
  return prefix + String(lastNum + 1).padStart(padding, "0");
}

// Helper: generate new MaSach (prefix S)
async function generateNewSachId() {
  const prefix = "S";
  const padding = 3;
  const last = await db.Sach.findOne({
    order: [
      [
        db.sequelize.literal(
          `CAST(SUBSTRING(MaSach, ${prefix.length + 1}) AS UNSIGNED)`
        ),
        "DESC",
      ],
    ],
    attributes: ["MaSach"],
    raw: true,
  });
  let lastNum = 0;
  if (last && last.MaSach) {
    try {
      lastNum = parseInt(last.MaSach.substring(prefix.length), 10);
    } catch (e) {
      /* ignore */
    }
  }
  return prefix + String(lastNum + 1).padStart(padding, "0");
}

// Render page: /dashboard/books
const getBooksPage = async (req, res) => {
  try {
    console.log("[bookController] getBooksPage called");
    console.log("[bookController] req.user =", req.user);
    const userInfo = { username: req.user?.username, role: req.user?.role };

    // Fetch data for UI: dau sach, sach, authors, types
    console.log("[bookController] fetching dauSachs, books, authors, types");
    const [dauSachs, books, authors, types] = await Promise.all([
      db.DauSach.findAll({ raw: true }),
      db.Sach.findAll({ raw: true }),
      db.TacGia.findAll({ raw: true }),
      db.TheLoai.findAll({ raw: true }),
    ]);
    console.log("[bookController] fetched counts:", {
      dauSachs: dauSachs.length,
      books: books.length,
      authors: authors.length,
      types: types.length,
    });

    res.render("books", {
      ...userInfo,
      dauSachs,
      books,
      authors,
      types,
    });
  } catch (err) {
    console.error(
      "[bookController] Lỗi khi render books page:",
      err && err.stack ? err.stack : err
    );
    // In dev show message, in prod keep generic
    if (process.env.NODE_ENV !== "production") {
      return res
        .status(500)
        .send(`Lỗi Server: ${err && err.message ? err.message : "unknown"}`);
    }
    res.status(500).send("Lỗi Server");
  }
};

// =====================================================
// API: DauSach (Đầu sách)
// =====================================================
const getAllDauSach = async (req, res) => {
  try {
    console.log("[bookController] getAllDauSach called");
    const results = await db.DauSach.findAll({ raw: true });
    console.log("[bookController] getAllDauSach result count=", results.length);
    res.status(200).json(results);
  } catch (err) {
    console.error(
      "[bookController] getAllDauSach error:",
      err && err.stack ? err.stack : err
    );
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const createDauSach = async (req, res) => {
  try {
    console.log("[bookController] createDauSach body=", req.body);
    const { MaDauSach, TenSach, MaTheLoai, MoTa, tacGiaIds } = req.body;
    const ma = MaDauSach || (await generateNewDauSachId());

    const newDau = await db.DauSach.create({
      MaDauSach: ma,
      TenSach,
      MaTheLoai,
      MoTa,
    });

    // Associate authors if provided
    if (Array.isArray(tacGiaIds) && tacGiaIds.length > 0) {
      console.log(
        "[bookController] createDauSach associating authors",
        tacGiaIds
      );
      const ctRows = tacGiaIds.map((id) => ({ MaDauSach: ma, MaTacGia: id }));
      await db.CT_TacGia.bulkCreate(ctRows);
    }

    res
      .status(201)
      .json({ message: "Tạo đầu sách thành công!", dauSach: newDau });
  } catch (err) {
    console.error(
      "[bookController] createDauSach error:",
      err && err.stack ? err.stack : err
    );
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const updateDauSach = async (req, res) => {
  try {
    console.log(
      "[bookController] updateDauSach params=",
      req.params,
      "body=",
      req.body
    );
    const ma = req.params.maDS;
    const { TenSach, MaTheLoai, MoTa, tacGiaIds } = req.body;
    const ds = await db.DauSach.findByPk(ma);
    if (!ds) return res.status(404).json({ error: "Không tìm thấy Đầu sách." });

    ds.TenSach = TenSach || ds.TenSach;
    ds.MaTheLoai = MaTheLoai || ds.MaTheLoai;
    ds.MoTa = MoTa || ds.MoTa;
    await ds.save();

    if (Array.isArray(tacGiaIds)) {
      console.log(
        "[bookController] updateDauSach replacing authors with",
        tacGiaIds
      );
      // Xóa cũ và thêm mới (đơn giản)
      await db.CT_TacGia.destroy({ where: { MaDauSach: ma } });
      const ctRows = tacGiaIds.map((id) => ({ MaDauSach: ma, MaTacGia: id }));
      if (ctRows.length) await db.CT_TacGia.bulkCreate(ctRows);
    }

    res
      .status(200)
      .json({ message: "Cập nhật đầu sách thành công!", dauSach: ds });
  } catch (err) {
    console.error(
      "[bookController] updateDauSach error:",
      err && err.stack ? err.stack : err
    );
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const deleteDauSach = async (req, res) => {
  try {
    console.log("[bookController] deleteDauSach params=", req.params);
    const ma = req.params.maDS;
    const ds = await db.DauSach.findByPk(ma);
    if (!ds) return res.status(404).json({ error: "Không tìm thấy Đầu sách." });

    await db.CT_TacGia.destroy({ where: { MaDauSach: ma } });
    await ds.destroy();
    console.log("[bookController] deleteDauSach success for", ma);
    res.status(200).json({ message: "Xóa đầu sách thành công!" });
  } catch (err) {
    console.error(
      "[bookController] deleteDauSach error:",
      err && err.stack ? err.stack : err
    );
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =====================================================
// API: Sach (bản sách cụ thể)
// =====================================================
const getAllSach = async (req, res) => {
  try {
    console.log("[bookController] getAllSach called");
    const results = await db.Sach.findAll({ raw: true });
    console.log("[bookController] getAllSach count=", results.length);
    res.status(200).json(results);
  } catch (err) {
    console.error(
      "[bookController] getAllSach error:",
      err && err.stack ? err.stack : err
    );
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const createSach = async (req, res) => {
  try {
    console.log("[bookController] createSach body=", req.body);
    let {
      MaSach,
      MaDauSach,
      TenSach,
      NhaXB,
      NamXB,
      NhaXuatBan,
      NamXuatBan,
      MoTa,
      SoLuongTon,
    } = req.body;

    // Normalize alternate field names
    NhaXB = NhaXB || NhaXuatBan || null;
    NamXB = NamXB || NamXuatBan || null;

    // If no MaDauSach provided, create a minimal DauSach so foreign key not null
    if (!MaDauSach) {
      const newMaDS = await generateNewDauSachId();
      console.log(
        "[bookController] createSach will create new DauSach with id=",
        newMaDS
      );
      await db.DauSach.create({
        MaDauSach: newMaDS,
        TenSach: TenSach || "(Chưa đặt tên)",
        MaTheLoai: null,
        MoTa: MoTa || null,
      });
      MaDauSach = newMaDS;
    }

    const ma = MaSach || (await generateNewSachId());
    const newSach = await db.Sach.create({
      MaSach: ma,
      MaDauSach,
      NhaXB,
      NamXB: NamXB ? parseInt(NamXB, 10) : null,
      MoTa,
      SoLuongTon: typeof SoLuongTon !== "undefined" ? SoLuongTon : 0,
    });
    res.status(201).json({ message: "Tạo sách thành công!", sach: newSach });
  } catch (err) {
    // Log detailed SQL error when available
    console.error(
      "[bookController] createSach error:",
      err && err.stack ? err.stack : err
    );
    if (err && err.parent && err.parent.sqlMessage) {
      console.error("[bookController] SQL error:", err.parent.sqlMessage);
    }
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const updateSach = async (req, res) => {
  try {
    console.log(
      "[bookController] updateSach params=",
      req.params,
      "body=",
      req.body
    );
    const ma = req.params.maSach;
    const data = req.body;
    const sach = await db.Sach.findByPk(ma);
    if (!sach) return res.status(404).json({ error: "Không tìm thấy Sách." });

    sach.NhaXB = data.NhaXB || sach.NhaXB;
    sach.NamXB = data.NamXB || sach.NamXB;
    sach.MoTa = data.MoTa || sach.MoTa;
    sach.SoLuongTon =
      typeof data.SoLuongTon !== "undefined"
        ? data.SoLuongTon
        : sach.SoLuongTon;
    await sach.save();

    console.log("[bookController] updateSach success for", ma);
    res.status(200).json({ message: "Cập nhật sách thành công!", sach });
  } catch (err) {
    console.error(
      "[bookController] updateSach error:",
      err && err.stack ? err.stack : err
    );
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const deleteSach = async (req, res) => {
  try {
    console.log("[bookController] deleteSach params=", req.params);
    const ma = req.params.maSach;
    const sach = await db.Sach.findByPk(ma);
    if (!sach) return res.status(404).json({ error: "Không tìm thấy Sách." });
    await sach.destroy();
    console.log("[bookController] deleteSach success for", ma);
    res.status(200).json({ message: "Xóa sách thành công!" });
  } catch (err) {
    console.error(
      "[bookController] deleteSach error:",
      err && err.stack ? err.stack : err
    );
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

module.exports = {
  getBooksPage,
  // DauSach
  getAllDauSach,
  createDauSach,
  updateDauSach,
  deleteDauSach,
  // Sach
  getAllSach,
  createSach,
  updateSach,
  deleteSach,
};
