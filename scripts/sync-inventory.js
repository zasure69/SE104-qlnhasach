/**
 * Script để đồng bộ lại SoLuongTon trong database
 * Tính lại SoLuongTon = Tổng nhập (từ CT_PNS) - Tổng bán (từ CT_HD)
 *
 * Sử dụng: node scripts/sync-inventory.js
 */

const db = require("../models");

async function syncInventory() {
  try {
    console.log("=".repeat(60));
    console.log("BẮT ĐẦU ĐỒNG BỘ SỐ LƯỢNG TỒN KHO");
    console.log("=".repeat(60));

    // Lấy tất cả sách
    const allBooks = await db.Sach.findAll({ raw: true });
    console.log(`\nTìm thấy ${allBooks.length} cuốn sách cần kiểm tra\n`);

    let updatedCount = 0;
    let unchangedCount = 0;
    const updates = [];

    for (const book of allBooks) {
      // Tính số lượng tồn thực tế từ CT_PNS và CT_HD
      const tongNhap =
        (await db.CT_PNS.sum("SoLuong", {
          where: { MaSach: book.MaSach },
        })) || 0;

      const tongBan =
        (await db.CT_HD.sum("SoLuongBan", {
          where: { MaSach: book.MaSach },
        })) || 0;

      const soLuongTonThucTe = Math.max(0, tongNhap - tongBan);
      const soLuongTonHienTai = book.SoLuongTon || 0;

      // Kiểm tra xem có cần cập nhật không
      if (soLuongTonThucTe !== soLuongTonHienTai) {
        updates.push({
          MaSach: book.MaSach,
          TonCu: soLuongTonHienTai,
          TonMoi: soLuongTonThucTe,
          TongNhap: tongNhap,
          TongBan: tongBan,
        });

        // Cập nhật vào database
        await db.Sach.update(
          { SoLuongTon: soLuongTonThucTe },
          { where: { MaSach: book.MaSach } }
        );

        updatedCount++;
        console.log(
          `✓ ${book.MaSach}: ${soLuongTonHienTai} → ${soLuongTonThucTe} (Nhập: ${tongNhap}, Bán: ${tongBan})`
        );
      } else {
        unchangedCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("KẾT QUẢ ĐỒNG BỘ");
    console.log("=".repeat(60));
    console.log(`Tổng số sách:        ${allBooks.length}`);
    console.log(`Đã cập nhật:         ${updatedCount}`);
    console.log(`Không thay đổi:      ${unchangedCount}`);

    if (updates.length > 0) {
      console.log("\nCHI TIẾT CÁC THAY ĐỔI:");
      console.log("-".repeat(60));
      updates.forEach((u) => {
        console.log(
          `${u.MaSach}: ${u.TonCu} → ${u.TonMoi} (Chênh lệch: ${
            u.TonMoi - u.TonCu > 0 ? "+" : ""
          }${u.TonMoi - u.TonCu})`
        );
      });
    }

    console.log("\n✓ HOÀN TẤT ĐỒNG BỘ!\n");
  } catch (error) {
    console.error("\n✗ LỖI KHI ĐỒNG BỘ:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Chạy script
syncInventory()
  .then(() => {
    console.log("Script hoàn thành. Thoát...");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Lỗi không mong đợi:", err);
    process.exit(1);
  });
