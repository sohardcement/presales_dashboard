-- 创建数据库
CREATE DATABASE IF NOT EXISTS presales_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE presales_db;

-- 用户表(修改为Users以保持一致性)
CREATE TABLE IF NOT EXISTS Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 其他表保持不变...

-- 创建初始管理员账户(密码将在首次登录时设置)
INSERT IGNORE INTO Users (username, password_hash, role) 
VALUES ('admin', '', 'admin');