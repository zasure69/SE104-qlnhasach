const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  
  // --- ĐỌC TOKEN TỪ COOKIE ---
  const token = req.cookies.authToken;

  // 2. Nếu không có token, trả về lỗi 401
  if (token == null) {
    // Tùy chọn: Nếu là yêu cầu từ trình duyệt, chuyển hướng về login
    return res.redirect('/login'); 
    
    // Hoặc trả về JSON (nếu là API)
    //return res.status(401).json({ error: 'Bạn chưa đăng nhập' });
  }

  // 3. Xác thực token
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    
    // 4. Nếu token sai hoặc hết hạn
    if (err) {
      // Tùy chọn: Chuyển hướng về login
      // res.clearCookie('authToken');
      // return res.redirect('/login');
      
      // Hoặc trả về JSON
      return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    // 5. Nếu token hợp lệ, lưu thông tin user vào req
    req.user = user; 
    
    // 6. Cho phép request đi tiếp
    next(); 
  });
};

module.exports = authenticateToken;