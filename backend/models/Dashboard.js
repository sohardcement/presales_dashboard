const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const Dashboard = sequelize.define('Dashboard', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: "看板名称不能为空" }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true, // 允许为空，如果创建者用户被删除
      references: {
        model: 'Users', // 引用 Users 表
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }
    // created_at 和 updated_at 由 Sequelize 自动处理 (如果 timestamps: true)
  }, {
    tableName: 'dashboards', // 明确指定表名
    timestamps: true, // 启用时间戳 (created_at, updated_at)
    createdAt: 'created_at',
    updatedAt: 'updated_at' // 启用 updated_at
  });

  Dashboard.associate = (models) => {
    // 一个看板由一个用户创建
    Dashboard.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator' // 别名
    });
    // 一个看板可以有多个权限设置
    Dashboard.hasMany(models.DashboardPermission, {
      foreignKey: 'dashboard_id',
      as: 'permissions',
      onDelete: 'CASCADE' // 删除看板时，关联的权限也删除
    });
    // 一个看板可以通过 DashboardPermission 与多个用户关联
    Dashboard.belongsToMany(models.User, {
        through: models.DashboardPermission,
        foreignKey: 'dashboard_id',
        otherKey: 'user_id',
        as: 'authorizedUsers'
    });
  };

  return Dashboard;
};