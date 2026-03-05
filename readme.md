# AI Commerce War OS（跨境电商 AI 作战操作系统）— 详细开发文档（全板块）
> 面向研发落地的系统设计与实现说明（V1→V3 逐步演进）  
> 输出：技术栈、开发语言、模块划分、功能实现、数据模型、接口、作业、风控、上线与运维。

---

## 0. 目标与范围

### 0.1 北极星目标
- **决策响应时间**：从“天/周”缩短到“小时级”
- **爆品生命周期**：30 天 → 90 天（V2/V3 更明显）
- **现金流稳定**：缺货率下降、滞销率下降、周转天数下降
- **广告效率**：浪费占比下降，TACOS 更稳，边际利润提升

### 0.2 版本范围
- **V1（可成交闭环）**：数据统一（最小集）+ 预警 + 作战卡 + 行动中心（建议为主，人工执行）
- **V2（强绑定增长）**：新品测试引擎（Gate）+ 广告半自动 + 补货优化升级
- **V3（终局自动驾驶）**：定价/投放/补货自动执行（强护栏、灰度、回滚）+ 打法库推荐

---

## 1. 总体架构

### 1.1 分层架构（推荐）
1) **Data Ingestion（接入层）**：平台/广告/ERP/WMS/竞品数据接入  
2) **Data Platform（数据层）**：ODS/DWD/DWS、指标口径、特征库  
3) **Decision & Strategy（策略层）**：规则/异常检测、优化与模型、建议生成  
4) **Execution（执行层）**：动作编排、审批、限频、灰度、回滚、审计  
5) **Product Apps（应用层）**：War Room、Alerts、Battle Card、Action Center、Settings

### 1.2 关键闭环
**Signal → Recommendation → Action → Verification → Learning**
- Signal：小时级/日级数据刷新 + 异常检测
- Recommendation：证据链解释 + 收益/风险评估
- Action：任务化 + 审批/执行/记录（V1 人工；V2 半自动；V3 自动）
- Verification：T+1、T+3 指标对比
- Learning：沉淀到打法库/阈值调优（V2+）

---

## 2. 技术栈与开发语言（推荐方案）

> 目标：ToB 可用、可扩展、数据驱动、可审计、可灰度、可回滚

### 2.1 后端（API & 业务）
- **语言**：TypeScript（Node.js）或 Python（FastAPI）二选一
  - 推荐：**TypeScript + NestJS**（工程化、模块化、权限/DI友好）
  - 若团队偏数据/算法：**Python + FastAPI**（更贴近模型/ETL）
- **框架**：NestJS / FastAPI
- **API**：REST（V1）+ Webhook（异步回调）+ 事件总线（V2+）

### 2.2 前端（Web 控制台）
- **语言**：TypeScript
- **框架**：React + Next.js
- **组件库**：Ant Design / Mantine / shadcn/ui（二选一）
- **图表**：ECharts 或 Recharts
- **状态管理**：React Query + Zustand/Redux（按复杂度）

### 2.3 数据平台与存储
- **OLTP**（业务库）：PostgreSQL（强一致、复杂查询、JSON字段）
- **OLAP**（分析）：ClickHouse / BigQuery / Snowflake（按成本与团队）
- **缓存**：Redis（热点指标、会话、幂等、锁）
- **对象存储**：S3/OSS（原始报表、导入文件、截图、日志归档）
- **消息队列**：Kafka / Pulsar / RabbitMQ（V2+ 推荐）

### 2.4 任务调度与ETL
- V1：Cron + Worker（轻量）  
- V2+：Airflow / Dagster（可观测、可重跑）

### 2.5 机器学习与规则
- V1：规则引擎（可配置阈值）+ 简单统计
- V2：需求预测、边际效益模型、起量曲线识别
- V3：自动执行策略、在线学习/AB、打法库推荐
- **模型服务**：Python（sklearn/lightgbm/prophet）+ FastAPI / BentoML（可选）

### 2.6 DevOps & Observability
- **容器**：Docker
- **编排**：Kubernetes（或 ECS/Cloud Run 起步）
- **CI/CD**：GitHub Actions / GitLab CI
- **日志**：ELK / OpenSearch
- **指标**：Prometheus + Grafana
- **链路追踪**：OpenTelemetry + Jaeger

---

## 3. 模块划分（全板块）

### 3.1 M0 数据底座与指标口径（必选）
**目标**：统一账本、统一口径、可审计

功能实现：
- 数据接入配置（店铺、站点、广告授权）
- 主数据映射：SKU/ASIN/店铺/站点/变体
- 指标口径版本化：利润/成本/广告分摊规则（可变更、可追溯）
- 对账页：与平台/广告报表关键数字对齐（上线门槛）

关键技术点：
- 口径变更必须写入 `metric_def_version` 表
- 所有指标计算要携带 `metric_version_id`
- 关键指标快照写入 `metric_snapshot` 供审计与证据链

### 3.2 M1 市场与竞品情报雷达（必选）
**目标**：更早捕捉竞品动作（降价/起量/抢位）

功能实现：
- 竞品列表维护（手动录入/半自动发现）
- 竞品快照入库（小时/日）
- 威胁评分（规则/统计）
- 预警触发（竞品降价、rank变化、review增长异常）

注意：竞品数据获取要优先合规渠道；不稳定来源要降级，不进入自动执行闭环。

### 3.3 M2 机会池与选品立项（必选）
**目标**：选品工程化、可排序、可复盘

功能实现：
- 机会池：评分权重配置（市场容量/竞争密度/利润空间/风险）
- 成本-利润测算器（可配置成本项）
- 立项单：目标、预算、周期、负责人、风险标签
- 与测试引擎联动（V2）：立项→自动生成测试计划

### 3.4 M3 新品测试引擎（V2）
**目标**：把“试错”变成“实验系统”

功能实现：
- 测试计划生成：预算上限、周期、Gate 指标（曝光/点击/转化/利润）
- 素材/Listing 版本管理
- A/B 测试：版本对比、显著性（可后置）
- 自动扩量/止损（半自动→自动）

### 3.5 M4 广告与增长优化（必选：V1做建议）
**目标**：利润导向投放，降低浪费

功能实现：
- 广告结构解析：Campaign/AdGroup/Keyword/Target
- 浪费检测：高花费低转化、ACOS异常持续
- 建议生成：否词、暂停、降预算、扩词、调整匹配
- V2：预算迁移半自动；V3：自动出价/预算（强护栏）

### 3.6 M5 定价与对抗策略（必选：V1做建议）
**目标**：策略化价格战（可控、可撤退）

功能实现：
- 价格监控：自家价格与竞品价格
- 策略模板：守利润/抢位/闪电跟价/清仓
- 底线护栏：最低毛利、最大降幅、冷却时间、日内次数限制
- V3：自动改价（审批/灰度/回滚必备）

### 3.7 M6 库存与补货优化（必选：V1做预警+建议）
**目标**：降低缺货与滞销，稳定现金流

功能实现：
- days_of_cover：可售/近7天均销
- 缺货预警：<7天（默认）/ <3天（高危）
- 补货建议：预测需求 × 交期安全系数（V1简化）
- 滞销预警：库存天数过高 + 销量下滑（规则/统计）
- V2：需求预测模型；V3：补货执行器对接ERP（审批）

### 3.8 M7 供应链与采购协同（V2+）
功能实现：
- 供应商档案与评分（交期/质量/响应/成本）
- 三段式采购策略：小单快反→中单扩量→大货压价
- 交期风险预测与备选方案

### 3.9 M8 风控与审计（必选）
**目标**：让客户敢用（ToB 生死线）

功能实现：
- RBAC + 数据域隔离（Company/Store/Site/SKU）
- 审批流：高风险动作必须审批
- 灰度：按店铺/站点/SKU小流量试运行
- 回滚：动作可回滚到上一个稳定版本
- 审计日志不可篡改（append-only）

### 3.10 M9 打法库与自治学习（V3）
功能实现：
- 将“动作→结果”结构化沉淀为策略参数包
- 类目/阶段推荐策略模板
- 在线A/B与策略评估（可后置）

---

## 4. 数据模型（核心表与字段）

### 4.1 OLTP（PostgreSQL）建议表
- `company`, `user`, `role`, `permission`, `user_role`
- `store`, `site`, `store_site_binding`
- `sku_master`（sku_id、asin、store_id、site_id、cost_unit、lead_time_days、status…）
- `competitor`（竞品映射）、`competitor_snapshot`
- `metric_def`（指标定义）、`metric_def_version`（口径版本）
- `alert`（预警）、`recommendation`（建议）
- `action`（动作单）、`approval`（审批）、`execution`（执行记录）、`rollback`（回滚记录）
- `audit_log`（不可篡改审计）
- `config_threshold`（阈值配置：缺货/浪费/降价等）

### 4.2 OLAP（ClickHouse/BigQuery）建议表
- `sales_fact_hourly`, `sales_fact_daily`
- `ads_fact_hourly`, `ads_fact_daily`
- `inventory_fact_hourly`, `inventory_fact_daily`
- `competitor_snapshot_hourly`
- `metric_snapshot_hourly`（证据链快照）

### 4.3 关键计算字段
- `days_of_cover = available / avg_daily_units(7d)`
- `tacos = ads_spend / total_sales`
- `waste_score`：基于 spend、orders、acos持续时长的打分
- `threat_score`：基于竞品降价幅度、rank变化、review增长的打分

---

## 5. 核心服务与实现细节（后端）

### 5.1 服务拆分（建议从单体模块化起步）
V1 推荐 **模块化单体**（同一 repo，按 domain 分包），降低复杂度：
- `auth-service`（JWT/OAuth、RBAC）
- `data-service`（接入配置、主数据映射、口径管理）
- `metrics-service`（指标计算/聚合、快照）
- `alert-service`（规则引擎、异常检测）
- `recommendation-service`（建议生成、证据链）
- `action-service`（动作、审批、执行记录、验证）
- `ui-api`（BFF，给前端聚合接口）

V2+ 可按压力拆成微服务，并引入消息队列。

### 5.2 规则引擎（V1）
实现方式：
- 阈值配置表 `config_threshold`
- 每小时批处理/流式处理：
  1) 拉取最新指标聚合（OLAP）
  2) 按规则计算触发条件
  3) 写入 `alert`（幂等：同类型同SKU同窗口不重复）
  4) 同步生成 `recommendation`（可选，或延迟生成）

幂等建议：
- `dedupe_key = hash(type + sku_id + window_start + window_end + version)`  
- 写入时用唯一索引避免重复

### 5.3 建议生成（Recommendation）
每条建议必须包含：
- `rationale`（证据链摘要）
- `evidence_json`（指标快照引用：metric_snapshot_id列表）
- `expected_gain`（V1可为空或粗估）
- `risk_level`（low/med/high）
- `suggested_actions`（动作草案列表：type+params+guardrails）

### 5.4 动作系统（Action/Approval/Execution）
#### 状态机
`draft → submitted → (approved|rejected) → executed → verified → closed`  
失败路径：`executed_failed → retry/closed`  
回滚路径：`executed → rolled_back → verified`

#### 护栏（guardrails）示例
- 改价：`max_delta_pct=3%`、`min_margin_floor`、`cooldown_hours=6`、`max_changes_per_day=2`
- 预算：`max_delta_pct=20%`、`cooldown_hours=3`
- 批量动作：总影响金额上限

#### 审批策略
- 根据 `risk_score` 或动作类型/幅度自动判定 `requires_approval`
- 审批链支持：`approver_role` + `store/site` 绑定

### 5.5 验证服务（T+1/T+3）
- 定时任务扫描 `executed` 且未验证的 action
- 拉取执行前后窗口的指标
- 写入 `verification_result`（可内置到 execution 表）
- 输出：收益/副作用/是否建议回滚

---

## 6. 前端实现（页面与组件）

### 6.1 页面清单（V1）
- War Room（总览）
- Alerts（列表/详情）
- SKUs（列表+筛选）
- Battle Card（SKU详情）
- Action Center（动作队列/详情/审批）
- Settings（接入/口径/阈值/权限）

### 6.2 关键组件
- KPI 卡片组件（可复用）
- 风险热力图（站点/类目）
- 证据链组件（指标快照对比）
- 动作编辑器（参数+护栏）
- 审批面板（审批记录、意见、附件）
- 指标对账视图（V1上线门槛）

---

## 7. API 设计（REST 示例）

### 7.1 Auth & RBAC
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/roles`
- `POST /api/users/{id}/roles`

### 7.2 Master Data
- `GET /api/stores`
- `GET /api/sites`
- `GET /api/skus?storeId=&siteId=&filters=&sort=&page=`
- `GET /api/skus/{skuId}`

### 7.3 Metrics & Snapshots
- `GET /api/metrics/war-room?storeId=&siteId=&window=24h`
- `GET /api/metrics/sku/{skuId}?window=7d`
- `GET /api/metrics/snapshots/{snapshotId}`

### 7.4 Alerts & Recommendations
- `GET /api/alerts?type=&severity=&status=&page=`
- `GET /api/alerts/{alertId}`
- `POST /api/alerts/{alertId}/ack`
- `POST /api/alerts/{alertId}/close`
- `GET /api/recommendations?skuId=&status=`
- `POST /api/recommendations/{recId}/accept`
- `POST /api/recommendations/{recId}/reject`

### 7.5 Actions & Approvals
- `POST /api/actions`
- `GET /api/actions?status=&risk=&page=`
- `GET /api/actions/{actionId}`
- `POST /api/actions/{actionId}/submit`
- `POST /api/actions/{actionId}/approve`
- `POST /api/actions/{actionId}/reject`
- `POST /api/actions/{actionId}/mark-executed`
- `POST /api/actions/{actionId}/rollback`
- `GET /api/actions/{actionId}/verification`

### 7.6 Settings
- `GET /api/settings/thresholds`
- `PUT /api/settings/thresholds`
- `GET /api/settings/metric-definitions`
- `POST /api/settings/metric-definitions/version`

---

## 8. 数据接入与作业（Ingestion / ETL）

### 8.1 接入策略
- 先做“读”闭环：销售/广告/库存/成本  
- 所有接入必须：断点续传、幂等写入、限流与重试

### 8.2 作业类型
- Hourly：指标聚合、预警检测、建议刷新
- Daily：日级汇总、对账、报告生成
- Backfill：补历史数据（手动触发）

### 8.3 失败与补偿
- 每个 job 必须记录：`job_run_id、window、status、error、retries`
- 支持重跑：同窗口可重跑并幂等覆盖

---

## 9. 安全、合规、风控（强制）

### 9.1 多租户隔离
- 所有表必须包含 `company_id`
- ORM 层强制注入 company 过滤
- 数据出入库必须审计

### 9.2 审计日志（append-only）
记录：登录、权限变更、阈值变更、口径版本变更、动作审批/执行/回滚

### 9.3 自动执行护栏（V2+）
- 上下限、冷却时间、限频、影响金额上限
- 灰度逐步放开
- 回滚与全局 Kill Switch

### 9.4 竞品数据合规
- 合规渠道优先；高风险采集仅用于提示，不得驱动自动执行

---

## 10. 可观测性与运维

### 10.1 监控指标
- 数据延迟、预警延迟、任务失败率
- 动作失败率、回滚率
- API错误率、队列堆积

### 10.2 链路追踪
- 统一 request_id/trace_id
- 动作链路可回放（alert→rec→action→verify）

---

## 11. CI/CD 与环境

### 11.1 环境
- dev / staging / prod（staging需接近真实数据量）

### 11.2 发布
- 后端滚动/蓝绿
- 前端静态资源版本化 + 回滚
- DB migration 版本化（Flyway/Liquibase/Prisma）

---

## 12. 开发计划（建议）
- Sprint 0：数据模型、RBAC、口径、原型、脚手架
- Sprint 1：War Room + SKU列表 + Battle Card骨架（mock）
- Sprint 2：Alerts + Recommendation + Action Center闭环
- Sprint 3：最小数据接入对齐 + 对账页 + T+1验证
- Sprint 4：阈值可配置 + 审批完善 + 试点上线

---

## 13. 附录：关键实现样例（伪代码）

### 13.1 缺货预警（V1）
```pseudo
avg7 = avg(units) over last 7 days
doc = available / max(avg7, 0.1)
if doc < threshold_days and avg7 > 0:
  upsert alert(type=STOCKOUT, sku_id, severity=doc<3?HIGH:MED, evidence={available, avg7, doc})
  create recommendation with suggested_action = "create_reorder_task"
```

### 13.2 广告浪费预警（V1）
```pseudo
window = last 24h
if spend > S and orders == 0:
  alert(ADS_WASTE, evidence={spend, orders, clicks, impressions})
  recommend actions: pause_adgroup OR add_negative_keywords
```

### 13.3 动作审批判定
```pseudo
risk = base_risk(action_type)
risk += delta_pct > limit ? 2 : 0
risk += estimated_impact_usd > cap ? 2 : 0
requires_approval = risk >= 3
```
