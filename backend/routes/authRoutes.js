const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// 管理员首次设置密码
router.post('/setup', async (req, res) => {
  try {
    const admin = await User.findOne({ where: { username: 'admin' } });
    
    if (!admin) {
      return res.status(404).json({ error: '管理员账户不存在' });
    }
    
    if (admin.password_hash) {
      return res.status(400).json({ error: '密码已设置' });
    }
    
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '请提供至少6位字符的密码' });
    }
    
    admin.password_hash = password;
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
    console.error(error);
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

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'role', 'created_at']
    });
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: '无效令牌' });
  }
});

module.exports = router;