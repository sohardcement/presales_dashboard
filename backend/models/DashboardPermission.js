const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const DashboardPermission = sequelize.define('DashboardPermission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    dashboard_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'dashboards', // 引用 dashboards 表
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE' // 删除看板或用户时，权限也删除
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users', // 引用 Users 表
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    permission_level: {
      type: DataTypes.ENUM('read', 'write', 'admin'), // 定义权限级别
      allowNull: false,
      defaultValue: 'read'
    }
    // created_at 和 updated_at 由 Sequelize 自动处理
  }, {
    tableName: 'dashboard_permissions', // 明确指定表名
    timestamps: true, // 启用时间戳
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // 添加唯一约束，确保一个用户对一个看板只有一条权限记录
    indexes: [
      {
        unique: true,
        fields: ['dashboard_id', 'user_id']
      }
    ]
  });

  DashboardPermission.associate = (models) => {
    // 权限属于一个看板
    DashboardPermission.belongsTo(models.Dashboard, {
      foreignKey: 'dashboard_id'
    });
    // 权限属于一个用户
    DashboardPermission.belongsTo(models.User, {
      foreignKey: 'user_id'
    });
  };

  return DashboardPermission;
};