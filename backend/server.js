require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./models'); // 使用 models/index.js

// 初始化Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // 默认指向 Vite 端口
    methods: ['GET', 'POST', 'PUT', 'DELETE'] // 允许更多方法
  }
});

// 中间件
app.use(cors()); // 允许所有来源的跨域请求，生产环境应配置更严格的策略
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 测试数据库连接和同步模型
(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('数据库连接成功');
    // 注意：生产环境建议使用迁移而不是 sync({ alter: true })
    await db.sequelize.sync({ alter: true });
    console.log('数据库同步完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1); // 初始化失败则退出
  }
})();

// Socket.io连接处理 (可以留空或添加逻辑)
io.on('connection', (socket) => {
  console.log(`新客户端连接: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`客户端断开连接: ${socket.id}`);
  });
});

// --- 路由 ---
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); // 引入看板路由

app.use('/api/auth', authRoutes);
app.use('/api/dashboards', dashboardRoutes); // 挂载看板路由

// 根路径
app.get('/', (req, res) => {
  res.json({ message: '售前看板系统 API v1.0' });
});

// --- 统一错误处理 ---
app.use((err, req, res, next) => {
  console.error('统一错误处理:', err.stack);
  // 避免暴露敏感信息
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? '服务器内部错误' : err.message;
  res.status(statusCode).json({ error: message });
});

// 启动服务器
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

// 导出必要的对象 (如果其他模块需要)
module.exports = {
  app,
  sequelize: db.sequelize,
  io
};