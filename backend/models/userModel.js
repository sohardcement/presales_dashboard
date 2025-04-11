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
    tableName: 'Users',  // 显式指定表名
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password_hash')) {
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
    return await bcrypt.compare(candidatePassword, this.password_hash);
  };

  // 静态方法
  User.findByCredentials = async (username, password) => {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      throw new Error('用户不存在');
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('密码错误');
    }
    return user;
  };

  return User;
};