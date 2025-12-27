// Script thêm cột isDeleted vào các bảng
const sequelize = require('../config/db');

async function addIsDeletedColumn() {
  try {
    console.log('🔄 Bắt đầu thêm cột isDeleted vào các bảng...\n');

    // Tất cả các bảng cần có isDeleted
    const tables = [
      'NHANVIEN',   // Nhân viên
      'KHACHHANG',  // Khách hàng
      'SACH',       // Sách
      'DAUSACH',    // Đầu sách
      'THELOAI',    // Thể loại
      'TACGIA',     // Tác giả
      'PHIEUNHAPSACH',  // Phiếu nhập
      'HOADON',     // Hóa đơn
      'PHIEUTHUTIEN'    // Phiếu thu
    ];

    for (const table of tables) {
      try {
        // Kiểm tra xem cột đã tồn tại chưa
        const [columns] = await sequelize.query(`SHOW COLUMNS FROM ${table} LIKE 'isDeleted'`);
        
        if (columns.length === 0) {
          // Thêm cột nếu chưa tồn tại
          await sequelize.query(`ALTER TABLE ${table} ADD COLUMN isDeleted BOOLEAN DEFAULT FALSE NOT NULL`);
          console.log(`✅ Đã thêm cột isDeleted vào bảng ${table}`);
        } else {
          console.log(`⏭️  Cột isDeleted đã tồn tại trong bảng ${table}`);
        }
      } catch (err) {
        console.error(`❌ Lỗi khi xử lý bảng ${table}:`, err.message);
      }
    }

    // Tạo index để tăng hiệu suất
    console.log('\n🔄 Tạo index cho cột isDeleted...\n');
    
    for (const table of tables) {
      try {
        const indexName = `idx_${table.toLowerCase()}_isdeleted`;
        // Kiểm tra index đã tồn tại chưa
        const [indexes] = await sequelize.query(`SHOW INDEX FROM ${table} WHERE Key_name = '${indexName}'`);
        
        if (indexes.length === 0) {
          await sequelize.query(`CREATE INDEX ${indexName} ON ${table}(isDeleted)`);
          console.log(`✅ Đã tạo index ${indexName}`);
        } else {
          console.log(`⏭️  Index ${indexName} đã tồn tại`);
        }
      } catch (err) {
        // Ignore nếu index đã tồn tại
        if (!err.message.includes('Duplicate')) {
          console.error(`❌ Lỗi khi tạo index cho ${table}:`, err.message);
        }
      }
    }

    console.log('\n🎉 Hoàn thành migration!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi migration:', err);
    process.exit(1);
  }
}

addIsDeletedColumn();
