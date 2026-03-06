'use client';
import { Layout, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Sidebar from './Sidebar';
import AppHeader from './Header';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isAuthenticated } from '@/lib/auth';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/login';

  useEffect(() => {
    if (!isLogin && !isAuthenticated()) {
      router.replace('/login');
    }
  }, [isLogin, router, pathname]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: { colorPrimary: '#0f3460', borderRadius: 6 },
        components: { Menu: { darkItemBg: '#1a1a2e', darkSubMenuItemBg: '#1a1a2e', darkItemSelectedBg: '#0f3460' } },
      }}
    >
      {isLogin ? (
        children
      ) : (
        <Layout style={{ minHeight: '100vh' }}>
          <Sidebar />
          <Layout>
            <AppHeader />
            <Layout.Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto' }}>
              <ErrorBoundary>{children}</ErrorBoundary>
            </Layout.Content>
          </Layout>
        </Layout>
      )}
    </ConfigProvider>
  );
}
