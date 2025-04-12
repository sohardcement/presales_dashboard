const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      defaultValue: 'user'
    }
  }, {
    tableName: 'Users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // 通常不需要更新用户记录的 updatedAt
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password_hash') && user.password_hash) { // 确保 password_hash 非空
          user.password_hash = await bcrypt.hash(user.password_hash, 10);
        }
      }
    }
  });

  // 实例方法
  User.prototype.generateAuthToken = function() {
    return jwt.sign(
      { id: this.id, username: this.username, role: this.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
  };

  User.prototype.comparePassword = async function(candidatePassword) {
    // 处理 password_hash 可能为空的情况 (例如，初始 admin 用户)
    if (!this.password_hash) return false;
    return await bcrypt.compare(candidatePassword, this.password_hash);
  };

  // 静态方法
  User.findByCredentials = async (username, password) => {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      throw new Error('用户不存在');
    }
    // 确保用户密码已设置
    if (!user.password_hash) {
        throw new Error('用户密码未设置');
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('密码错误');
    }
    return user;
  };

  // 添加关联关系
  User.associate = (models) => {
    // 一个用户可以创建多个看板
    User.hasMany(models.Dashboard, {
      foreignKey: 'created_by',
      as: 'createdDashboards'
    });
    // 一个用户可以通过 DashboardPermission 与多个看板关联
    User.belongsToMany(models.Dashboard, {
        through: models.DashboardPermission,
        foreignKey: 'user_id',
        otherKey: 'dashboard_id',
        as: 'accessibleDashboards'
    });
    // 一个用户可以有多条权限记录
     User.hasMany(models.DashboardPermission, {
        foreignKey: 'user_id',
        as: 'permissions'
    });
  };

  return User;
};