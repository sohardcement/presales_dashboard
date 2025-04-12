const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { Op } = require('sequelize'); // 引入 Op 操作符

// 管理员首次设置密码
router.post('/setup', async (req, res) => {
  try {
    const admin = await User.findOne({ where: { username: 'admin' } });

    if (!admin) {
      return res.status(404).json({ error: '管理员账户不存在' });
    }

    // 检查密码是否已设置 (通过检查 password_hash 是否为空字符串)
    if (admin.password_hash !== '') {
       return res.status(400).json({ error: '密码已设置' });
    }

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '请提供至少6位字符的密码' });
    }

    admin.password_hash = password; // Sequelize hook 会自动哈希
    await admin.save();

    const token = admin.generateAuthToken();
    res.status(200).json({
      token,
      user: {
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: '密码至少需要6位' });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 创建新用户 (角色默认为 'user')
    const newUser = await User.create({
      username,
      password_hash: password // Sequelize hook 会自动哈希
    });

    res.status(201).json({ message: '用户注册成功', userId: newUser.id });

  } catch (error) {
    console.error('Register error:', error);
    // 处理可能的 Sequelize 验证错误
    if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
    }
    res.status(500).json({ error: '服务器错误' });
  }
});


// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findByCredentials(username, password);
    const token = user.generateAuthToken();
    res.json({
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// 获取当前用户信息 (需要认证)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // 如果没有token，返回401

    jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, user) => {
        if (err) return res.sendStatus(403); // 如果token无效或过期，返回403
        req.user = user; // 将解码后的用户信息附加到请求对象
        next(); // 继续处理请求
    });
};

router.get('/me', authenticateToken, async (req, res) => {
  try {
    // req.user 包含从 token 解码出的 { id, username, role }
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'role', 'created_at']
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;