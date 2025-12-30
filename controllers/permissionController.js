/**
 * Controller quản lý phân quyền
 */
const { VaiTro, Quyen, VaiTro_Quyen, NhanVien, sequelize } = require('../models');

// ========== QUẢN LÝ VAI TRÒ ==========

/**
 * Lấy danh sách tất cả vai trò
 */
const getAllVaiTro = async (req, res) => {
  try {
    const vaiTros = await VaiTro.findAll({
      include: [{
        model: Quyen,
        through: { attributes: [] }
      }],
      order: [['MaVaiTro', 'ASC']]
    });

    res.json({
      success: true,
      data: vaiTros
    });
  } catch (error) {
    console.error('Error getting vai tro:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách vai trò'
    });
  }
};

/**
 * Lấy thông tin chi tiết một vai trò
 */
const getVaiTroById = async (req, res) => {
  try {
    const { id } = req.params;
    const vaiTro = await VaiTro.findByPk(id, {
      include: [{
        model: Quyen,
        through: { attributes: [] }
      }]
    });

    if (!vaiTro) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vai trò'
      });
    }

    res.json({
      success: true,
      data: vaiTro
    });
  } catch (error) {
    console.error('Error getting vai tro:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin vai trò'
    });
  }
};

/**
 * Tạo vai trò mới
 */
const createVaiTro = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { TenVaiTro, MoTa, Quyens } = req.body;

    // Kiểm tra tên vai trò đã tồn tại chưa
    const existing = await VaiTro.findOne({ where: { TenVaiTro } });
    if (existing) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Tên vai trò đã tồn tại'
      });
    }

    // Tạo vai trò mới
    const vaiTro = await VaiTro.create({
      TenVaiTro,
      MoTa,
      isActive: true
    }, { transaction: t });

    // Gán quyền nếu có
    if (Quyens && Quyens.length > 0) {
      const vaiTroQuyens = Quyens.map(maQuyen => ({
        MaVaiTro: vaiTro.MaVaiTro,
        MaQuyen: maQuyen
      }));
      await VaiTro_Quyen.bulkCreate(vaiTroQuyens, { transaction: t });
    }

    await t.commit();

    // Lấy lại vai trò với quyền đã gán
    const result = await VaiTro.findByPk(vaiTro.MaVaiTro, {
      include: [{ model: Quyen, through: { attributes: [] } }]
    });

    res.status(201).json({
      success: true,
      message: 'Tạo vai trò thành công',
      data: result
    });
  } catch (error) {
    await t.rollback();
    console.error('Error creating vai tro:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo vai trò'
    });
  }
};

/**
 * Cập nhật vai trò
 */
const updateVaiTro = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { TenVaiTro, MoTa, isActive, Quyens } = req.body;

    const vaiTro = await VaiTro.findByPk(id);
    if (!vaiTro) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vai trò'
      });
    }

    // Kiểm tra tên trùng (nếu đổi tên)
    if (TenVaiTro && TenVaiTro !== vaiTro.TenVaiTro) {
      const existing = await VaiTro.findOne({ where: { TenVaiTro } });
      if (existing) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Tên vai trò đã tồn tại'
        });
      }
    }

    // Cập nhật thông tin vai trò
    await vaiTro.update({
      TenVaiTro: TenVaiTro || vaiTro.TenVaiTro,
      MoTa: MoTa !== undefined ? MoTa : vaiTro.MoTa,
      isActive: isActive !== undefined ? isActive : vaiTro.isActive
    }, { transaction: t });

    // Cập nhật quyền nếu có
    if (Quyens !== undefined) {
      // Xóa tất cả quyền cũ
      await VaiTro_Quyen.destroy({
        where: { MaVaiTro: id },
        transaction: t
      });

      // Thêm quyền mới
      if (Quyens.length > 0) {
        const vaiTroQuyens = Quyens.map(maQuyen => ({
          MaVaiTro: id,
          MaQuyen: maQuyen
        }));
        await VaiTro_Quyen.bulkCreate(vaiTroQuyens, { transaction: t });
      }
    }

    await t.commit();

    // Lấy lại vai trò với quyền mới
    const result = await VaiTro.findByPk(id, {
      include: [{ model: Quyen, through: { attributes: [] } }]
    });

    res.json({
      success: true,
      message: 'Cập nhật vai trò thành công',
      data: result
    });
  } catch (error) {
    await t.rollback();
    console.error('Error updating vai tro:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật vai trò'
    });
  }
};

/**
 * Xóa vai trò
 */
const deleteVaiTro = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const vaiTro = await VaiTro.findByPk(id);
    if (!vaiTro) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vai trò'
      });
    }

    // Kiểm tra có nhân viên nào đang dùng vai trò này không
    const usersWithRole = await NhanVien.count({ where: { MaVaiTro: id } });
    if (usersWithRole > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Không thể xóa vai trò đang được ${usersWithRole} nhân viên sử dụng`
      });
    }

    // Xóa liên kết vai trò - quyền
    await VaiTro_Quyen.destroy({
      where: { MaVaiTro: id },
      transaction: t
    });

    // Xóa vai trò
    await vaiTro.destroy({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: 'Xóa vai trò thành công'
    });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting vai tro:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa vai trò'
    });
  }
};

// ========== QUẢN LÝ QUYỀN ==========

/**
 * Lấy danh sách tất cả quyền (nhóm theo NhomQuyen)
 */
const getAllQuyen = async (req, res) => {
  try {
    const quyens = await Quyen.findAll({
      order: [['NhomQuyen', 'ASC'], ['MaQuyen', 'ASC']]
    });

    // Nhóm quyền theo NhomQuyen
    const grouped = {};
    quyens.forEach(q => {
      const nhom = q.NhomQuyen || 'other';
      if (!grouped[nhom]) {
        grouped[nhom] = [];
      }
      grouped[nhom].push(q);
    });

    res.json({
      success: true,
      data: quyens,
      grouped: grouped
    });
  } catch (error) {
    console.error('Error getting quyen:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách quyền'
    });
  }
};

// ========== GÁN VAI TRÒ CHO NHÂN VIÊN ==========

/**
 * Gán vai trò cho nhân viên
 */
const assignVaiTroToNhanVien = async (req, res) => {
  try {
    const { maNhanVien, maVaiTro } = req.body;

    const nhanVien = await NhanVien.findByPk(maNhanVien);
    if (!nhanVien) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên'
      });
    }

    // Kiểm tra vai trò tồn tại
    if (maVaiTro) {
      const vaiTro = await VaiTro.findByPk(maVaiTro);
      if (!vaiTro) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy vai trò'
        });
      }
    }

    // Cập nhật vai trò cho nhân viên
    await nhanVien.update({ MaVaiTro: maVaiTro || null });

    res.json({
      success: true,
      message: 'Gán vai trò thành công'
    });
  } catch (error) {
    console.error('Error assigning vai tro:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gán vai trò'
    });
  }
};

/**
 * Lấy danh sách nhân viên với vai trò
 */
const getNhanVienWithVaiTro = async (req, res) => {
  try {
    const nhanViens = await NhanVien.findAll({
      where: { isDeleted: false },
      include: [{
        model: VaiTro,
        required: false
      }],
      attributes: ['MaNhanVien', 'HoTen', 'ChucVu', 'MaVaiTro'],
      order: [['HoTen', 'ASC']]
    });

    res.json({
      success: true,
      data: nhanViens
    });
  } catch (error) {
    console.error('Error getting nhan vien:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách nhân viên'
    });
  }
};

// ========== RENDER TRANG QUẢN LÝ ==========

/**
 * Render trang quản lý phân quyền
 */
const renderPermissionPage = async (req, res) => {
  try {
    const vaiTros = await VaiTro.findAll({
      include: [{ model: Quyen, through: { attributes: [] } }],
      order: [['MaVaiTro', 'ASC']]
    });

    const quyens = await Quyen.findAll({
      order: [['NhomQuyen', 'ASC'], ['MaQuyen', 'ASC']]
    });

    // Nhóm quyền theo NhomQuyen
    const groupedQuyens = {};
    quyens.forEach(q => {
      const nhom = q.NhomQuyen || 'other';
      if (!groupedQuyens[nhom]) {
        groupedQuyens[nhom] = [];
      }
      groupedQuyens[nhom].push(q.toJSON());
    });

    const nhanViens = await NhanVien.findAll({
      where: { isDeleted: false },
      include: [{ model: VaiTro, required: false }],
      attributes: ['MaNhanVien', 'HoTen', 'ChucVu', 'MaVaiTro'],
      order: [['HoTen', 'ASC']]
    });

    res.render('permissions', {
      title: 'Quản lý phân quyền',
      vaiTros: vaiTros.map(v => v.toJSON()),
      quyens: quyens.map(q => q.toJSON()),
      groupedQuyens,
      nhanViens: nhanViens.map(n => n.toJSON()),
      username: req.user?.username,
      role: req.user?.role,
      MaNV: req.user?.id || req.user?.MaNV
    });
  } catch (error) {
    console.error('Error rendering permission page:', error);
    res.status(500).render('error', {
      title: 'Lỗi',
      message: 'Lỗi khi tải trang quản lý phân quyền',
      error: { status: 500 }
    });
  }
};

module.exports = {
  getAllVaiTro,
  getVaiTroById,
  createVaiTro,
  updateVaiTro,
  deleteVaiTro,
  getAllQuyen,
  assignVaiTroToNhanVien,
  getNhanVienWithVaiTro,
  renderPermissionPage
};
