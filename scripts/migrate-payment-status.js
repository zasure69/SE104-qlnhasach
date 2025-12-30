/**
 * Script migration: Thêm cột TrangThaiThanhToan, GhiChu, NgayCapNhat vào bảng HOADON
 *
 * Chạy: node scripts/migrate-payment-status.js
 */

const { Sequelize } = require("sequelize");
const sequelize = require("../config/db");

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  console.log(
    "🚀 Bắt đầu migration: Thêm trạng thái thanh toán vào HOADON...\n"
  );

  try {
    // 1. Kiểm tra và thêm cột TrangThaiThanhToan
    console.log("1️⃣ Kiểm tra cột TrangThaiThanhToan...");
    const columns = await queryInterface.describeTable("HOADON");

    if (!columns.TrangThaiThanhToan) {
      console.log("   → Đang thêm cột TrangThaiThanhToan...");
      await queryInterface.addColumn("HOADON", "TrangThaiThanhToan", {
        type: Sequelize.STRING(20),
        defaultValue: "HOAN_TAT",
        allowNull: false,
      });
      console.log("   ✅ Đã thêm cột TrangThaiThanhToan");
    } else {
      console.log("   ⏭️ Cột TrangThaiThanhToan đã tồn tại, bỏ qua.");
    }

    // 2. Kiểm tra và thêm cột GhiChu
    console.log("\n2️⃣ Kiểm tra cột GhiChu...");
    if (!columns.GhiChu) {
      console.log("   → Đang thêm cột GhiChu...");
      await queryInterface.addColumn("HOADON", "GhiChu", {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
      console.log("   ✅ Đã thêm cột GhiChu");
    } else {
      console.log("   ⏭️ Cột GhiChu đã tồn tại, bỏ qua.");
    }

    // 3. Kiểm tra và thêm cột NgayCapNhat
    console.log("\n3️⃣ Kiểm tra cột NgayCapNhat...");
    if (!columns.NgayCapNhat) {
      console.log("   → Đang thêm cột NgayCapNhat...");
      await queryInterface.addColumn("HOADON", "NgayCapNhat", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      console.log("   ✅ Đã thêm cột NgayCapNhat");
    } else {
      console.log("   ⏭️ Cột NgayCapNhat đã tồn tại, bỏ qua.");
    }

    // 4. Cập nhật trạng thái cho các hóa đơn hiện có
    console.log("\n4️⃣ Cập nhật trạng thái cho các hóa đơn hiện có...");

    // Cập nhật GHI_NO cho các hóa đơn còn nợ
    const [ghiNoResults] = await sequelize.query(`
      UPDATE HOADON 
      SET TrangThaiThanhToan = 'GHI_NO' 
      WHERE CAST(ConLai AS DECIMAL(18,2)) > 0 
        AND (TrangThaiThanhToan IS NULL OR TrangThaiThanhToan = '' OR TrangThaiThanhToan = 'HOAN_TAT')
    `);

    // Cập nhật HOAN_TAT cho các hóa đơn đã thanh toán đủ
    const [hoanTatResults] = await sequelize.query(`
      UPDATE HOADON 
      SET TrangThaiThanhToan = 'HOAN_TAT' 
      WHERE CAST(ConLai AS DECIMAL(18,2)) = 0 
        AND (TrangThaiThanhToan IS NULL OR TrangThaiThanhToan = '')
    `);

    console.log("   ✅ Đã cập nhật trạng thái cho các hóa đơn hiện có");

    // 5. Thống kê kết quả
    console.log("\n📊 Thống kê trạng thái hóa đơn:");
    const [stats] = await sequelize.query(`
      SELECT TrangThaiThanhToan, COUNT(*) as SoLuong 
      FROM HOADON 
      WHERE isDeleted = 0
      GROUP BY TrangThaiThanhToan
    `);

    stats.forEach((row) => {
      const statusLabel = {
        HOAN_TAT: "🟢 Hoàn tất",
        GHI_NO: "🟠 Ghi nợ",
        DA_HUY: "🔴 Đã hủy",
        DA_SUA: "🔵 Đã sửa",
      };
      console.log(
        `   ${statusLabel[row.TrangThaiThanhToan] || row.TrangThaiThanhToan}: ${
          row.SoLuong
        } hóa đơn`
      );
    });

    console.log("\n✅ Migration hoàn tất thành công!");
  } catch (error) {
    console.error("\n❌ Lỗi migration:", error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Chạy migration
migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
