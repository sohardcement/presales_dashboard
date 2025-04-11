# 售前看板系统架构设计

## 1. 技术栈
- **前端**: 
  - React 18
  - Ant Design 5.x (UI组件库)
  - ECharts 5.x (数据可视化)
  - React Router 6 (路由管理)
  - Axios (HTTP客户端)
  
- **后端**:
  - Node.js 18.x
  - Express 4.x
  - Sequelize ORM (数据库操作)
  - JWT (认证)
  - Bcrypt (密码加密)
  - Socket.IO (实时数据推送)

- **数据库**:
  - MySQL 8.x (Docker容器)
  - 初始化脚本自动创建表结构

- **开发工具**:
  - Docker & Docker Compose
  - Vite (前端构建工具)

## 2. 系统模块

### 2.1 用户认证模块
- 管理员首次登录设置密码
- 用户登录/登出
- JWT token验证
- 密码重置功能

### 2.2 权限管理模块
- 角色系统(管理员、普通用户)
- 看板访问权限控制
- 基于角色的UI元素显示控制

### 2.3 数据可视化模块 (增强版)
- **交互式图表**:
  - 可缩放/平移的折线图
  - 联动高亮的柱状图
  - 可钻取的饼图/环形图
  - 热力图(项目热度分析)
  - 桑基图(流程转化分析)
  
- **高级功能**:
  - 自定义仪表盘布局(拖拽调整)
  - 多维度数据筛选器
  - 数据下钻分析
  - 实时数据刷新(WebSocket)
  - 阈值预警功能
  - 数据对比模式(同期对比)
  
- **导出分享**:
  - PNG/PDF导出
  - 数据CSV导出
  - 看板链接分享

### 2.4 项目管理模块
- 项目CRUD操作
- 项目状态跟踪
- 里程碑管理
- 项目健康度评分

## 3. 数据库设计

### 3.1 表结构
```sql
-- 用户表
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 看板表
CREATE TABLE dashboards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 看板权限表
CREATE TABLE dashboard_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dashboard_id INT REFERENCES dashboards(id),
  user_id INT REFERENCES users(id),
  permission_level ENUM('read', 'write', 'admin') NOT NULL
);

-- 项目表
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status ENUM('planning', 'in_progress', 'completed', 'on_hold') NOT NULL,
  start_date DATE,
  end_date DATE,
  progress TINYINT UNSIGNED DEFAULT 0,
  health_score TINYINT UNSIGNED COMMENT '1-100分健康度评分'
);

-- 项目数据表(用于图表)
CREATE TABLE project_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  metric_date DATE NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  metric_type VARCHAR(50) NOT NULL
);

-- 看板布局配置表
CREATE TABLE dashboard_layouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dashboard_id INT REFERENCES dashboards(id),
  user_id INT REFERENCES users(id),
  layout_config JSON NOT NULL COMMENT '保存用户自定义布局',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 预警规则表
CREATE TABLE alert_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dashboard_id INT REFERENCES dashboards(id),
  metric_type VARCHAR(50) NOT NULL,
  condition ENUM('gt', 'lt', 'eq', 'neq') NOT NULL,
  threshold DECIMAL(10,2) NOT NULL,
  notification_method ENUM('email', 'in-app') NOT NULL
);
```

## 4. API设计

### 4.1 认证相关
- POST /api/auth/setup (管理员首次设置密码)
- POST /api/auth/login
- GET /api/auth/me

### 4.2 看板相关
- GET /api/dashboards (获取用户有权限的看板列表)
- POST /api/dashboards (创建新看板)
- PUT /api/dashboards/:id/permissions (设置看板权限)
- GET /api/dashboards/:id/layout (获取看板布局)
- PUT /api/dashboards/:id/layout (保存看板布局)

### 4.3 项目相关
- GET /api/projects (获取项目列表)
- GET /api/projects/:id/metrics (获取项目指标数据)
- POST /api/projects (创建新项目)
- GET /api/projects/health (获取项目健康度报告)

### 4.4 图表数据
- GET /api/metrics/summary (获取汇总数据)
- GET /api/metrics/trend (获取趋势数据)
- GET /api/metrics/comparison (获取对比数据)
- GET /api/metrics/alert-rules (获取预警规则)
- POST /api/metrics/alert-rules (创建预警规则)

### 4.5 实时数据
- WebSocket /realtime (实时数据推送)

## 5. 前端组件结构

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.jsx
│   │   └── SetupForm.jsx
│   ├── dashboard/
│   │   ├── DashboardList.jsx
│   │   ├── DashboardView.jsx
│   │   ├── PermissionEditor.jsx
│   │   ├── LayoutCustomizer.jsx
│   │   └── components/
│   │       ├── ChartWrapper.jsx
│   │       ├── DataFilter.jsx
│   │       └── AlertIndicator.jsx
│   ├── projects/
│   │   ├── ProjectTable.jsx
│   │   ├── ProjectForm.jsx
│   │   ├── ProjectCharts.jsx
│   │   └── HealthScore.jsx
│   └── layout/
│       ├── MainLayout.jsx
│       ├── Navbar.jsx
│       └── Sidebar.jsx
├── pages/
│   ├── DashboardPage.jsx
│   ├── LoginPage.jsx
│   └── ProjectsPage.jsx
└── services/
    ├── api.js
    ├── auth.js
    └── realtime.js
```

## 6. 开发路线图

1. **第1周**: 基础架构搭建
   - 初始化项目结构
   - Docker环境配置
   - 基础API框架

2. **第2周**: 用户认证系统
   - 管理员首次登录设置
   - JWT认证流程
   - 用户管理界面

3. **第3周**: 看板核心功能
   - 看板CRUD功能
   - 权限分配系统
   - 基础图表展示

4. **第4周**: 高级数据功能
   - 交互式图表实现
   - 数据筛选和下钻
   - 实时数据推送

5. **第5周**: 自定义与预警
   - 看板布局自定义
   - 预警规则配置
   - 健康度评分系统

6. **第6周**: UI美化与优化
   - 主题定制
   - 动效添加
   - 响应式优化