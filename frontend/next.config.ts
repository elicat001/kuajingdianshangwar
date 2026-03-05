import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['antd', '@ant-design/icons', 'echarts', 'echarts-for-react'],
};

export default nextConfig;
