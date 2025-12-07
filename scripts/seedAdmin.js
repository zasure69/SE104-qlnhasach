const bcrypt = require("bcrypt");
const db = require("../models");
require("dotenv").config();

const DEFAULT_USERNAME = process.env.SEED_ADMIN_USERNAME || "admin";
const DEFAULT_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "123";

async function seedAdmin() {
  try {
    await db.sequelize.authenticate();

    const existingUser = await db.User.findOne({
      where: { Username: DEFAULT_USERNAME },
    });
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    if (existingUser) {
      await existingUser.update({
        Password: passwordHash,
        ChucVu: existingUser.ChucVu || "Admin",
      });
      console.log(`Updated password for user "${DEFAULT_USERNAME}".`);
    } else {
      // Simple helper to fabricate IDs if none exist
      const prefix = "NV";
      const paddingLength = 3;
      const lastUser = await db.User.findOne({
        order: [
          [
            db.sequelize.literal(
              `CAST(SUBSTRING(MaNhanVien, ${prefix.length + 1}) AS UNSIGNED)`
            ),
            "DESC",
          ],
        ],
        attributes: ["MaNhanVien"],
        raw: true,
      });

      const nextNumeric = lastUser
        ? parseInt(lastUser.MaNhanVien.substring(prefix.length), 10) + 1
        : 1;
      const newId = `${prefix}${String(nextNumeric).padStart(
        paddingLength,
        "0"
      )}`;

      await db.User.create({
        MaNhanVien: newId,
        HoTen: "Quản trị viên",
        NgaySinh: "1990-01-01",
        SoDienThoai: null,
        ChucVu: "Admin",
        Username: DEFAULT_USERNAME,
        Password: passwordHash,
        NgayNhanViec: new Date(),
      });
      console.log(`Created admin account "${DEFAULT_USERNAME}".`);
    }
  } catch (err) {
    console.error("Failed to seed admin user:", err);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

seedAdmin();
