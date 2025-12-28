const db = require('./models');

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Connected to DB');
    
    // Update ChucVu
    await db.sequelize.query("UPDATE NHANVIEN SET ChucVu = 'Nhân viên' WHERE MaNhanVien = 'NV002'");
    await db.sequelize.query("UPDATE NHANVIEN SET ChucVu = 'Nhân viên' WHERE MaNhanVien = 'NV003'");
    console.log('Updated ChucVu for NV002 and NV003');
    
    // Check result
    const [results] = await db.sequelize.query("SELECT MaNhanVien, Username, ChucVu FROM NHANVIEN");
    console.log('All employees:', results);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
})();
