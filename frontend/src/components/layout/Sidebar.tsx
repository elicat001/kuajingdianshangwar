'use client';
import { Layout, Menu } from 'antd';
import { DashboardOutlined, AlertOutlined, ShoppingOutlined, ThunderboltOutlined, SettingOutlined, EyeOutlined, CloudUploadOutlined, LinkOutlined, RobotOutlined, ExperimentOutlined, LineChartOutlined, TruckOutlined, SwapOutlined } from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';

const { Sider } = Layout;

const menuItems = [
  { key: '/war-room', icon: <DashboardOutlined />, label: '作战室' },
  { key: '/alerts', icon: <AlertOutlined />, label: '预警中心' },
  { key: '/skus', icon: <ShoppingOutlined />, label: 'SKU管理' },
  { key: '/competitors', icon: <EyeOutlined />, label: '竞品情报' },
  { key: '/actions', icon: <ThunderboltOutlined />, label: '行动中心' },
  { key: '/product-tests', icon: <ExperimentOutlined />, label: '新品测试' },
  { key: '/forecasts', icon: <LineChartOutlined />, label: '需求预测' },
  { key: '/supply-chain', icon: <TruckOutlined />, label: '供应链' },
  { key: '/budget-migration', icon: <SwapOutlined />, label: '预算迁移' },
  { key: '/import', icon: <CloudUploadOutlined />, label: '数据导入' },
  { key: '/link-analysis', icon: <LinkOutlined />, label: '链接分析' },
  { key: '/agent', icon: <RobotOutlined />, label: 'AI助手' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const selectedKey = menuItems.find((m) => pathname.startsWith(m.key))?.key || '/war-room';

  return (
    <Sider width={220} style={{ background: '#1a1a2e', minHeight: '100vh' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <span style={{ color: '#e94560', fontSize: 18, fontWeight: 700 }}>AI Commerce War</span>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => router.push(key)}
        style={{ background: '#1a1a2e', borderRight: 0 }}
      />
      <style jsx global>{`
        .ant-menu-dark.ant-menu-inline .ant-menu-item-selected { background: #0f3460 !important; }
        .ant-menu-dark .ant-menu-item:hover { background: rgba(15,52,96,0.6) !important; }
      `}</style>
    </Sider>
  );
}
