# AI Commerce War OS

> 跨境电商 AI 作战操作系统 — Cross-border E-commerce AI Operation System

全栈智能决策平台，将跨境电商运营从手动、被动的工作流转变为数据驱动、小时级决策循环。系统覆盖完整闭环：**信号 → 推荐 → 行动 → 验证 → 学习**。

---

## 系统截图

| 作战室 | Battle Card |
|--------|-------------|
| KPI 卡片、销售趋势、广告效果、风险热力图 | 单 SKU 指标、竞品对比、告警、推荐建议 |

| 预警中心 | 行动中心 |
|----------|----------|
| 多维度告警列表 + 证据链 | 状态机驱动的行动工作流 + 审批 |

| 新品测试 | 需求预测 |
|----------|----------|
| Gate System 4 阶段测试引擎 | 指数平滑预测 + 补货建议 |

| 供应链 | 预算迁移 |
|--------|----------|
| 采购单全生命周期 + 供应商 + 物流 | ROAS 分析 + 预算优化建议 |

---

## 功能模块

### V1 — 最小可行闭环 (已完成)
- **作战室** — 实时总览：销售额、广告花费、TACOS、断货数、趋势、风险热力图
- **预警引擎** — 9 条规则覆盖 4 大类（断货、广告浪费、竞品异动、定价风险）
- **Battle Card** — 单 SKU 作战指挥中心：KPI、图表、告警、推荐、行动历史
- **行动中心** — 完整状态机：草稿 → 提交 → 审批 → 执行 → 验证 → 关闭
- **护栏系统** — 最大调幅、利润率下限、冷却期、日限额、批量影响上限
- **审批流** — 基于风险评分自动路由，角色级审批链
- **审计日志** — 仅追加式审计，触发器保护不可篡改
- **多租户 RBAC** — 公司隔离 + 5 级角色（超管/管理员/经理/运营/观察者）
- **系统设置** — 可配置阈值、指标定义版本化、权限管理
- **竞品情报** — 竞品价格/评分/排名追踪 + 快照
- **数据导入** — Excel/CSV 批量上传（销售/广告/库存）
- **AI 助手** — 智能对话查询数据

### V2 — 扩展模块 (已完成)
- **需求预测** — Holt 指数平滑 / 移动平均预测模型，置信区间，交叉验证精度评估
- **补货建议** — 基于预测自动计算安全库存、再订货点、建议采购量和时间
- **新品测试 Gate System** — 4 阶段门禁（上架验证 → 验证期 → 放量期 → 稳定期 → 毕业/终止）
- **供应链管理** — 供应商管理 + 采购单全生命周期（7 状态流转）+ 物流追踪
- **预算迁移** — ROAS 分析识别低效/高效 Campaign，预算优化建议 + 迁移工作流

### V3 — 自动驾驶 (规划中)
- AutoPilot 自动定价/竞价/补货引擎（带强护栏）
- Playbook 策略模板库 + A/B 测试框架
- 灰度发布控制器 + 紧急熔断

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | TypeScript, NestJS, TypeORM |
| **前端** | TypeScript, React 18, Next.js 14 (App Router), Ant Design 5 |
| **图表** | ECharts (echarts-for-react) |
| **状态管理** | Zustand |
| **数据库** | PostgreSQL 15 (40+ 张表) |
| **缓存** | Redis 7 |
| **事件总线** | @nestjs/event-emitter |
| **定时任务** | @nestjs/schedule + 分布式锁 |
| **容器化** | Docker, Docker Compose |
| **测试** | Jest, @nestjs/testing, React Testing Library |

---

## 项目结构

```
.
├── backend/                        NestJS API 服务
│   └── src/
│       ├── auth/                   JWT 认证、RBAC、用户/公司管理
│       ├── data/                   店铺、站点、SKU、竞品、指标定义、阈值配置
│       ├── metrics/                作战室聚合、SKU 指标、快照、事实表
│       ├── alert/                  幂等告警创建、筛选、确认/关闭
│       ├── recommendation/         证据驱动的建议、采纳/拒绝工作流
│       ├── action/                 状态机、审批、执行、回滚、审计日志
│       ├── forecast/               需求预测模型（指数平滑/移动平均）+ 补货建议
│       ├── product-test/           新品测试 Gate System 引擎
│       ├── supply-chain/           供应商、采购单、物流管理
│       ├── budget-migration/       广告预算迁移分析与优化
│       ├── agent/                  AI 助手对话
│       ├── upload/                 数据导入（Excel/CSV）
│       └── common/
│           ├── engines/            规则引擎、断货/广告/竞品/定价规则、
│           │                       护栏、审批策略、验证引擎
│           ├── events/             事件定义（告警、行动、Gate 晋级等）
│           ├── jobs/               定时任务（告警扫描、预测生成、Gate 评估、
│           │                       每日汇总、行动验证）
│           └── utils/              去重(SHA-256)、指标计算器、利润计算器、分布式锁
├── frontend/                       Next.js 前端控制台
│   └── src/
│       ├── app/                    20 个页面路由
│       │   ├── war-room/           作战室
│       │   ├── alerts/             预警中心 + 详情
│       │   ├── skus/               SKU 管理 + Battle Card
│       │   ├── competitors/        竞品情报
│       │   ├── actions/            行动中心 + 详情
│       │   ├── product-tests/      新品测试列表 + 详情（Gate 时间线）
│       │   ├── forecasts/          需求预测 + 补货建议
│       │   ├── supply-chain/       供应链（采购单/供应商/物流）
│       │   ├── budget-migration/   预算迁移分析
│       │   ├── import/             数据导入
│       │   ├── link-analysis/      链接分析
│       │   ├── agent/              AI 助手
│       │   ├── settings/           系统设置
│       │   └── login/              登录
│       ├── components/             可复用组件（KPI 卡片、图表、表格、面板）
│       ├── store/                  7 个 Zustand Store
│       ├── lib/                    API 客户端、认证工具、导出工具
│       └── types/                  共享 TypeScript 类型定义
├── docker/                         Docker Compose（postgres + redis + backend + frontend）
├── scripts/
│   ├── init-db.sql                 全量 DDL
│   ├── seed-data.sql               演示数据
│   └── migration-*.sql             增量迁移脚本
└── package.json                    Monorepo 脚本
```

---

## 快速开始

### 前置条件
- Node.js >= 20
- Docker & Docker Compose

### 1. 克隆项目

```bash
git clone https://github.com/elicat001/kuajingdianshangwar.git
cd kuajingdianshangwar
```

### 2. 启动基础设施

```bash
# 启动 PostgreSQL + Redis
cd docker && docker-compose up -d postgres redis

# 初始化数据库
docker-compose exec -T postgres psql -U postgres -d ai_commerce_war -f /scripts/init-db.sql
docker-compose exec -T postgres psql -U postgres -d ai_commerce_war -f /scripts/seed-data.sql
```

### 3. 启动后端

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
# API: http://localhost:3000
# Swagger 文档: http://localhost:3000/api/docs
```

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
# Web UI: http://localhost:3001
```

### 或者使用 Docker Compose 一键启动

```bash
cd docker && docker-compose up -d --build
# 前端: http://localhost:3001
# 后端 API: http://localhost:3000
```

---

## 演示账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@demo.com | admin123 |
| 经理 | manager@demo.com | admin123 |
| 运营 | operator@demo.com | admin123 |

---

## API 概览

| 模块 | 端点 |
|------|------|
| **认证** | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/me` |
| **店铺 & 站点** | `GET/POST /api/stores`, `GET/POST /api/sites` |
| **SKU** | `GET /api/skus`, `GET /api/skus/:id`（分页、筛选） |
| **指标** | `GET /api/metrics/war-room`, `GET /api/metrics/sku/:id` |
| **告警** | `GET /api/alerts`, `POST /api/alerts/:id/ack`, `POST /api/alerts/:id/close` |
| **推荐** | `GET /api/recommendations`, `POST .../accept`, `POST .../reject` |
| **行动** | 完整生命周期：创建、提交、审批、拒绝、执行、回滚、验证 |
| **预测** | `POST /api/forecasts/generate`, `GET /api/forecasts`, 补货建议 CRUD |
| **新品测试** | `POST /api/product-tests`, `PATCH .../advance`, 指标查询 |
| **供应链** | 供应商 CRUD, 采购单生命周期, 物流管理 |
| **预算迁移** | `GET /api/budget-migrations/analyze`, 迁移 CRUD + 审批/执行/回滚 |
| **设置** | `GET/PUT /api/settings/thresholds`, 指标定义版本化 |

完整 Swagger 文档：后端启动后访问 `/api/docs`

---

## 规则引擎

### 告警规则（9 条规则，4 大类）

| 类别 | 规则 | 触发条件 | 严重程度 |
|------|------|----------|----------|
| **断货** | 库存危急 | 可售天数 < 3 | HIGH |
| **断货** | 库存预警 | 可售天数 < 7 | MEDIUM |
| **断货** | 滞销品 | 可售天数 > 90 且下降 | MEDIUM |
| **广告** | 零单浪费 | 花费 > 阈值且 0 单 | HIGH |
| **广告** | ACOS 过高 | ACOS > 阈值连续 3+ 天 | MEDIUM |
| **广告** | ACOS 异常 | ACOS 偏离 > 2 倍标准差 | HIGH |
| **竞品** | 价格下调 | 降幅 > 阈值 % | HIGH/MED |
| **竞品** | 排名跃升 | 排名大幅上升 | MEDIUM |
| **竞品** | 评论异常 | 日评论 > 3 倍均值 | LOW |

### 行动护栏

| 参数 | 默认值 |
|------|--------|
| 单次最大调价幅度 | 3% |
| 最低利润率下限 | 15% |
| 调价冷却期 | 6 小时 |
| 每日最大调价次数 | 2 次 |
| 最大预算调幅 | 20% |
| 批量影响上限 | $5,000 |

---

## 定时任务

| 任务 | 调度 | 功能 |
|------|------|------|
| **HourlyAlertJob** | 每小时 | 评估 SKU 指标 → 触发告警 + 推荐 |
| **DailyForecastJob** | 每天 3:00 | 生成需求预测 → 自动补货建议 |
| **GateEvaluationJob** | 每天 4:00 | 评估新品测试 Gate → 自动终止/提醒晋级 |
| **DailySummaryJob** | 每天 2:00 | 升级未处理告警严重级别 |
| **VerificationJob** | 每 2 小时 | 验证已执行行动的效果（T+6h） |

所有任务使用 Redis 分布式锁，支持多实例部署。

---

## 数据库架构

40+ 张表，按领域组织：

- **认证**: company, user, role, permission, role_permission, user_role
- **商品**: store, site, store_site_binding, sku_master, competitor, competitor_snapshot
- **指标**: metric_def, metric_def_version, config_threshold, metric_snapshot
- **事实表**: sales_fact, ads_fact, inventory_fact
- **运营**: alert, recommendation, action, approval, execution, rollback
- **预测**: demand_forecasts, reorder_suggestions
- **新品测试**: product_tests, product_test_gates, product_test_budgets
- **供应链**: suppliers, purchase_orders, purchase_order_items, shipments
- **预算优化**: budget_migrations
- **审计**: audit_log（仅追加，触发器保护）

---

## 系统架构

```
┌──────────────────────────────────────────────────────────────────────┐
│                         AI Commerce War OS                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────────┐   │
│  │  数据层      │──>│  策略层       │──>│  执行层                  │   │
│  │  (导入/事实表 │   │  (规则引擎    │   │  (行动/审批/护栏/验证)    │   │
│  │   指标快照)   │   │   预测模型    │   │                          │   │
│  │              │   │   推荐建议)   │   │                          │   │
│  └─────────────┘   └──────────────┘   └───────────┬─────────────┘   │
│                                                     │                │
│  ┌──────────────────────────────────┐               │                │
│  │  扩展模块                        │               │                │
│  │  ┌──────────┐ ┌──────────┐      │  ┌───────────▼─────────────┐   │
│  │  │ 需求预测  │ │ 新品测试  │      │  │  验证 & 学习             │   │
│  │  │ (指数平滑 │ │ (Gate    │      │  │  (T+1/T+3 指标对比      │   │
│  │  │  移动平均)│ │  System) │      │  │   效果评估)              │   │
│  │  └──────────┘ └──────────┘      │  └─────────────────────────┘   │
│  │  ┌──────────┐ ┌──────────┐      │                                │
│  │  │ 供应链    │ │ 预算迁移  │      │                                │
│  │  │ (采购/   │ │ (ROAS    │      │                                │
│  │  │  物流)   │ │  优化)   │      │                                │
│  │  └──────────┘ └──────────┘      │                                │
│  └──────────────────────────────────┘                                │
│                                                                      │
│  核心闭环: 信号 → 推荐 → 行动 → 验证 → 学习                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 测试

```bash
# 后端单元测试
cd backend && npm test

# 后端 E2E 测试
cd backend && npm run test:e2e

# 前端组件测试
cd frontend && npm test
```

测试覆盖：19 个测试文件，覆盖 Service、规则引擎、护栏、审批策略、验证引擎、指标计算、前端组件。

---

## 路线图

- [x] **V1**: 数据统一、预警引擎、Battle Card、行动中心、护栏、RBAC
- [x] **V2**: 需求预测、新品测试 Gate System、供应链管理、预算迁移
- [ ] **V3**: 自动驾驶（自动定价/竞价/补货）、Playbook 策略库、灰度控制器

---

## 技术亮点

- **规则引擎**: 可插拔 Rule 接口，优先级评估，运行时启停
- **状态机**: Action 9 状态流转，悲观锁保证并发安全
- **护栏系统**: 5 维护栏（调幅/利润率/冷却/限额/批量），可配置阈值
- **多租户隔离**: 所有表含 company_id，CompanyGuard 强制过滤
- **幂等告警**: SHA-256 去重键 + 时间窗口，避免重复告警
- **分布式锁**: Redis 锁保证定时任务单实例执行
- **事件驱动**: EventEmitter 解耦模块通信
- **利润计算**: 完整 COGS 模型（采购价×汇率 + 运费 + 包装 + 平台费）
- **预测模型**: 纯 TypeScript 实现 Holt 指数平滑，无 Python 依赖
- **Gate System**: 可配置门禁标准，自动评估 + 自动终止

---

## License

MIT
