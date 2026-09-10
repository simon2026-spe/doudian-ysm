import React, { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, Modal, Form, Input, message } from 'antd'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  DashboardOutlined,
  ShopOutlined,
  TeamOutlined,
  ShoppingOutlined,
  OrderedListOutlined,
  ShoppingCartOutlined,
  ToolOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  LockOutlined,
} from '@ant-design/icons'
import { MENU_ITEMS } from '../utils/constants.js'
import { http } from '../api/request.js'

const { Header, Sider, Content } = Layout

// 图标映射
const iconMap = {
  DashboardOutlined: <DashboardOutlined />,
  ShopOutlined: <ShopOutlined />,
  TeamOutlined: <TeamOutlined />,
  ShoppingOutlined: <ShoppingOutlined />,
  OrderedListOutlined: <OrderedListOutlined />,
  ShoppingCartOutlined: <ShoppingCartOutlined />,
  ToolOutlined: <ToolOutlined />,
}

const MainLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [pwdModalOpen, setPwdModalOpen] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdForm] = Form.useForm()

  // 处理菜单点击
  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  // 处理退出登录
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userInfo')
    navigate('/login')
  }

  // 处理用户下拉菜单点击
  const handleUserMenuClick = ({ key }) => {
    if (key === 'changePassword') {
      setPwdModalOpen(true)
    } else if (key === 'logout') {
      handleLogout()
    }
  }

  // 提交修改密码
  const handleChangePassword = async (values) => {
    setPwdLoading(true)
    try {
      await http.put('/change-password', {
        old_password: values.old_password,
        new_password: values.new_password,
      })
      message.success('密码修改成功，请重新登录')
      setPwdModalOpen(false)
      pwdForm.resetFields()
      handleLogout()
    } catch (e) {
      // 错误提示由 request.js 拦截器统一弹出
    } finally {
      setPwdLoading(false)
    }
  }

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'changePassword',
      icon: <LockOutlined />,
      label: '修改密码',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ]

  // 构建菜单项
  const menuItems = MENU_ITEMS.map((item) => ({
    key: item.key,
    icon: iconMap[item.icon],
    label: item.label,
  }))

  // 获取当前选中的菜单
  const selectedKeys = [location.pathname]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        theme="dark"
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        {/* Logo 区域 */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0 16px' : '0 20px',
            color: '#fff',
            fontSize: collapsed ? 18 : 16,
            fontWeight: 600,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          {collapsed ? '成本' : '成本管理系统'}
        </div>

        {/* 菜单 */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            borderRight: 0,
            paddingTop: 12,
          }}
        />
      </Sider>

      {/* 右侧主区域 */}
      <Layout>
        {/* 顶部栏 */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {/* 折叠按钮 */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />

          {/* 右侧用户信息 */}
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                gap: 12,
              }}
            >
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
              <span style={{ color: 'rgba(0,0,0,0.85)' }}>管理员</span>
            </div>
          </Dropdown>
        </Header>

        {/* 内容区 */}
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={pwdModalOpen}
        onCancel={() => setPwdModalOpen(false)}
        onOk={() => pwdForm.submit()}
        confirmLoading={pwdLoading}
        okText="确认修改"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePassword} style={{ marginTop: 16 }}>
          <Form.Item name="old_password" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item name="new_password" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}>
            <Input.Password placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="确认新密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) return Promise.resolve()
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

export default MainLayout
