const jwt = require('jsonwebtoken');
const { User } = require('../models'); // 确保从正确的路径导入

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        console.log('Auth Middleware: No token provided');
        return res.status(401).json({ error: '未提供认证令牌' }); // Unauthorized
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');

        // 可选：从数据库验证用户是否存在且状态正常
        const user = await User.findByPk(decoded.id, { attributes: ['id', 'username', 'role'] });
        if (!user) {
            console.log(`Auth Middleware: User not found for ID ${decoded.id}`);
            return res.status(401).json({ error: '用户不存在或令牌无效' });
        }

        // 将解码后的用户信息（包含角色）附加到请求对象
        req.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };
        console.log(`Auth Middleware: User ${user.username} authenticated with role ${user.role}`);
        next(); // 继续处理请求
    } catch (err) {
        console.error('Auth Middleware: Token verification failed:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: '令牌已过期' });
        }
        return res.status(403).json({ error: '令牌无效' }); // Forbidden
    }
};

// 可选：管理员权限检查中间件
const authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); // 用户是管理员，继续
    } else {
        console.log(`Auth Middleware: Admin authorization failed for user ${req.user?.username}`);
        res.status(403).json({ error: '需要管理员权限' }); // Forbidden
    }
};

module.exports = {
    authenticateToken,
    authorizeAdmin
};