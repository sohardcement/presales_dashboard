import React, { useState, useEffect } from 'react';
import { Modal, List, Select, Button, message, Spin, Avatar, Tag, AutoComplete } from 'antd';
import { UserOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

// API 请求封装 (复用或重新创建)
const api = axios.create({
  baseURL: 'http://localhost:5001/api',
});
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

const PermissionManager = ({ dashboardId, visible, onClose }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]); // 用于搜索的用户列表
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('read');
  const [searchTerm, setSearchTerm] = useState('');

  const permissionLevels = [
    { value: 'read', label: '只读' },
    { value: 'write', label: '读写' },
    { value: 'admin', label: '管理' },
  ];

  // 获取当前权限列表
  const fetchPermissions = async () => {
    if (!dashboardId) return;
    setLoading(true);
    try {
      const response = await api.get(`/dashboards/${dashboardId}/permissions`);
      setPermissions(response.data || []);
    } catch (error) {
      console.error("获取权限列表失败:", error);
      message.error('获取权限列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 搜索用户 (这里用假数据，实际应调用后端API)
  const searchUsers = async (searchText) => {
    if (!searchText) {
        setUsers([]);
        return;
    }
    // TODO: 实现后端用户搜索 API /api/users/search?q=searchText
    console.log("搜索用户:", searchText);
    // 模拟 API 调用
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // 模拟网络延迟
    const mockUsers = [
        { id: 1, username: 'admin' }, // 假设 admin 存在
        { id: 2, username: 'testuser1' },
        { id: 3, username: 'another_user' },
        { id: 10, username: searchText + '_found' }
    ].filter(u => u.username.includes(searchText)); // 简单过滤
    setUsers(mockUsers.map(u => ({ value: u.id.toString(), label: u.username })));
    setLoading(false);
  };

  useEffect(() => {
    if (visible && dashboardId) {
      fetchPermissions();
    } else {
      // 关闭时重置状态
      setPermissions([]);
      setUsers([]);
      setSelectedUser(null);
      setSearchTerm('');
    }
  }, [visible, dashboardId]);

  // 添加或更新权限
  const handleAddOrUpdatePermission = async () => {
    if (!selectedUser || !selectedLevel) {
      message.warning('请选择用户和权限级别');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/dashboards/${dashboardId}/permissions`, {
        targetUserId: parseInt(selectedUser.key, 10), // selectedUser 包含 { key, value }
        permissionLevel: selectedLevel,
      });
      message.success('权限设置成功');
      fetchPermissions(); // 刷新列表
      setSelectedUser(null); // 清空选择
      setSearchTerm(''); // 清空搜索框
      setUsers([]); // 清空搜索结果
    } catch (error) {
      console.error("设置权限失败:", error);
      message.error(error.response?.data?.error || '设置权限失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除权限
  const handleDeletePermission = async (targetUserId) => {
     Modal.confirm({
            title: '确认删除权限',
            content: '确定要移除该用户的权限吗？',
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
                setLoading(true);
                try {
                await api.delete(`/dashboards/${dashboardId}/permissions/${targetUserId}`);
                message.success('权限移除成功');
                fetchPermissions(); // 刷新列表
                } catch (error) {
                console.error("移除权限失败:", error);
                message.error(error.response?.data?.error || '移除权限失败');
                } finally {
                setLoading(false);
                }
            }
     });
  };

  const handleUserSelect = (value, option) => {
      setSelectedUser({ key: option.value, value: option.label }); // 保存 key (id) 和 value (username)
      setSearchTerm(option.label); // 更新输入框显示
  };

  return (
    <Modal
      title={`管理看板 #${dashboardId} 权限`}
      visible={visible}
      onCancel={onClose}
      footer={null} // 自定义页脚或移除
      width={600}
    >
      <Spin spinning={loading}>
        <div style={{ marginBottom: '20px' }}>
          <Title level={5}>添加用户权限</Title>
          <Space>
            <AutoComplete
              value={searchTerm}
              options={users}
              style={{ width: 200 }}
              onSelect={handleUserSelect}
              onSearch={searchUsers}
              onChange={setSearchTerm} // 允许用户直接输入或修改
              placeholder="搜索用户名"
              notFoundContent={loading ? <Spin size="small" /> : null}
            />
            <Select
              style={{ width: 120 }}
              value={selectedLevel}
              onChange={setSelectedLevel}
              options={permissionLevels}
            />
            <Button type="primary" onClick={handleAddOrUpdatePermission} disabled={!selectedUser}>
              添加/更新
            </Button>
          </Space>
        </div>

        <Title level={5}>当前权限列表</Title>
        <List
          itemLayout="horizontal"
          dataSource={permissions}
          renderItem={item => (
            <List.Item
              actions={[
                <Tag color={item.permission_level === 'admin' ? 'red' : item.permission_level === 'write' ? 'blue' : 'green'}>
                  {permissionLevels.find(p => p.value === item.permission_level)?.label || item.permission_level}
                </Tag>,
                // 不能删除自己的 admin 权限 (除非是系统管理员) - 这个逻辑最好后端处理
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeletePermission(item.user_id)}
                  // disabled={item.user_id === currentUser?.id && item.permission_level === 'admin'} // 简单前端禁用示例
                />
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={item.User?.username || `用户ID: ${item.user_id}`}
                // description={`ID: ${item.user_id}`}
              />
            </List.Item>
          )}
           locale={{ emptyText: '暂无用户权限设置' }}
        />
      </Spin>
    </Modal>
  );
};

export default PermissionManager;