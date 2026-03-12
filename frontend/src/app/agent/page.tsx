'use client';
import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Spin, Space, Table, Tag } from 'antd';
import {
  SendOutlined, FireOutlined, WarningOutlined,
  FundOutlined, LinkOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';

const { Title, Text } = Typography;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: any[] | null;
  columns?: any[] | null;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: '销量TOP10', icon: <FireOutlined />, question: '销量TOP10' },
  { label: '缺货预警', icon: <WarningOutlined />, question: '缺货预警' },
  { label: '广告表现', icon: <FundOutlined />, question: '广告表现' },
  { label: '链接分析', icon: <LinkOutlined />, question: '链接分析' },
];

/** Simple markdown-like rendering: bold, code, line breaks */
function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;font-size:13px;">$1</code>')
    .replace(/\n/g, '<br/>');
  // simple list support
  html = html.replace(/(^|<br\/>)\s*[-*]\s+(.+?)(?=<br\/>|$)/g, '$1<span style="display:block;padding-left:12px;">• $2</span>');
  return html;
}

/** Auto-generate table columns from data keys */
function inferColumns(data: any[]): any[] {
  if (!data.length) return [];
  const keys = Object.keys(data[0]);
  return keys.map((key) => ({
    title: key,
    dataIndex: key,
    key,
    ellipsis: true,
    render: (v: any) => {
      if (v == null) return '-';
      if (typeof v === 'number') return v.toLocaleString();
      return String(v);
    },
  }));
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '您好！我是AI数据助手，可以帮您查询销量、广告、库存、销售额等数据。请输入您的问题。',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (question?: string) => {
    const q = (question || input).trim();
    if (!q || loading) return;

    const userMsg: Message = { role: 'user', content: q, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/agent/chat', { question: q });
      const body = res.data?.data || res.data;
      const answer = body?.answer || '抱歉，暂时无法回答该问题。';
      const tableData = body?.data || null;
      const tableCols = body?.columns || null;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: answer, data: tableData, columns: tableCols, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '请求失败，请稍后重试。', timestamp: new Date() },
      ]);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 24, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Title level={3}>AI 数据助手</Title>
      <Card
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { flex: 1, overflow: 'auto', padding: 16 } }}
      >
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 16 }}>
          {messages.map((msg, i) => (
            <div key={i}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: msg.role === 'user' ? '#1677ff' : '#f5f5f5',
                    color: msg.role === 'user' ? '#fff' : '#333',
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ marginBottom: 4, fontSize: 12, opacity: 0.7 }}>
                    {msg.role === 'user' ? '我' : 'AI助手'} · {msg.timestamp.toLocaleTimeString('zh-CN')}
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                </div>
              </div>
              {/* Render data table if present */}
              {msg.data && Array.isArray(msg.data) && msg.data.length > 0 && (
                <div style={{ marginBottom: 16, marginLeft: 8 }}>
                  <Table
                    size="small"
                    rowKey={(_, idx) => String(idx)}
                    columns={msg.columns || inferColumns(msg.data)}
                    dataSource={msg.data}
                    pagination={msg.data.length > 10 ? { pageSize: 10 } : false}
                    scroll={{ x: 'max-content' }}
                    bordered
                  />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: '#f5f5f5',
                  color: '#999',
                  fontSize: 14,
                }}
              >
                <Spin size="small" style={{ marginRight: 8 }} />
                AI助手正在思考中...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </Card>
      {/* Quick action buttons */}
      <div style={{ marginTop: 8, marginBottom: 4 }}>
        <Space wrap>
          {QUICK_ACTIONS.map((qa) => (
            <Button
              key={qa.label}
              icon={qa.icon}
              size="small"
              onClick={() => handleSend(qa.question)}
              disabled={loading}
            >
              {qa.label}
            </Button>
          ))}
        </Space>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Input
          size="large"
          placeholder="输入问题，如：销量TOP10、广告ACOS、库存状态..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={() => handleSend()}
          disabled={loading}
        />
        <Button type="primary" size="large" icon={<SendOutlined />} onClick={() => handleSend()} loading={loading}>
          发送
        </Button>
      </div>
    </div>
  );
}
