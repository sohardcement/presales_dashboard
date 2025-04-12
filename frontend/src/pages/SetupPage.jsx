import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { LockOutlined, SettingOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const SetupPage = ({ onSetup }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      setLoading(true);
      // 确认API端点为5001
      const response = await axios.post('http://localhost:5001/api/auth/setup', {
        password: values.password
      });

      onSetup(response.data.token, response.data.user);
      message.success('管理员密码设置成功，请使用新密码登录');
      navigate('/login'); // 设置成功后跳转到登录页
    } catch (error) {
      message.error(error.response?.data?.error || '设置失败，可能密码已设置或服务出错');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f2f5 0%, #e6f7ff 100%)'
    }}>
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', alignItems: 'center' }}>
           <Title level={2} style={{ color: '#1890ff', marginBottom: '24px' }}>
             <SettingOutlined /> 设置管理员密码
           </Title>
          <Form
            name="setup"
            onFinish={onFinish}
            autoComplete="off"
            style={{ width: '100%' }}
            size="large"
          >
            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少需要6位' }
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                placeholder="设置管理员密码 (至少6位)"
              />
            </Form.Item>

            <Form.Item
              name="confirm"
              dependencies={['password']}
              hasFeedback
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                placeholder="确认密码"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ marginTop: '16px' }}
              >
                确认设置
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default SetupPage;