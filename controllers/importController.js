const db = require("../models");

// Render trang quản lý phiếu nhập sách
const getImportPage = async (req, res) => {
  try {
    console.log("[importController] getImportPage called");
    const userInfo = { username: req.user?.username, role: req.user?.role };

    // Lấy danh sách phiếu nhập sách (nếu có)
    // const importReceipts = await db.PhieuNhapSach.findAll({ raw: true });

    res.render("books_import", {
      ...userInfo,
      // importReceipts: importReceipts || []
    });
  } catch (err) {
    console.error("[importController] Error:", err);
    res.status(500).send(`Lỗi Server: ${err.message}`);
  }
};

module.exports = {
  getImportPage,
};
