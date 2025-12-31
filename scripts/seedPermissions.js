/**
 * Script seed dữ liệu quyền và vai trò mặc định
 * Chạy: node scripts/seedPermissions.js
 */
const {
  sequelize,
  Quyen,
  VaiTro,
  VaiTro_Quyen,
  NhanVien,
} = require("../models");

// Danh sách quyền mặc định
const defaultQuyens = [
  // Quyền đặc biệt
  {
    MaQuyen: "admin.full",
    TenQuyen: "Toàn quyền Admin",
    MoTa: "Có tất cả quyền trong hệ thống",
    NhomQuyen: "admin",
  },

  // Sách
  {
    MaQuyen: "sach.xem",
    TenQuyen: "Xem danh sách sách",
    MoTa: "Xem thông tin đầu sách, sách, thể loại, tác giả",
    NhomQuyen: "sach",
  },
  {
    MaQuyen: "sach.them",
    TenQuyen: "Thêm sách mới",
    MoTa: "Thêm đầu sách, sách, thể loại, tác giả mới",
    NhomQuyen: "sach",
  },
  {
    MaQuyen: "sach.sua",
    TenQuyen: "Sửa thông tin sách",
    MoTa: "Chỉnh sửa thông tin đầu sách, sách, thể loại, tác giả",
    NhomQuyen: "sach",
  },
  {
    MaQuyen: "sach.xoa",
    TenQuyen: "Xóa sách",
    MoTa: "Xóa đầu sách, sách, thể loại, tác giả khỏi hệ thống",
    NhomQuyen: "sach",
  },

  // Nhập sách
  {
    MaQuyen: "nhapsach.xem",
    TenQuyen: "Xem phiếu nhập",
    MoTa: "Xem danh sách phiếu nhập sách",
    NhomQuyen: "nhapsach",
  },
  {
    MaQuyen: "nhapsach.them",
    TenQuyen: "Tạo phiếu nhập",
    MoTa: "Tạo phiếu nhập sách mới",
    NhomQuyen: "nhapsach",
  },
  {
    MaQuyen: "nhapsach.sua",
    TenQuyen: "Sửa phiếu nhập",
    MoTa: "Chỉnh sửa phiếu nhập sách",
    NhomQuyen: "nhapsach",
  },
  {
    MaQuyen: "nhapsach.xoa",
    TenQuyen: "Xóa phiếu nhập",
    MoTa: "Xóa phiếu nhập sách",
    NhomQuyen: "nhapsach",
  },

  // Hóa đơn
  {
    MaQuyen: "hoadon.xem",
    TenQuyen: "Xem hóa đơn",
    MoTa: "Xem danh sách hóa đơn bán hàng",
    NhomQuyen: "hoadon",
  },
  {
    MaQuyen: "hoadon.them",
    TenQuyen: "Tạo hóa đơn",
    MoTa: "Tạo hóa đơn bán hàng mới",
    NhomQuyen: "hoadon",
  },
  {
    MaQuyen: "hoadon.sua",
    TenQuyen: "Sửa hóa đơn",
    MoTa: "Chỉnh sửa hóa đơn bán hàng",
    NhomQuyen: "hoadon",
  },
  {
    MaQuyen: "hoadon.xoa",
    TenQuyen: "Xóa hóa đơn",
    MoTa: "Xóa hóa đơn bán hàng",
    NhomQuyen: "hoadon",
  },

  // Phiếu thu
  {
    MaQuyen: "phieuthu.xem",
    TenQuyen: "Xem phiếu thu",
    MoTa: "Xem danh sách phiếu thu tiền",
    NhomQuyen: "phieuthu",
  },
  {
    MaQuyen: "phieuthu.them",
    TenQuyen: "Tạo phiếu thu",
    MoTa: "Tạo phiếu thu tiền mới",
    NhomQuyen: "phieuthu",
  },
  {
    MaQuyen: "phieuthu.xoa",
    TenQuyen: "Xóa phiếu thu",
    MoTa: "Xóa phiếu thu tiền",
    NhomQuyen: "phieuthu",
  },

  // Khách hàng
  {
    MaQuyen: "khachhang.xem",
    TenQuyen: "Xem khách hàng",
    MoTa: "Xem danh sách khách hàng",
    NhomQuyen: "khachhang",
  },
  {
    MaQuyen: "khachhang.them",
    TenQuyen: "Thêm khách hàng",
    MoTa: "Thêm khách hàng mới",
    NhomQuyen: "khachhang",
  },
  {
    MaQuyen: "khachhang.sua",
    TenQuyen: "Sửa khách hàng",
    MoTa: "Chỉnh sửa thông tin khách hàng",
    NhomQuyen: "khachhang",
  },
  {
    MaQuyen: "khachhang.xoa",
    TenQuyen: "Xóa khách hàng",
    MoTa: "Xóa khách hàng",
    NhomQuyen: "khachhang",
  },

  // Nhân viên
  {
    MaQuyen: "nhanvien.xem",
    TenQuyen: "Xem nhân viên",
    MoTa: "Xem danh sách nhân viên",
    NhomQuyen: "nhanvien",
  },
  {
    MaQuyen: "nhanvien.them",
    TenQuyen: "Thêm nhân viên",
    MoTa: "Thêm nhân viên mới",
    NhomQuyen: "nhanvien",
  },
  {
    MaQuyen: "nhanvien.sua",
    TenQuyen: "Sửa nhân viên",
    MoTa: "Chỉnh sửa thông tin nhân viên",
    NhomQuyen: "nhanvien",
  },
  {
    MaQuyen: "nhanvien.xoa",
    TenQuyen: "Xóa nhân viên",
    MoTa: "Xóa nhân viên",
    NhomQuyen: "nhanvien",
  },

  // Kiểm kê
  {
    MaQuyen: "kiemke.xem",
    TenQuyen: "Xem phiếu kiểm kê",
    MoTa: "Xem danh sách phiếu kiểm kê",
    NhomQuyen: "kiemke",
  },
  {
    MaQuyen: "kiemke.them",
    TenQuyen: "Tạo phiếu kiểm kê",
    MoTa: "Tạo phiếu kiểm kê mới",
    NhomQuyen: "kiemke",
  },
  {
    MaQuyen: "kiemke.xoa",
    TenQuyen: "Xóa phiếu kiểm kê",
    MoTa: "Xóa phiếu kiểm kê",
    NhomQuyen: "kiemke",
  },

  // Báo cáo
  {
    MaQuyen: "baocao.ton",
    TenQuyen: "Xem báo cáo tồn kho",
    MoTa: "Xem báo cáo tồn kho sách",
    NhomQuyen: "baocao",
  },
  {
    MaQuyen: "baocao.congno",
    TenQuyen: "Xem báo cáo công nợ",
    MoTa: "Xem báo cáo công nợ khách hàng",
    NhomQuyen: "baocao",
  },
  {
    MaQuyen: "baocao.doanhthu",
    TenQuyen: "Xem báo cáo doanh thu",
    MoTa: "Xem báo cáo doanh thu theo thể loại",
    NhomQuyen: "baocao",
  },

  // Cài đặt
  {
    MaQuyen: "caidat.thamso",
    TenQuyen: "Chỉnh sửa quy định",
    MoTa: "Chỉnh sửa tham số quy định",
    NhomQuyen: "caidat",
  },
  {
    MaQuyen: "caidat.phanquyen",
    TenQuyen: "Quản lý phân quyền",
    MoTa: "Quản lý vai trò và phân quyền",
    NhomQuyen: "caidat",
  },
  {
    MaQuyen: "caidat.thungrac",
    TenQuyen: "Truy cập thùng rác",
    MoTa: "Xem và khôi phục dữ liệu đã xóa",
    NhomQuyen: "caidat",
  },
];

// Vai trò mặc định và quyền đi kèm
const defaultVaiTros = [
  {
    TenVaiTro: "Admin",
    MoTa: "Quản trị viên - Toàn quyền hệ thống",
    Quyens: ["admin.full"],
  },
  {
    TenVaiTro: "Chủ cửa hàng",
    MoTa: "Chủ cửa hàng - Có hầu hết các quyền trừ phân quyền",
    Quyens: [
      "sach.xem",
      "sach.them",
      "sach.sua",
      "sach.xoa",
      "nhapsach.xem",
      "nhapsach.them",
      "nhapsach.sua",
      "nhapsach.xoa",
      "hoadon.xem",
      "hoadon.them",
      "hoadon.sua",
      "hoadon.xoa",
      "phieuthu.xem",
      "phieuthu.them",
      "phieuthu.xoa",
      "khachhang.xem",
      "khachhang.them",
      "khachhang.sua",
      "khachhang.xoa",
      "nhanvien.xem",
      "nhanvien.them",
      "nhanvien.sua",
      "nhanvien.xoa",
      "kiemke.xem",
      "kiemke.them",
      "kiemke.xoa",
      "baocao.ton",
      "baocao.congno",
      "baocao.doanhthu",
      "caidat.thamso",
      "caidat.thungrac",
    ],
  },
  {
    TenVaiTro: "Nhân viên",
    MoTa: "Nhân viên bán hàng - Bán hàng, thu tiền và quản lý khách hàng",
    Quyens: [
      "sach.xem",
      "hoadon.xem",
      "hoadon.them",
      "phieuthu.xem",
      "phieuthu.them",
      "khachhang.xem",
      "khachhang.them",
      "khachhang.sua",
      "baocao.congno",
    ],
  },
  {
    TenVaiTro: "Thủ kho",
    MoTa: "Thủ kho - Quản lý kho, nhập sách và kiểm kê",
    Quyens: [
      "sach.xem",
      "sach.them",
      "sach.sua",
      "nhapsach.xem",
      "nhapsach.them",
      "nhapsach.sua",
      "kiemke.xem",
      "kiemke.them",
      "baocao.ton",
    ],
  },
];

async function seedPermissions() {
  const t = await sequelize.transaction();

  try {
    console.log("🚀 Bắt đầu seed dữ liệu phân quyền...\n");

    // 1. Tạo bảng nếu chưa có
    await Quyen.sync({ alter: true });
    await VaiTro.sync({ alter: true });
    await VaiTro_Quyen.sync({ alter: true });

    // Thêm cột MaVaiTro vào bảng NhanVien nếu chưa có
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'NHANVIEN' AND COLUMN_NAME = 'MaVaiTro'
    `);

    if (results.length === 0) {
      await sequelize.query(`
        ALTER TABLE NHANVIEN ADD MaVaiTro INT NULL
      `);
      console.log("✅ Đã thêm cột MaVaiTro vào bảng NHANVIEN");
    }

    // 2. Seed Quyền
    console.log("📝 Đang seed quyền...");
    for (const quyen of defaultQuyens) {
      await Quyen.upsert(quyen, { transaction: t });
    }
    console.log(`✅ Đã seed ${defaultQuyens.length} quyền\n`);

    // 3. Seed Vai trò và gán quyền
    console.log("📝 Đang seed vai trò...");
    for (const vaiTroData of defaultVaiTros) {
      // Tạo hoặc cập nhật vai trò
      let [vaiTro, created] = await VaiTro.findOrCreate({
        where: { TenVaiTro: vaiTroData.TenVaiTro },
        defaults: {
          MoTa: vaiTroData.MoTa,
          isActive: true,
        },
        transaction: t,
      });

      if (!created) {
        await vaiTro.update({ MoTa: vaiTroData.MoTa }, { transaction: t });
      }

      // Xóa quyền cũ và gán quyền mới
      await VaiTro_Quyen.destroy({
        where: { MaVaiTro: vaiTro.MaVaiTro },
        transaction: t,
      });

      const vaiTroQuyens = vaiTroData.Quyens.map((maQuyen) => ({
        MaVaiTro: vaiTro.MaVaiTro,
        MaQuyen: maQuyen,
      }));
      await VaiTro_Quyen.bulkCreate(vaiTroQuyens, {
        transaction: t,
        ignoreDuplicates: true,
      });

      console.log(
        `  ✓ ${vaiTroData.TenVaiTro}: ${vaiTroData.Quyens.length} quyền`
      );
    }
    console.log(`✅ Đã seed ${defaultVaiTros.length} vai trò\n`);

    // 4. Gán vai trò Admin cho tài khoản admin hiện có (nếu có)
    const adminVaiTro = await VaiTro.findOne({
      where: { TenVaiTro: "Admin" },
      transaction: t,
    });

    if (adminVaiTro) {
      const adminUsers = await NhanVien.findAll({
        where: { ChucVu: "Admin" },
        transaction: t,
      });

      for (const admin of adminUsers) {
        if (!admin.MaVaiTro) {
          await admin.update(
            { MaVaiTro: adminVaiTro.MaVaiTro },
            { transaction: t }
          );
          console.log(`✅ Đã gán vai trò Admin cho: ${admin.HoTen}`);
        }
      }
    }

    await t.commit();
    console.log("\n🎉 Seed dữ liệu phân quyền hoàn tất!");
  } catch (error) {
    await t.rollback();
    console.error("❌ Lỗi khi seed dữ liệu:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Chạy nếu được gọi trực tiếp
if (require.main === module) {
  seedPermissions()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedPermissions, defaultQuyens, defaultVaiTros };
