/**
 * Middleware kiểm tra quyền động
 * Sử dụng: checkPermission('quyen1', 'quyen2') - user cần có ít nhất 1 quyền
 */
const { NhanVien, VaiTro, Quyen } = require('../models');

/**
 * Lấy danh sách quyền của user từ database
 * @param {string} maNV - Mã nhân viên
 * @returns {Promise<string[]>} Danh sách mã quyền
 */
async function getUserPermissions(maNV) {
  try {
    const user = await NhanVien.findByPk(maNV, {
      include: [{
        model: VaiTro,
        include: [{
          model: Quyen,
          through: { attributes: [] } // Không lấy attributes của bảng trung gian
        }]
      }]
    });

    if (!user || !user.VaiTro) {
      return [];
    }

    // Trả về mảng các mã quyền
    return user.VaiTro.Quyens?.map(q => q.MaQuyen) || [];
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Middleware kiểm tra quyền
 * @param  {...string} requiredPermissions - Các quyền yêu cầu (cần ít nhất 1)
 */
function checkPermission(...requiredPermissions) {
  return async (req, res, next) => {
    try {
      console.log('[Permission] Checking permissions for:', req.path);
      console.log('[Permission] User:', req.user);
      
      // JWT payload dùng 'id' thay vì 'MaNV'
      const maNV = req.user?.id || req.user?.MaNV;
      
      if (!maNV) {
        console.log('[Permission] No user id found, redirecting to login');
        // Nếu là request AJAX/API
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(401).json({ 
            success: false, 
            message: 'Bạn chưa đăng nhập' 
          });
        }
        // Nếu là request từ browser
        return res.redirect('/login');
      }

      const userPermissions = await getUserPermissions(maNV);
      console.log('[Permission] User permissions:', userPermissions);
      
      // Nếu user có quyền 'admin.full' thì cho phép tất cả
      if (userPermissions.includes('admin.full')) {
        console.log('[Permission] User has admin.full, allowing access');

        req.userPermissions = userPermissions;
        return next();
      }

      // Kiểm tra có ít nhất 1 quyền trong danh sách yêu cầu
      const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));
      
      if (!hasPermission) {
        // Nếu là request AJAX/API
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(403).json({ 
            success: false, 
            message: 'Bạn không có quyền thực hiện thao tác này' 
          });
        }
        // Nếu là request từ browser - render trang lỗi 403
        return res.status(403).render('error', {
          title: 'Không có quyền truy cập',
          message: 'Bạn không có quyền truy cập trang này',
          error: { status: 403 }
        });
      }

      // Đính kèm quyền vào request để sử dụng sau nếu cần
      req.userPermissions = userPermissions;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi kiểm tra quyền' 
      });
    }
  };
}

/**
 * Middleware kiểm tra tất cả các quyền (AND logic)
 * User phải có TẤT CẢ các quyền được yêu cầu
 */
function checkAllPermissions(...requiredPermissions) {
  return async (req, res, next) => {
    try {
      const maNV = req.user?.MaNV;
      
      if (!maNV) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập' });
        }
        return res.redirect('/login');
      }

      const userPermissions = await getUserPermissions(maNV);
      
      // Admin full có tất cả quyền
      if (userPermissions.includes('admin.full')) {
        req.userPermissions = userPermissions;
        return next();
      }

      // Kiểm tra có TẤT CẢ quyền
      const hasAllPermissions = requiredPermissions.every(p => userPermissions.includes(p));
      
      if (!hasAllPermissions) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(403).json({ success: false, message: 'Bạn không có đủ quyền thực hiện thao tác này' });
        }
        return res.status(403).render('error', {
          title: 'Không có quyền truy cập',
          message: 'Bạn không có đủ quyền truy cập',
          error: { status: 403 }
        });
      }

      req.userPermissions = userPermissions;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi kiểm tra quyền' });
    }
  };
}

/**
 * Middleware lấy quyền của user (không block, chỉ đính kèm vào req)
 * Sử dụng khi cần biết quyền để hiển thị UI động
 */
function attachPermissions() {
  return async (req, res, next) => {
    try {
      const maNV = req.user?.MaNV;
      if (maNV) {
        req.userPermissions = await getUserPermissions(maNV);
      } else {
        req.userPermissions = [];
      }
      next();
    } catch (error) {
      req.userPermissions = [];
      next();
    }
  };
}

module.exports = { 
  checkPermission, 
  checkAllPermissions,
  attachPermissions,
  getUserPermissions 
};
