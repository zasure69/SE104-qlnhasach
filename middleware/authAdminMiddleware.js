// middleware/adminAuthMiddleware.js

const authorizeAdmin = (req, res, next) => {
    // Middleware này phải chạy SAU authenticateToken,
    // nên chúng ta có thể truy cập req.user
    
    const userRole = req.user.role; // Lấy từ payload của token

    // Kiểm tra xem role có phải là "Quản trị viên" hoặc "Chủ nhà sách" không
    if (userRole === 'Admin' || userRole === 'Owner') {
        // Nếu đúng, cho phép đi tiếp
        next(); 
    } else {
        // Nếu là "Nhân viên" hoặc vai trò khác, cấm truy cập
        return res.status(403).json({ 
            error: 'Bạn không có quyền thực hiện chức năng này.' 
        });
    }
};

module.exports = authorizeAdmin;