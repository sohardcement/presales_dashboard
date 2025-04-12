import React, { useState, useEffect } from 'react';
import { Button, Typography, List, Card, Spin, message, Modal, Form, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, ShareAltOutlined } from '@ant-design/icons';
import axios from 'axios';
import PermissionManager from '../components/permissions/PermissionManager';

const { Title, Text } = Typography;
const { Meta } = Card;

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

const DashboardPage = ({ user }) => {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState(null);
  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
  const [selectedDashboardId, setSelectedDashboardId] = useState(null);
  const [form] = Form.useForm();

  const fetchDashboards = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboards');
      setDashboards(response.data || []);
    } catch (error) {
      console.error("获取看板列表失败:", error);
      message.error('获取看板列表失败');
      if (error.response?.status === 401 || error.response?.status === 403) {
         // 可以触发登出逻辑
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  // --- 看板编辑模态框 ---
  const showEditModal = (dashboard = null) => {
    setEditingDashboard(dashboard);
    form.setFieldsValue(dashboard ? { name: dashboard.name, description: dashboard.description } : { name: '', description: '' });
    setIsModalVisible(true);
  };

  const handleEditCancel = () => {
    setIsModalVisible(false);
    setEditingDashboard(null);
    form.resetFields();
  };

  const handleEditOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      if (editingDashboard) {
        await api.put(`/dashboards/${editingDashboard.id}`, values);
        message.success('看板更新成功');
      } else {
        await api.post('/dashboards', values);
        message.success('看板创建成功');
      }
      handleEditCancel();
      fetchDashboards();
    } catch (errorInfo) {
      console.log('表单验证失败:', errorInfo);
      message.error('请检查表单输入');
    } finally {
        setLoading(false);
    }
  };

  // --- 看板删除 ---
   const handleDelete = async (dashboardId) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这个看板吗？相关权限也将被删除。',
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
                try {
                    setLoading(true);
                    await api.delete(`/dashboards/${dashboardId}`);
                    message.success('看板删除成功');
                    fetchDashboards();
                } catch (error) {
                    console.error("删除看板失败:", error);
                    message.error('删除看板失败');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

  // --- 权限管理模态框 ---
  const handleManagePermissions = (dashboardId) => {
      setSelectedDashboardId(dashboardId);
      setIsPermissionModalVisible(true);
  };

  const handlePermissionModalClose = () => {
      setIsPermissionModalVisible(false);
      setSelectedDashboardId(null);
  };

  return (
    <div style={{ padding: '24px', background: '#fff', minHeight: '100%' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>我的看板</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showEditModal()}>
          新建看板
        </Button>
      </div>
      {loading && !dashboards.length ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}><Spin size="large" /></div>
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 4 }}
          dataSource={dashboards}
          renderItem={item => (
            <List.Item>
              <Card
                hoverable
                actions={[
                  <SettingOutlined key="setting" onClick={() => message.info(`查看看板 ${item.id} 内容 (待实现)`)} />,
                  <EditOutlined key="edit" onClick={() => showEditModal(item)} />,
                  <ShareAltOutlined key="permissions" onClick={() => handleManagePermissions(item.id)} />,
                  <DeleteOutlined key="delete" onClick={() => handleDelete(item.id)} />,
                ]}
              >
                <Meta
                  title={<a onClick={() => message.info(`查看看板 ${item.id} 内容 (待实现)`)}>{item.name}</a>}
                  description={item.description || '暂无描述'}
                />
                 <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                    创建者: {item.creator?.username || '未知'} | {new Date(item.created_at).toLocaleDateString()}
                 </Text>
              </Card>
            </List.Item>
          )}
          locale={{ emptyText: '暂无看板，快去创建一个吧！' }}
        />
      )}

      {/* 编辑/新建看板模态框 */}
      <Modal
        title={editingDashboard ? "编辑看板" : "新建看板"}
        visible={isModalVisible}
        onOk={handleEditOk}
        onCancel={handleEditCancel}
        confirmLoading={loading}
        okText={editingDashboard ? "更新" : "创建"}
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" name="dashboard_form">
          <Form.Item
            name="name"
            label="看板名称"
            rules={[{ required: true, message: '请输入看板名称' }]}
          >
            <Input placeholder="例如：Q1 销售业绩看板" />
          </Form.Item>
          <Form.Item
            name="description"
            label="看板描述"
          >
            <Input.TextArea rows={4} placeholder="简要描述看板的用途或内容" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限管理模态框 */}
      {selectedDashboardId && (
          <PermissionManager
            dashboardId={selectedDashboardId}
            visible={isPermissionModalVisible}
            onClose={handlePermissionModalClose}
          />
      )}
    </div>
  );
};

export default DashboardPage;