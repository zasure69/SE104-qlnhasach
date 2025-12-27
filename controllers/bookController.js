const { Op } = require("sequelize");
const db = require("../models");

// Hàm này trả về giá trị (value) thay vì response (res)
const timMaTheLoai = async (tenTheLoaiInput, options = {}) => {
  try {
    const theLoai = await db.TheLoai.findOne({
      where: { TenTheLoai: tenTheLoaiInput },
      attributes: ["MaTheLoai"],
      raw: true,
      ...options, // cho phép truyền { transaction }
    });
    return theLoai ? theLoai.MaTheLoai : null;
  } catch (error) {
    console.error("Lỗi helper tìm mã thể loại:", error);
    throw error;
  }
};

const timMaTacGia = async (tenTacGiaInput) => {
  try {
    const tacGia = await db.TacGia.findOne({
      where: { HoTen: tenTacGiaInput },
      attributes: ["MaTacGia"],
      raw: true,
    });
    return tacGia ? tacGia.MaTacGia : null;
  } catch (error) {
    console.error("Lỗi helper tìm mã tác giả:", error);
    throw error;
  }
};

// Helper: generate new MaDauSach (prefix DS)
// async function generateNewDauSachId() {
//   const prefix = "DS";
//   const padding = 3;
//   const last = await db.DauSach.findOne({
//     order: [
//       [
//         db.sequelize.literal(
//           `CAST(SUBSTRING(MaDauSach, ${prefix.length + 1}) AS UNSIGNED)`
//         ),
//         "DESC",
//       ],
//     ],
//     attributes: ["MaDauSach"],
//     raw: true,
//   });
//   let lastNum = 0;
//   if (last && last.MaDauSach) {
//     try {
//       lastNum = parseInt(last.MaDauSach.substring(prefix.length), 10);
//     } catch (e) {
//       /* ignore */
//     }
//   }
//   return prefix + String(lastNum + 1).padStart(padding, "0");
// }

// Helper: generate new MaDauSach (prefix DS)
async function generateNewDauSachId() {
  const prefix = "DS";
  const paddingLength = 3; // Sẽ tạo ra DS001, DS002...

  const lastCustomer = await db.DauSach.findOne({
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

  let lastIdNumber = 0;
  if (lastCustomer && lastCustomer.MaDauSach) {
    try {
      lastIdNumber = parseInt(
        lastCustomer.MaDauSach.substring(prefix.length),
        10
      );
    } catch (error) {
      console.error("Lỗi khi phân tích Mã Đầu Sách cuối cùng:", error);
    }
  }
  const newIdNumber = lastIdNumber + 1;
  return prefix + String(newIdNumber).padStart(paddingLength, "0");
}

// Helper: generate new MaSach (prefix S)
// async function generateNewSachId() {
//   const prefix = "S";
//   const padding = 3;
//   const last = await db.Sach.findOne({
//     order: [
//       [
//         db.sequelize.literal(
//           `CAST(SUBSTRING(MaSach, ${prefix.length + 1}) AS UNSIGNED)`
//         ),
//         "DESC",
//       ],
//     ],
//     attributes: ["MaSach"],
//     raw: true,
//   });
//   let lastNum = 0;
//   if (last && last.MaSach) {
//     try {
//       lastNum = parseInt(last.MaSach.substring(prefix.length), 10);
//     } catch (e) {
//       /* ignore */
//     }
//   }
//   return prefix + String(lastNum + 1).padStart(padding, "0");
// }

// Helper: generate new MaSach (prefix S)
async function generateNewSachId() {
  const prefix = "S";
  const paddingLength = 3; // Sẽ tạo ra S001, S002...

  const lastCustomer = await db.Sach.findOne({
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

  let lastIdNumber = 0;
  if (lastCustomer && lastCustomer.MaSach) {
    try {
      lastIdNumber = parseInt(lastCustomer.MaSach.substring(prefix.length), 10);
    } catch (error) {
      console.error("Lỗi khi phân tích Mã Sách cuối cùng:", error);
    }
  }
  const newIdNumber = lastIdNumber + 1;
  return prefix + String(newIdNumber).padStart(paddingLength, "0");
}
// Hàm sinh mã Thể loại mới (Ví dụ: TL001, TL002...)
const generateNewMaTheLoai = async () => {
  const lastTheLoai = await db.TheLoai.findOne({
    order: [["MaTheLoai", "DESC"]],
  });
  if (!lastTheLoai) return "TL001";

  // Tách số từ mã cũ (VD: "TL015" -> 15)
  const lastIdNum = parseInt(lastTheLoai.MaTheLoai.replace(/\D/g, ""));
  const newIdNum = lastIdNum + 1;

  // Format lại thành chuỗi 3 số (VD: 16 -> "TL016")
  return `TL${newIdNum.toString().padStart(3, "0")}`;
};

// Hàm sinh mã Tác giả mới (Ví dụ: TG001, TG002...)
const generateNewMaTacGia = async () => {
  const lastTacGia = await db.TacGia.findOne({
    order: [["MaTacGia", "DESC"]],
  });
  if (!lastTacGia) return "TG001";

  const lastIdNum = parseInt(lastTacGia.MaTacGia.replace(/\D/g, ""));
  const newIdNum = lastIdNum + 1;
  return `TG${newIdNum.toString().padStart(3, "0")}`;
};

// Helper: resolve list of authors (IDs or names) to MaTacGia array, creating missing names
const resolveTacGiaList = async (list, transaction) => {
  const result = new Set();
  for (const item of Array.isArray(list) ? list : []) {
    if (!item) continue;
    let maTacGia = null;

    // Treat TGxxx as explicit ID
    if (typeof item === "string" && /^TG\d+$/i.test(item)) {
      const found = await db.TacGia.findByPk(item, { transaction, raw: true });
      if (found) maTacGia = found.MaTacGia;
    } else if (typeof item === "string") {
      // Treat as author name
      const foundByName = await db.TacGia.findOne({
        where: { HoTen: item },
        attributes: ["MaTacGia"],
        transaction,
        raw: true,
      });
      if (foundByName) {
        maTacGia = foundByName.MaTacGia;
      } else {
        const newId = await generateNewMaTacGia();
        await db.TacGia.create(
          { MaTacGia: newId, HoTen: item, NamSinh: null },
          { transaction }
        );
        maTacGia = newId;
      }
    }
    if (maTacGia) result.add(maTacGia);
  }
  return Array.from(result);
};

// Render page: /dashboard/books
const getBooksPage = async (req, res) => {
  try {
    console.log("[bookController] getBooksPage called");
    const userInfo = { id: req.user.id, username: req.user.username, role: req.user.role };

    // Fetch DauSach với JOIN TheLoai và TacGia (chỉ lấy chưa bị xóa)
    console.log("[getBooksPage] Fetching DauSach with associations...");
    const dauSachsRaw = await db.DauSach.findAll({
      where: { isDeleted: false },
      include: [
        {
          model: db.TheLoai,
          attributes: ["TenTheLoai"],
          required: false,
          where: { isDeleted: false },
        },
        {
          model: db.TacGia,
          as: "TacGias", // Sử dụng alias
          through: { attributes: [] }, // Không lấy thông tin bảng trung gian
          attributes: ["MaTacGia", "HoTen"],
          required: false,
          where: { isDeleted: false },
        },
      ],
      raw: false, // Để lấy được associations
    });

    // Transform data để hiển thị
    const dauSachs = dauSachsRaw.map((ds) => {
      const tacGiaString =
        ds.TacGias && ds.TacGias.length > 0
          ? ds.TacGias.map((tg) => tg.HoTen).join(", ")
          : "";

      return {
        MaDauSach: ds.MaDauSach,
        TenSach: ds.TenSach,
        TenTheLoai: ds.TheLoai ? ds.TheLoai.TenTheLoai : "",
        TacGia: tacGiaString,
        MoTa: ds.MoTa || "",
      };
    });

    // Fetch Sach với JOIN DauSach, TheLoai, TacGia (chỉ lấy chưa bị xóa)
    const sachsRaw = await db.Sach.findAll({
      where: { isDeleted: false },
      include: [
        {
          model: db.DauSach,
          attributes: ["TenSach", "MaTheLoai"],
          where: { isDeleted: false },
          required: false,
          include: [
            {
              model: db.TheLoai,
              attributes: ["TenTheLoai"],
              required: false,
            },
            {
              model: db.TacGia,
              as: "TacGias",
              through: { attributes: [] },
              attributes: ["HoTen"],
              required: false,
            },
          ],
        },
      ],
      raw: false,
    });

    // Lấy thông tin sách với SoLuongTon từ DB (đã được maintain bởi import/bill operations)
    const books = sachsRaw.map((s) => {
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
        MoTa: plain.MoTa || "",
        SoLuongTon: plain.SoLuongTon || 0,
      };
    });

    const [authors, types] = await Promise.all([
      db.TacGia.findAll({ where: { isDeleted: false }, raw: true }),
      db.TheLoai.findAll({ where: { isDeleted: false }, raw: true }),
    ]);

    console.log("[bookController] Fetched data:", {
      dauSachs: dauSachs.length,
      books: books.length,
      authors: authors.length,
      types: types.length,
    });

    // Đảm bảo response có charset UTF-8
    res.setHeader("Content-Type", "text/html; charset=utf-8");

    res.render("books", {
      ...userInfo,
      dauSachs,
      books,
      authors,
      types,
      currentYear: new Date().getFullYear(),
    });
  } catch (err) {
    console.error("[bookController] Error:", err);
    res.status(500).send(`Lỗi Server: ${err.message}`);
  }
};

// =====================================================
// API: DauSach (Đầu sách)
// =====================================================
const getAllDauSach = async (req, res) => {
  try {
    const dauSachs = await db.DauSach.findAll({ 
      where: { isDeleted: false },
      raw: true 
    });
    return res.status(200).json(dauSachs);
  } catch (err) {
    console.error("[bookController] getAllDauSach error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const getDauSachById = async (req, res) => {
  try {
    const maDS = req.params.maDS;
    const dauSach = await db.DauSach.findByPk(maDS, {
      include: [
        {
          model: db.TheLoai,
          attributes: ["TenTheLoai"],
          required: false,
        },
        {
          model: db.TacGia,
          as: "TacGias",
          through: { attributes: [] },
          attributes: ["MaTacGia", "HoTen"],
          required: false,
        },
      ],
      raw: false,
    });

    if (!dauSach) {
      return res.status(404).json({ error: "Không tìm thấy Đầu sách" });
    }

    const tacGiaString =
      dauSach.TacGias && dauSach.TacGias.length > 0
        ? dauSach.TacGias.map((tg) => tg.HoTen).join(", ")
        : "";

    const result = {
      MaDauSach: dauSach.MaDauSach,
      TenSach: dauSach.TenSach,
      TenTheLoai: dauSach.TheLoai ? dauSach.TheLoai.TenTheLoai : "",
      TacGia: tacGiaString,
      MoTa: dauSach.MoTa || "",
    };

    return res.status(200).json({ dauSach: result });
  } catch (err) {
    console.error("[bookController] getDauSachById error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const createDauSach = async (req, res) => {
  try {
    const { TenSach, TenTheLoai, MoTa, tacGiaIds } = req.body;
    console.log("[bookController] createDauSach called with body:", req.body);

    // Chuẩn hóa danh sách tác giả
    const authorsInput = Array.isArray(tacGiaIds) ? tacGiaIds : [tacGiaIds];
    const authors = authorsInput
      .filter(Boolean)
      .map((a) => (typeof a === "string" ? a.trim() : a))
      .filter(Boolean);

    if (!TenSach || !TenTheLoai || authors.length === 0) {
      return res.status(400).json({
        error:
          "Vui lòng nhập đủ: Tên sách, Tên thể loại và Danh sách tác giả (mảng hoặc chuỗi)",
      });
    }

    // KIỂM TRA RÀNG BUỘC KHÓA NGOẠI: Thể loại phải tồn tại
    const theLoaiExists = await db.TheLoai.findOne({
      where: { TenTheLoai: TenTheLoai.trim() },
    });
    if (!theLoaiExists) {
      return res.status(400).json({
        error: `Thể loại "${TenTheLoai}" không tồn tại trong hệ thống. Vui lòng thêm thể loại trước.`,
      });
    }

    let newMaDauSach;
    let finalMaTheLoai;
    let finalTacGiaIds = [];

    // Managed transaction: auto-commit/rollback
    await db.sequelize.transaction(async (t) => {
      // Thể loại: tìm hoặc tạo
      finalMaTheLoai = await timMaTheLoai(TenTheLoai, { transaction: t });
      if (!finalMaTheLoai) {
        finalMaTheLoai = await generateNewMaTheLoai();
        await db.TheLoai.create(
          { MaTheLoai: finalMaTheLoai, TenTheLoai },
          { transaction: t }
        );
      }

      // Tác giả: tìm theo ID (TGxxx) hoặc tên; nếu chưa có thì thêm vào bảng TacGia
      const maTacGiaSet = new Set();
      for (const item of authors) {
        if (!item) continue;
        let maTacGia = null;

        // Nếu là mã TGxxx
        if (typeof item === "string" && /^TG\d+$/i.test(item)) {
          const found = await db.TacGia.findByPk(item, { transaction: t });
          if (found) {
            maTacGia = found.MaTacGia;
          } else {
            throw new Error(`Mã tác giả ${item} không tồn tại`);
          }
        } else {
          // Tên tác giả
          const tenTG = String(item).trim();
          let found = await db.TacGia.findOne({
            where: { HoTen: tenTG },
            transaction: t,
          });
          if (!found) {
            // Tạo tác giả mới
            const newMaTG = await generateNewMaTacGia();
            found = await db.TacGia.create(
              { MaTacGia: newMaTG, HoTen: tenTG },
              { transaction: t }
            );
          }
          maTacGia = found.MaTacGia;
        }

        if (maTacGia) maTacGiaSet.add(maTacGia);
      }

      finalTacGiaIds = Array.from(maTacGiaSet);
      if (finalTacGiaIds.length === 0) {
        throw new Error("Không thể xử lý danh sách tác giả");
      }

      // KIỂM TRA TRÙNG LẶP: Tìm đầu sách có cùng tên
      const existingDauSachs = await db.DauSach.findAll({
        where: { TenSach: TenSach.trim() },
        include: [
          {
            model: db.TacGia,
            as: "TacGias",
            through: { attributes: [] },
            attributes: ["MaTacGia"],
            required: false,
          },
        ],
        transaction: t,
        raw: false,
      });

      // Kiểm tra xem có đầu sách nào có cùng tên và cùng danh sách tác giả không
      for (const existingDS of existingDauSachs) {
        const existingAuthorIds = existingDS.TacGias
          ? existingDS.TacGias.map((tg) => tg.MaTacGia).sort()
          : [];
        const newAuthorIds = [...finalTacGiaIds].sort();

        // So sánh 2 mảng tác giả
        if (
          existingAuthorIds.length === newAuthorIds.length &&
          existingAuthorIds.every((id, idx) => id === newAuthorIds[idx])
        ) {
          throw new Error(
            `Đầu sách "${TenSach}" với cùng danh sách tác giả đã tồn tại (Mã: ${existingDS.MaDauSach})`
          );
        }
      }

      // Tạo đầu sách
      newMaDauSach = await generateNewDauSachId();
      await db.DauSach.create(
        {
          MaDauSach: newMaDauSach,
          TenSach,
          MaTheLoai: finalMaTheLoai,
          MoTa: MoTa || null,
        },
        { transaction: t }
      );

      // Tạo liên kết CT_TacGia
      await db.CT_TacGia.bulkCreate(
        finalTacGiaIds.map((id) => ({ MaDauSach: newMaDauSach, MaTacGia: id })),
        { transaction: t }
      );
    });

    // Sau khi commit, kiểm tra lại bản ghi đã tồn tại
    const created = await db.DauSach.findByPk(newMaDauSach, { raw: true });
    if (!created) {
      return res.status(500).json({
        error: "Tạo đầu sách thất bại (không tìm thấy sau khi commit)",
      });
    }

    return res.status(201).json({
      message: "Tạo đầu sách thành công!",
      dauSach: created,
      info: { theLoai: finalMaTheLoai, tacGia: finalTacGiaIds },
    });
  } catch (err) {
    console.error("[bookController] createDauSach error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ: " + err.message });
  }
};

// =============================================================
// HÀM THÊM ĐẦU SÁCH (CREATE)
// =============================================================
// const createDauSach = async (req, res) => {
//   const { TenSach, TenTheLoai, MoTa, HoTen } = req.body;

//   try {
//     const newMaDauSach = await generateNewDauSachId();
//     const resolvedCategory = await resolveCategory(TenTheLoai);
//     if (!resolvedCategory) {
//       return res.status(400).json({ error: "Thể loại không hợp lệ" });
//     }

//     const newDauSach = await db.DauSach.create({
//       MaDauSach: newMaDauSach,
//       TenSach,
//       MaTheLoai: resolvedCategory,
//       MoTa,
//     });

//     res
//       .status(201)
//       .json({ message: "Tạo đầu sách thành công!", dauSach: newDauSach });
//   } catch (err) {
//     if (err.name === "SequelizeUniqueConstraintError") {
//       return res.status(409).json({ error: "Số điện thoại này đã tồn tại." });
//     }
//     console.error(err);
//     res.status(500).json({ error: "Lỗi server nội bộ" });
//   }
// };

const updateDauSach = async (req, res) => {
  try {
    const maDS = req.params.maDS;
    const { TenSach, TenTheLoai, MoTa, tacGiaIds } = req.body;

    console.log("[updateDauSach] Starting update for:", maDS);
    console.log("[updateDauSach] Request body:", {
      TenSach,
      TenTheLoai,
      MoTa,
      tacGiaIds,
    });

    const dauSach = await db.DauSach.findByPk(maDS);
    if (!dauSach) {
      console.log("[updateDauSach] Đầu sách not found:", maDS);
      return res.status(404).json({ error: "Không tìm thấy Đầu sách" });
    }

    console.log("[updateDauSach] Current data:", dauSach.toJSON());

    await db.sequelize.transaction(async (t) => {
      // Update basic fields
      if (TenSach) dauSach.TenSach = TenSach;
      if (typeof MoTa !== "undefined") dauSach.MoTa = MoTa;

      // Resolve TenTheLoai to MaTheLoai
      if (TenTheLoai) {
        let resolvedCategory = await timMaTheLoai(TenTheLoai, {
          transaction: t,
        });
        if (!resolvedCategory) {
          // Create new category if not exists
          resolvedCategory = await generateNewMaTheLoai();
          console.log(
            "[updateDauSach] Creating new category:",
            resolvedCategory,
            TenTheLoai
          );
          await db.TheLoai.create(
            { MaTheLoai: resolvedCategory, TenTheLoai },
            { transaction: t }
          );
        }
        dauSach.MaTheLoai = resolvedCategory;
      }

      console.log("[updateDauSach] Saving dauSach with:", {
        TenSach: dauSach.TenSach,
        MaTheLoai: dauSach.MaTheLoai,
        MoTa: dauSach.MoTa,
      });
      await dauSach.save({ transaction: t });

      // Update authors if provided
      if (Array.isArray(tacGiaIds)) {
        console.log("[updateDauSach] Deleting old author relations for:", maDS);
        await db.CT_TacGia.destroy({
          where: { MaDauSach: maDS },
          transaction: t,
        });

        const maTacGiaSet = new Set();
        for (const item of tacGiaIds) {
          if (!item) continue;
          let maTacGia = null;

          if (typeof item === "string" && /^TG\d+$/i.test(item)) {
            const found = await db.TacGia.findByPk(item, {
              transaction: t,
              raw: true,
            });
            if (found) maTacGia = found.MaTacGia;
          }

          if (!maTacGia && typeof item === "string") {
            const foundByName = await db.TacGia.findOne({
              where: { HoTen: item },
              attributes: ["MaTacGia"],
              transaction: t,
              raw: true,
            });
            if (foundByName) {
              maTacGia = foundByName.MaTacGia;
            } else {
              const newMaTG = await generateNewMaTacGia();
              console.log(
                "[updateDauSach] Creating new author:",
                newMaTG,
                item
              );
              await db.TacGia.create(
                { MaTacGia: newMaTG, HoTen: item, NamSinh: null },
                { transaction: t }
              );
              maTacGia = newMaTG;
            }
          }

          if (maTacGia) maTacGiaSet.add(maTacGia);
        }

        const finalTacGiaIds = Array.from(maTacGiaSet);
        console.log("[updateDauSach] Final author IDs:", finalTacGiaIds);
        if (finalTacGiaIds.length > 0) {
          await db.CT_TacGia.bulkCreate(
            finalTacGiaIds.map((id) => ({ MaDauSach: maDS, MaTacGia: id })),
            { transaction: t }
          );
          console.log("[updateDauSach] Created author relations");
        }
      }
    });

    console.log("[updateDauSach] Transaction committed successfully");

    // Fetch updated data to verify
    const updatedDauSach = await db.DauSach.findByPk(maDS, { raw: true });
    console.log("[updateDauSach] Updated data in DB:", updatedDauSach);

    return res
      .status(200)
      .json({ message: "Cập nhật đầu sách thành công!", dauSach });
  } catch (err) {
    console.error("[bookController] updateDauSach error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ: " + err.message });
  }
};

const deleteDauSach = async (req, res) => {
  try {
    const maDS = req.params.maDS;
    const dauSach = await db.DauSach.findByPk(maDS);
    if (!dauSach) {
      return res.status(404).json({ error: "Không tìm thấy Đầu sách" });
    }

    // Kiểm tra nếu đầu sách đã bị xóa rồi
    if (dauSach.isDeleted) {
      return res.status(400).json({ error: "Đầu sách này đã bị xóa trước đó." });
    }

    // Kiểm tra xem có bản sách nào liên kết với đầu sách này không (chỉ tính sách chưa xóa)
    const sachLienKet = await db.Sach.findOne({
      where: { MaDauSach: maDS, isDeleted: false },
    });

    if (sachLienKet) {
      return res.status(400).json({
        error: `Không thể xóa đầu sách "${
          dauSach.TenSach
        }". Vẫn còn ${await db.Sach.count({
          where: { MaDauSach: maDS, isDeleted: false },
        })} bản sách liên kết với đầu sách này. Vui lòng xóa các bản sách trước.`,
      });
    }

    // Soft delete: đánh dấu isDeleted = true thay vì xóa thật
    dauSach.isDeleted = true;
    await dauSach.save();

    return res.status(200).json({ message: "Xóa đầu sách thành công!" });
  } catch (err) {
    console.error("[bookController] deleteDauSach error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =====================================================
// API: Sach (bản sách cụ thể)
// =====================================================
const getAllSach = async (req, res) => {
  try {
    const sachList = await db.Sach.findAll({ 
      where: { isDeleted: false },
      raw: true 
    });
    return res.status(200).json(sachList);
  } catch (err) {
    console.error("[bookController] getAllSach error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const createSach = async (req, res) => {
  try {
    const { MaDauSach, NhaXB, NamXB, MoTa } = req.body;

    if (!MaDauSach) {
      return res.status(400).json({ error: "Vui lòng chọn Đầu sách" });
    }

    // KIỂM TRA RÀNG BUỘC KHÓA NGOẠI: Đầu sách phải tồn tại
    const dauSach = await db.DauSach.findByPk(MaDauSach);
    if (!dauSach) {
      return res.status(404).json({
        error: `Đầu sách với mã "${MaDauSach}" không tồn tại trong hệ thống`,
      });
    }

    const newMaSach = await generateNewSachId();
    const parsedNamXB = NamXB ? parseInt(NamXB, 10) : null;
    const currentYear = new Date().getFullYear();

    // Validate NamXB
    if (
      parsedNamXB !== null &&
      (Number.isNaN(parsedNamXB) ||
        parsedNamXB < 1800 ||
        parsedNamXB > currentYear)
    ) {
      return res
        .status(400)
        .json({ error: `Năm xuất bản không hợp lệ (1800-${currentYear})` });
    }
    const normalizedNamXB = parsedNamXB;

    // KIỂM TRA TRÙNG LẶP: Sách có cùng đầu sách, NXB và năm XB
    const existingSach = await db.Sach.findOne({
      where: {
        MaDauSach: MaDauSach,
        NhaXB: NhaXB || null,
        NamXB: normalizedNamXB,
      },
    });

    if (existingSach) {
      const tenSach = dauSach.TenSach || "";
      return res.status(409).json({
        error: `Sách "${tenSach}" (NXB: ${NhaXB || "không xác định"}, Năm: ${
          normalizedNamXB || "không xác định"
        }) đã tồn tại với mã ${existingSach.MaSach}`,
      });
    }

    // Số lượng tồn ban đầu là 0, sẽ được cập nhật khi có phiếu nhập
    const newSach = await db.Sach.create({
      MaSach: newMaSach,
      MaDauSach,
      NhaXB: NhaXB || null,
      NamXB: normalizedNamXB,
      MoTa: MoTa || null,
      SoLuongTon: 0, // Luôn bắt đầu từ 0, sẽ tự động tính khi có phiếu nhập
    });

    return res
      .status(201)
      .json({ message: "Tạo sách thành công!", sach: newSach });
  } catch (err) {
    console.error("[bookController] createSach error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const updateSach = async (req, res) => {
  try {
    const maSach = req.params.maSach;
    const { NhaXB, NamXB, MoTa, SoLuongTon } = req.body;

    const sach = await db.Sach.findByPk(maSach);
    if (!sach) {
      return res.status(404).json({ error: "Không tìm thấy Sách" });
    }

    if (typeof NhaXB !== "undefined") sach.NhaXB = NhaXB;
    if (typeof MoTa !== "undefined") sach.MoTa = MoTa;
    if (typeof NamXB !== "undefined") {
      const parsedNamXB = parseInt(NamXB, 10);
      const currentYear = new Date().getFullYear();

      if (
        !Number.isNaN(parsedNamXB) &&
        (parsedNamXB < 1800 || parsedNamXB > currentYear)
      ) {
        return res
          .status(400)
          .json({ error: `Năm xuất bản không hợp lệ (1800-${currentYear})` });
      }
      sach.NamXB = Number.isNaN(parsedNamXB) ? sach.NamXB : parsedNamXB;
    }
    // KHÔNG CHO PHÉP CẬP NHẬT SoLuongTon - sẽ tự động tính từ phiếu nhập và hóa đơn
    // Số lượng tồn được tính tự động: Tổng nhập - Tổng bán

    await sach.save();
    return res.status(200).json({ message: "Cập nhật sách thành công!", sach });
  } catch (err) {
    console.error("[bookController] updateSach error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const getSachById = async (req, res) => {
  try {
    const maSach = req.params.maSach;
    console.log("[bookController] getSachById called with maSach:", maSach);

    const sach = await db.Sach.findByPk(maSach, {
      include: [
        {
          model: db.DauSach,
          attributes: ["TenSach", "MaTheLoai"],
          include: [
            {
              model: db.TheLoai,
              attributes: ["TenTheLoai"],
              required: false,
            },
          ],
          required: false,
        },
      ],
      raw: false,
    });

    console.log(
      "[bookController] Found sach:",
      sach ? sach.MaSach : "NOT FOUND"
    );

    if (!sach) {
      console.log("[bookController] Sach not found, returning 404");
      return res.status(404).json({ error: "Không tìm thấy sách" });
    }

    // Lấy SoLuongTon từ DB (đã được maintain bởi import/bill operations)
    console.log(`[bookController] SoLuongTon từ DB: ${sach.SoLuongTon}`);

    const result = {
      MaSach: sach.MaSach,
      TenSach: sach.DauSach ? sach.DauSach.TenSach : "",
      NhaXB: sach.NhaXB || "",
      NamXB: sach.NamXB || "",
      SoLuongTon: sach.SoLuongTon || 0,
      DonGia: 0, // Giá nhập mặc định
      DonGiaBan: 0, // Giá bán mặc định
    };

    console.log("[bookController] Returning result:", result);
    return res.status(200).json({ sach: result });
  } catch (err) {
    console.error("[bookController] getSachById error:", err.message);
    console.error("[bookController] Stack:", err.stack);
    return res.status(500).json({ error: "Lỗi server nội bộ: " + err.message });
  }
};

const deleteSach = async (req, res) => {
  try {
    const maSach = req.params.maSach;
    const sach = await db.Sach.findByPk(maSach);
    if (!sach) {
      return res.status(404).json({ error: "Không tìm thấy Sách" });
    }

    // Kiểm tra nếu sách đã bị xóa rồi
    if (sach.isDeleted) {
      return res.status(400).json({ error: "Sách này đã bị xóa trước đó." });
    }

    // Soft delete: đánh dấu isDeleted = true thay vì xóa thật
    sach.isDeleted = true;
    await sach.save();
    
    return res.status(200).json({ message: "Xóa sách thành công!" });
  } catch (err) {
    console.error("[bookController] deleteSach error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// ======== THỂ LOẠI (TheLoai) ========
const createTheLoai = async (req, res) => {
  try {
    const { TenTheLoai, MoTa } = req.body;
    console.log("[bookController] createTheLoai called with body:", req.body);

    if (!TenTheLoai || TenTheLoai.trim() === "") {
      return res.status(400).json({ error: "Vui lòng nhập tên thể loại" });
    }

    // Check if already exists
    const exists = await db.TheLoai.findOne({
      where: { TenTheLoai: TenTheLoai.trim() },
    });
    if (exists) {
      return res.status(400).json({ error: "Thể loại này đã tồn tại" });
    }

    const newMaTheLoai = await generateNewMaTheLoai();
    const newTheLoai = await db.TheLoai.create({
      MaTheLoai: newMaTheLoai,
      TenTheLoai: TenTheLoai.trim(),
      MoTa: MoTa ? MoTa.trim() : null,
    });

    return res.status(201).json({
      message: "Thêm thể loại thành công!",
      data: newTheLoai,
    });
  } catch (err) {
    console.error("[bookController] createTheLoai error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const updateTheLoai = async (req, res) => {
  try {
    const maTheLoai = req.params.maTheLoai;
    const { TenTheLoai, MoTa } = req.body;
    console.log(
      `[bookController] updateTheLoai called for ${maTheLoai} with body:`,
      req.body
    );

    if (!TenTheLoai || TenTheLoai.trim() === "") {
      return res.status(400).json({ error: "Vui lòng nhập tên thể loại" });
    }

    const theLoai = await db.TheLoai.findByPk(maTheLoai);
    if (!theLoai) {
      return res.status(404).json({ error: "Không tìm thấy thể loại" });
    }

    // Check duplicate name (exclude current record)
    const duplicate = await db.TheLoai.findOne({
      where: {
        TenTheLoai: TenTheLoai.trim(),
        MaTheLoai: { [Op.ne]: maTheLoai },
      },
    });
    if (duplicate) {
      return res.status(400).json({ error: "Tên thể loại này đã tồn tại" });
    }

    theLoai.TenTheLoai = TenTheLoai.trim();
    theLoai.MoTa = MoTa ? MoTa.trim() : null;
    await theLoai.save();

    return res.status(200).json({
      message: "Cập nhật thể loại thành công!",
      data: theLoai,
    });
  } catch (err) {
    console.error("[bookController] updateTheLoai error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const deleteTheLoai = async (req, res) => {
  try {
    const maTheLoai = req.params.maTheLoai;
    const theLoai = await db.TheLoai.findByPk(maTheLoai);
    if (!theLoai) {
      return res.status(404).json({ error: "Không tìm thấy thể loại" });
    }

    // Kiểm tra nếu thể loại đã bị xóa rồi
    if (theLoai.isDeleted) {
      return res.status(400).json({ error: "Thể loại này đã bị xóa trước đó." });
    }

    // Check if category is used in DauSach (chỉ tính đầu sách chưa xóa)
    const usedInDauSach = await db.DauSach.findOne({
      where: { MaTheLoai: maTheLoai, isDeleted: false },
    });
    if (usedInDauSach) {
      return res.status(400).json({
        error: "Không thể xóa thể loại đang được sử dụng trong Đầu sách",
      });
    }

    // Soft delete: đánh dấu isDeleted = true thay vì xóa thật
    theLoai.isDeleted = true;
    await theLoai.save();
    
    return res.status(200).json({ message: "Xóa thể loại thành công!" });
  } catch (err) {
    console.error("[bookController] deleteTheLoai error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// ======== TÁC GIẢ (TacGia) ========
const createTacGia = async (req, res) => {
  try {
    const { HoTen, NamSinh } = req.body;
    console.log("[bookController] createTacGia called with body:", req.body);

    if (!HoTen || HoTen.trim() === "") {
      return res.status(400).json({ error: "Vui lòng nhập họ tên tác giả" });
    }

    // Check if already exists
    const exists = await db.TacGia.findOne({
      where: { HoTen: HoTen.trim() },
    });
    if (exists) {
      return res.status(400).json({ error: "Tác giả này đã tồn tại" });
    }

    // Validate NamSinh if provided
    const namSinhInt = NamSinh ? parseInt(NamSinh, 10) : null;
    const currentYear = new Date().getFullYear();

    if (
      namSinhInt !== null &&
      (isNaN(namSinhInt) || namSinhInt < 1800 || namSinhInt > currentYear)
    ) {
      return res
        .status(400)
        .json({ error: `Năm sinh không hợp lệ (1800-${currentYear})` });
    }

    const newMaTacGia = await generateNewMaTacGia();
    const newTacGia = await db.TacGia.create({
      MaTacGia: newMaTacGia,
      HoTen: HoTen.trim(),
      NamSinh: namSinhInt,
    });

    return res.status(201).json({
      message: "Thêm tác giả thành công!",
      data: newTacGia,
    });
  } catch (err) {
    console.error("[bookController] createTacGia error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const updateTacGia = async (req, res) => {
  try {
    const maTacGia = req.params.maTacGia;
    const { HoTen, NamSinh } = req.body;
    console.log(
      `[bookController] updateTacGia called for ${maTacGia} with body:`,
      req.body
    );

    if (!HoTen || HoTen.trim() === "") {
      return res.status(400).json({ error: "Vui lòng nhập họ tên tác giả" });
    }

    const tacGia = await db.TacGia.findByPk(maTacGia);
    if (!tacGia) {
      return res.status(404).json({ error: "Không tìm thấy tác giả" });
    }

    // Check duplicate name (exclude current record)
    const duplicate = await db.TacGia.findOne({
      where: {
        HoTen: HoTen.trim(),
        MaTacGia: { [Op.ne]: maTacGia },
      },
    });
    if (duplicate) {
      return res.status(400).json({ error: "Tác giả này đã tồn tại" });
    }

    // Validate NamSinh if provided
    const namSinhInt = NamSinh ? parseInt(NamSinh, 10) : null;
    const currentYear = new Date().getFullYear();

    if (
      namSinhInt !== null &&
      (isNaN(namSinhInt) || namSinhInt < 1800 || namSinhInt > currentYear)
    ) {
      return res
        .status(400)
        .json({ error: `Năm sinh không hợp lệ (1800-${currentYear})` });
    }

    tacGia.HoTen = HoTen.trim();
    tacGia.NamSinh = namSinhInt;
    await tacGia.save();

    return res.status(200).json({
      message: "Cập nhật tác giả thành công!",
      data: tacGia,
    });
  } catch (err) {
    console.error("[bookController] updateTacGia error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

const deleteTacGia = async (req, res) => {
  try {
    const maTacGia = req.params.maTacGia;
    const tacGia = await db.TacGia.findByPk(maTacGia);
    if (!tacGia) {
      return res.status(404).json({ error: "Không tìm thấy tác giả" });
    }

    // Kiểm tra nếu tác giả đã bị xóa rồi
    if (tacGia.isDeleted) {
      return res.status(400).json({ error: "Tác giả này đã bị xóa trước đó." });
    }

    // Check if author is used in CT_TacGia (liên kết với đầu sách chưa xóa)
    const usedInCT = await db.CT_TacGia.findOne({
      where: { MaTacGia: maTacGia },
      include: [{
        model: db.DauSach,
        where: { isDeleted: false },
        required: true,
      }],
    });
    if (usedInCT) {
      return res.status(400).json({
        error: "Không thể xóa tác giả đang được sử dụng trong Đầu sách",
      });
    }

    // Soft delete: đánh dấu isDeleted = true thay vì xóa thật
    tacGia.isDeleted = true;
    await tacGia.save();
    
    return res.status(200).json({ message: "Xóa tác giả thành công!" });
  } catch (err) {
    console.error("[bookController] deleteTacGia error", err);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

module.exports = {
  getBooksPage,
  // DauSach
  getAllDauSach,
  getDauSachById,
  createDauSach,
  updateDauSach,
  deleteDauSach,
  // Sach
  getAllSach,
  getSachById,
  createSach,
  updateSach,
  deleteSach,
  // TheLoai
  createTheLoai,
  updateTheLoai,
  deleteTheLoai,
  // TacGia
  createTacGia,
  updateTacGia,
  deleteTacGia,
};
