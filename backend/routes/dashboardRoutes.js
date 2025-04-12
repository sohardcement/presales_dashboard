const express = require('express');
const router = express.Router();
const { Dashboard, DashboardPermission, User, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/authMiddleware'); // Assuming middleware exists

// Helper function to check if a user has admin rights on a specific dashboard
const checkDashboardAdmin = async (userId, dashboardId) => {
    const permission = await DashboardPermission.findOne({
        where: { user_id: userId, dashboard_id: dashboardId, permission_level: 'admin' }
    });
    return !!permission;
};

// --- 看板 CRUD ---

// 获取用户有权限访问的看板列表
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let dashboards;
        if (userRole === 'admin') {
            // 系统管理员可以查看所有看板
            dashboards = await Dashboard.findAll({
                include: [{ model: User, as: 'creator', attributes: ['id', 'username'] }],
                order: [['created_at', 'DESC']]
            });
        } else {
            // 普通用户只能查看自己创建或被授权的看板
            const userWithDashboards = await User.findByPk(userId, {
                include: [{
                    model: Dashboard,
                    as: 'accessibleDashboards', // 通过权限表关联
                    include: [{ model: User, as: 'creator', attributes: ['id', 'username'] }]
                }],
                 order: [[{ model: Dashboard, as: 'accessibleDashboards' }, 'created_at', 'DESC']]
            });
            dashboards = userWithDashboards ? userWithDashboards.accessibleDashboards : [];
             // Note: The previous logic combining createdDashboards and accessibleDashboards was complex and potentially inefficient.
             // Relying solely on the permissions table (accessibleDashboards) is simpler,
             // as creating a dashboard now automatically grants admin permission.
        }
        res.json(dashboards || []);
    } catch (error) {
        console.error('Get dashboards error:', error);
        res.status(500).json({ error: '获取看板列表失败' });
    }
});

// 创建新看板
router.post('/', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction(); // Start transaction
    try {
        const { name, description } = req.body;
        if (!name) {
            await t.rollback();
            return res.status(400).json({ error: '看板名称不能为空' });
        }
        const newDashboard = await Dashboard.create({
            name,
            description,
            created_by: req.user.id
        }, { transaction: t });

        // 默认给自己添加 admin 权限
        await DashboardPermission.create({
            dashboard_id: newDashboard.id,
            user_id: req.user.id,
            permission_level: 'admin'
        }, { transaction: t });

        await t.commit(); // Commit transaction
        res.status(201).json(newDashboard);
    } catch (error) {
        await t.rollback(); // Rollback transaction on error
        console.error('Create dashboard error:', error);
        res.status(500).json({ error: '创建看板失败' });
    }
});

// 获取单个看板详情 (需要读取权限)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const dashboardId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        const dashboard = await Dashboard.findByPk(dashboardId, {
             include: [{ model: User, as: 'creator', attributes: ['id', 'username'] }]
        });

        if (!dashboard) {
            return res.status(404).json({ error: '看板未找到' });
        }

        // 权限检查
        if (userRole !== 'admin') {
            const permission = await DashboardPermission.findOne({ where: { user_id: userId, dashboard_id: dashboardId } });
            if (!permission) {
                 return res.status(403).json({ error: '无权查看此看板' });
            }
        }

        res.json(dashboard);
    } catch (error) {
        console.error('Get dashboard detail error:', error);
        res.status(500).json({ error: '获取看板详情失败' });
    }
});

// 更新看板信息 (需要看板 admin 权限)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const dashboardId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;
        const { name, description } = req.body;

        const dashboard = await Dashboard.findByPk(dashboardId);
        if (!dashboard) {
            return res.status(404).json({ error: '看板未找到' });
        }

        // 权限检查: 系统管理员或看板管理员
        const isAdmin = userRole === 'admin' || await checkDashboardAdmin(userId, dashboardId);
        if (!isAdmin) {
             return res.status(403).json({ error: '无权修改此看板' });
        }

        if (!name) {
             return res.status(400).json({ error: '看板名称不能为空' });
        }

        await dashboard.update({ name, description });
        res.json(dashboard);
    } catch (error) {
        console.error('Update dashboard error:', error);
        res.status(500).json({ error: '更新看板失败' });
    }
});

// 删除看板 (需要看板 admin 权限)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const dashboardId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        const dashboard = await Dashboard.findByPk(dashboardId);
        if (!dashboard) {
            return res.status(404).json({ error: '看板未找到' });
        }

        // 权限检查: 系统管理员或看板管理员
        const isAdmin = userRole === 'admin' || await checkDashboardAdmin(userId, dashboardId);
         if (!isAdmin) {
             return res.status(403).json({ error: '无权删除此看板' });
        }

        await dashboard.destroy(); // Sequelize 会处理关联权限的删除 (onDelete: 'CASCADE')
        res.status(204).send(); // No Content
    } catch (error) {
        console.error('Delete dashboard error:', error);
        res.status(500).json({ error: '删除看板失败' });
    }
});

// --- 权限管理 ---

// 获取看板的权限列表 (需要看板 admin 权限)
router.get('/:id/permissions', authenticateToken, async (req, res) => {
    try {
        const dashboardId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        // 权限检查: 系统管理员或看板管理员
        const isAdmin = userRole === 'admin' || await checkDashboardAdmin(userId, dashboardId);
         if (!isAdmin) {
             return res.status(403).json({ error: '无权查看此看板权限' });
        }

        const permissions = await DashboardPermission.findAll({
            where: { dashboard_id: dashboardId },
            include: [{ model: User, attributes: ['id', 'username'] }] // 包含用户信息
        });
        res.json(permissions);
    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({ error: '获取权限列表失败' });
    }
});

// 添加或更新看板权限 (需要看板 admin 权限)
router.post('/:id/permissions', authenticateToken, async (req, res) => {
    try {
        const dashboardId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;
        const { targetUserId, permissionLevel } = req.body;

        if (!targetUserId || !permissionLevel || !['read', 'write', 'admin'].includes(permissionLevel)) {
            return res.status(400).json({ error: '无效的用户ID或权限级别' });
        }

        // 权限检查: 系统管理员或看板管理员
        const isAdmin = userRole === 'admin' || await checkDashboardAdmin(userId, dashboardId);
         if (!isAdmin) {
             return res.status(403).json({ error: '无权修改此看板权限' });
        }

        // 检查目标用户是否存在
        const targetUser = await User.findByPk(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ error: '目标用户未找到' });
        }

        // 使用 findOrCreate 或 update 来处理权限
        const [permission, created] = await DashboardPermission.findOrCreate({
            where: { dashboard_id: dashboardId, user_id: targetUserId },
            defaults: { permission_level: permissionLevel },
            // transaction: t // 如果需要事务
        });

        if (!created) {
            // 如果已存在，则更新
            await permission.update({ permission_level: permissionLevel });
        }

        res.status(created ? 201 : 200).json(permission);

    } catch (error) {
        console.error('Set permission error:', error);
        res.status(500).json({ error: '设置权限失败' });
    }
});

// 删除看板权限 (需要看板 admin 权限)
router.delete('/:id/permissions/:targetUserId', authenticateToken, async (req, res) => {
    try {
        const dashboardId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;
        const targetUserId = req.params.targetUserId;

         // 不能删除自己的 admin 权限，除非是系统管理员删除别人的
        if (userId === parseInt(targetUserId, 10) && userRole !== 'admin') {
             const selfPermission = await DashboardPermission.findOne({ where: { user_id: userId, dashboard_id: dashboardId } });
             if (selfPermission && selfPermission.permission_level === 'admin') {
                 return res.status(400).json({ error: '不能删除自己的管理员权限' });
             }
        }

        // 权限检查: 系统管理员或看板管理员
        const isAdmin = userRole === 'admin' || await checkDashboardAdmin(userId, dashboardId);
         if (!isAdmin) {
             return res.status(403).json({ error: '无权修改此看板权限' });
        }

        const result = await DashboardPermission.destroy({
            where: { dashboard_id: dashboardId, user_id: targetUserId }
        });

        if (result === 0) {
            return res.status(404).json({ error: '未找到指定用户的权限记录' });
        }

        res.status(204).send(); // No Content

    } catch (error) {
        console.error('Delete permission error:', error);
        res.status(500).json({ error: '删除权限失败' });
    }
});


module.exports = router;