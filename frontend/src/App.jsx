import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ConfigProvider, message, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MainLayout from './components/layout/MainLayout'; // 引入主布局
import './App.css';

// 私有路由组件，检查用户是否登录
const PrivateRoute = ({ user, onLogout }) => {
  if (!user) {
    // 如果用户未登录，重定向到登录页
    return <Navigate to="/login" replace />;
  }
  // 如果用户已登录，渲染主布局，并通过 Outlet 渲染子路由
  return <MainLayout user={user} onLogout={onLogout} />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // 实际应用中应添加API调用来验证token并获取最新用户信息
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData) {
          setUser(userData);
        } else {
           localStorage.removeItem('token');
           localStorage.removeItem('user');
        }
      } catch (error) {
        console.error("Failed to parse user data from localStorage", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    message.success('登录成功');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    message.success('已退出登录');
    // 不需要手动导航，路由会自动处理重定向
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          {/* 公共路由 */}
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/" /> : <RegisterPage />}
          />
          <Route
            path="/setup"
            element={user ? <Navigate to="/" /> : <SetupPage onSetup={handleLogin} />}
          />

          {/* 私有路由 (需要登录) */}
          <Route element={<PrivateRoute user={user} onLogout={handleLogout} />}>
            {/* 所有需要布局的页面都放在这里 */}
            <Route path="/" element={<DashboardPage />} />
            {/* 可以在这里添加其他私有路由，例如 /projects, /settings */}
            {/* <Route path="/projects" element={<ProjectsPage />} /> */}
            {/* <Route path="/settings" element={<SettingsPage />} /> */}
          </Route>

          {/* 404 或重定向 */}
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
