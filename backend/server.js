require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./models');

// 初始化Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// 中间件
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 测试数据库连接
(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('数据库连接成功');
    await db.sequelize.sync({ alter: true });
    console.log('数据库同步完成');
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
})();

// Socket.io连接
io.on('connection', (socket) => {
  console.log('新客户端连接');
  
  socket.on('disconnect', () => {
    console.log('客户端断开连接');
  });
});

// 路由
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ message: '售前看板系统API' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器错误' });
});

// 启动服务器 - 使用5001端口避免与系统进程冲突
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = { 
  app, 
  sequelize: db.sequelize,
  io 
};