const db = require('../models');
const bcrypt = require('bcrypt');

const resetAndSeedDatabase = async () => {
  console.log("\n--- Resetting and Seeding Database ---");
  try {
    // Disable foreign key checks to allow dropping tables in any order
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
    
    // Drop all tables
    await db.sequelize.drop();
    console.log("All tables dropped.");

    // Re-enable foreign key checks
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
    
    // Re-sync all models (creates tables based on model definitions)
    await db.sequelize.sync({ force: true });
    console.log("All tables re-synced.");

    // Seed essential ThamSo (System Parameters)
    await db.ThamSo.bulkCreate([
      { TenThamSo: 'SoLuongNhapToiThieu', GiaTri: 150, TinhTrang: 1 },
      { TenThamSo: 'SoLuongTonToiThieuSauKhiBan', GiaTri: 20, TinhTrang: 1 },
      { TenThamSo: 'SoTienNoToiDa', GiaTri: 20000, TinhTrang: 1 },
      { TenThamSo: 'DuocThuQuaSoTienNo', GiaTri: 0, TinhTrang: 1 } // 0 = false, 1 = true
    ], { ignoreDuplicates: true });
    console.log("System parameters seeded.");

    // Seed an Admin User
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.User.findOrCreate({
        where: { MaNhanVien: 'NV001' },
        defaults: {
            HoTen: 'Admin Test',
            NgaySinh: '1990-01-01',
            SoDienThoai: '0900000001',
            ChucVu: 'Admin',
            Username: 'admin_test',
            Password: hashedPassword,
            NgayNhanViec: '2023-01-01'
        }
    });
    console.log("Admin user seeded.");

    // Seed a regular employee user for non-admin tests
    const hashedPasswordStaff = await bcrypt.hash('staff123', 10);
    await db.User.findOrCreate({
        where: { MaNhanVien: 'NV002' },
        defaults: {
            HoTen: 'Staff Test',
            NgaySinh: '1995-05-05',
            SoDienThoai: '0900000002',
            ChucVu: 'NhanVien',
            Username: 'staff_test',
            Password: hashedPasswordStaff,
            NgayNhanViec: '2023-06-01'
        }
    });
    console.log("Staff user seeded.");

    console.log("--- Database Reset and Seed Complete ---\n");

  } catch (error) {
    console.error("Error during database reset and seed:", error);
    // Re-enable foreign key checks in case of error
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
    throw error;
  }
};

module.exports = resetAndSeedDatabase;
