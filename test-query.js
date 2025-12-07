const db = require("./models");

async function testQuery() {
  try {
    console.log("\n=== Checking CT_TacGia data ===");
    const allRelations = await db.CT_TacGia.findAll({ raw: true });
    console.log("All CT_TacGia records:", allRelations);

    console.log("\n=== Checking DauSach data ===");
    const allDauSach = await db.DauSach.findAll({ raw: true, limit: 5 });
    console.log("All DauSach records (first 5):", allDauSach);

    console.log("\n=== Testing query with associations ===");
    const dauSachs = await db.DauSach.findAll({
      include: [
        {
          model: db.TheLoai,
          attributes: ["TenTheLoai"],
        },
        {
          model: db.TacGia,
          as: "TacGias",
          through: { attributes: [] },
          attributes: ["MaTacGia", "HoTen"],
        },
      ],
      raw: false,
      limit: 5,
    });

    console.log("\n=== Query Result ===");
    dauSachs.forEach((ds) => {
      console.log(`\nDauSach ${ds.MaDauSach}:`);
      console.log("  TenSach:", ds.TenSach);
      console.log("  TheLoai:", ds.TheLoai ? ds.TheLoai.TenTheLoai : "NULL");
      console.log("  TacGias:", ds.TacGias);
      console.log("  TacGias count:", ds.TacGias ? ds.TacGias.length : 0);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testQuery();
