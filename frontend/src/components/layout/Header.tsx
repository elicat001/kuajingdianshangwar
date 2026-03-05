'use client';
import { Layout, Badge, Avatar, Dropdown, Space } from 'antd';
import { BellOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';

export default function AppHeader() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  return (
    <Layout.Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', height: 56 }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: '#16213e' }}>AI Commerce War OS</span>
      <Space size={20}>
        <Badge count={4} size="small">
          <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} onClick={() => router.push('/alerts')} />
        </Badge>
        <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); router.push('/login'); } }] }}>
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size="small" icon={<UserOutlined />} style={{ background: '#0f3460' }} />
            <span>{user?.name || 'Admin'}</span>
          </Space>
        </Dropdown>
      </Space>
    </Layout.Header>
  );
}
