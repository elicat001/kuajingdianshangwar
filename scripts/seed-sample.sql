-- =============================================================
-- AI 电商作战系统 - 样例数据（中文版）
-- 匹配 TypeORM 创建的实际数据库表结构
-- =============================================================

-- 临时禁用审计日志触发器
ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_no_update;

DO $$
DECLARE
  v_company_id VARCHAR;
  v_user_id    VARCHAR;
  -- 店铺
  v_store1 UUID := gen_random_uuid();
  v_store2 UUID := gen_random_uuid();
  -- 站点
  v_site1  UUID := gen_random_uuid();
  v_site2  UUID := gen_random_uuid();
  -- SKU商品
  v_sku1 UUID := gen_random_uuid();
  v_sku2 UUID := gen_random_uuid();
  v_sku3 UUID := gen_random_uuid();
  v_sku4 UUID := gen_random_uuid();
  v_sku5 UUID := gen_random_uuid();
  v_sku6 UUID := gen_random_uuid();
  v_sku7 UUID := gen_random_uuid();
  v_sku8 UUID := gen_random_uuid();
  v_sku9 UUID := gen_random_uuid();
  v_sku10 UUID := gen_random_uuid();
  -- 竞品
  v_comp1 UUID := gen_random_uuid();
  v_comp2 UUID := gen_random_uuid();
  v_comp3 UUID := gen_random_uuid();
  v_comp4 UUID := gen_random_uuid();
  v_comp5 UUID := gen_random_uuid();
  -- 告警
  v_alert1 UUID := gen_random_uuid();
  v_alert2 UUID := gen_random_uuid();
  v_alert3 UUID := gen_random_uuid();
  v_alert4 UUID := gen_random_uuid();
  v_alert5 UUID := gen_random_uuid();
  v_alert6 UUID := gen_random_uuid();
  v_alert7 UUID := gen_random_uuid();
  -- AI推荐
  v_rec1 UUID := gen_random_uuid();
  v_rec2 UUID := gen_random_uuid();
  v_rec3 UUID := gen_random_uuid();
  v_rec4 UUID := gen_random_uuid();
  v_rec5 UUID := gen_random_uuid();
  -- 执行动作
  v_act1 UUID := gen_random_uuid();
  v_act2 UUID := gen_random_uuid();
  v_act3 UUID := gen_random_uuid();
  v_act4 UUID := gen_random_uuid();
  v_act5 UUID := gen_random_uuid();
  v_act6 UUID := gen_random_uuid();
  -- 绑定
  v_bind1 UUID := gen_random_uuid();
  v_bind2 UUID := gen_random_uuid();
  -- 循环变量
  i INT;
  v_date DATE;
BEGIN
  -- 获取已有的公司和用户
  SELECT company_id, id::VARCHAR INTO v_company_id, v_user_id
    FROM users LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION '未找到用户，请先注册一个用户账号。';
  END IF;

  RAISE NOTICE '使用 company_id=% user_id=%', v_company_id, v_user_id;

  -- ─── 店铺 ──────────────────────────────────────────────────
  INSERT INTO stores (id, company_id, name, platform, seller_id, status, credentials)
  VALUES
    (v_store1, v_company_id, '北美主力店铺',   'Amazon', 'A1B2C3D4E5', 'ACTIVE', '{"marketplace":"US","token":"***"}'),
    (v_store2, v_company_id, '欧洲德国站店铺', 'Amazon', 'F6G7H8I9J0', 'ACTIVE', '{"marketplace":"DE","token":"***"}')
  ON CONFLICT DO NOTHING;

  -- ─── 站点 ──────────────────────────────────────────────────
  INSERT INTO sites (id, company_id, name, marketplace_code, region, currency, timezone)
  VALUES
    (v_site1, v_company_id, '亚马逊美国站', 'ATVPDKIKX0DER',  'NA', 'USD', 'America/New_York'),
    (v_site2, v_company_id, '亚马逊德国站', 'A1PA6795UKMFR9', 'EU', 'EUR', 'Europe/Berlin')
  ON CONFLICT DO NOTHING;

  -- ─── 店铺-站点绑定 ─────────────────────────────────────────
  INSERT INTO store_site_bindings (id, company_id, store_id, site_id, active)
  VALUES
    (v_bind1, v_company_id, v_store1, v_site1, true),
    (v_bind2, v_company_id, v_store2, v_site2, true)
  ON CONFLICT DO NOTHING;

  -- ─── SKU 商品主数据 ────────────────────────────────────────
  INSERT INTO sku_master (id, company_id, sku, asin, title, category, brand, price, cost, status, store_id, site_id, image_url, attributes)
  VALUES
    (v_sku1,  v_company_id, 'SKU-US-001', 'B0AAAAAA01', '无线蓝牙耳机Pro降噪版',           '电子产品',    '声浪科技',  49.99,  18.50, 'ACTIVE',   v_store1, v_site1, NULL, '{"颜色":"黑色","重量_克":45,"防水等级":"IPX5"}'),
    (v_sku2,  v_company_id, 'SKU-US-002', 'B0AAAAAA02', 'USB-C快充数据线3条装',             '电子产品',    '闪充达人',  15.99,   4.20, 'ACTIVE',   v_store1, v_site1, NULL, '{"长度_英尺":6,"颜色":"白色","功率":"60W"}'),
    (v_sku3,  v_company_id, 'SKU-US-003', 'B0AAAAAA03', '硅胶厨房用具12件套',              '家居厨房',    '煮易',     29.99,  10.00, 'ACTIVE',   v_store1, v_site1, NULL, '{"材质":"食品级硅胶","件数":12,"耐温":"230度"}'),
    (v_sku4,  v_company_id, 'SKU-US-004', 'B0AAAAAA04', '防滑瑜伽垫6mm加厚款',             '运动户外',    '柔韧达人',  24.99,   8.50, 'ACTIVE',   v_store1, v_site1, NULL, '{"厚度_mm":6,"颜色":"紫色","材质":"TPE"}'),
    (v_sku5,  v_company_id, 'SKU-US-005', 'B0AAAAAA05', 'LED护眼台灯可调光色温',            '家居厨房',    '明亮生活',  35.99,  12.00, 'ACTIVE',   v_store1, v_site1, NULL, '{"功率_瓦":12,"色温":"可调节3000-6500K"}'),
    (v_sku6,  v_company_id, 'SKU-DE-001', 'B0BBBBBB01', '无线蓝牙耳机Pro（欧洲版）',        '电子产品',    '声浪科技',  45.99,  18.50, 'ACTIVE',   v_store2, v_site2, NULL, '{"颜色":"黑色","重量_克":45,"认证":"CE"}'),
    (v_sku7,  v_company_id, 'SKU-DE-002', 'B0BBBBBB02', 'USB-C快充线3条装（欧规）',          '电子产品',    '闪充达人',  13.99,   4.20, 'ACTIVE',   v_store2, v_site2, NULL, '{"长度_米":2,"颜色":"白色","认证":"CE"}'),
    (v_sku8,  v_company_id, 'SKU-US-006', 'B0AAAAAA06', '不锈钢保温水杯750ml',             '运动户外',    '饮途',     19.99,   6.00, 'ACTIVE',   v_store1, v_site1, NULL, '{"容量_ml":750,"保温":"真空双层","材质":"304不锈钢"}'),
    (v_sku9,  v_company_id, 'SKU-US-007', 'B0AAAAAA07', '竹制砧板三件套',                  '家居厨房',    '自然切割',  22.99,   7.50, 'INACTIVE', v_store1, v_site1, NULL, '{"件数":3,"材质":"天然竹","工艺":"整竹压制"}'),
    (v_sku10, v_company_id, 'SKU-US-008', 'B0AAAAAA08', '铝合金可折叠手机支架',             '电子产品',    '桌面专家',  16.99,   5.00, 'ACTIVE',   v_store1, v_site1, NULL, '{"材质":"航空铝合金","可折叠":true,"适配":"4-12.9寸"}')
  ON CONFLICT DO NOTHING;

  -- ─── 竞品 ──────────────────────────────────────────────────
  INSERT INTO competitors (id, company_id, name, asin, sku_id, platform, product_url, metadata)
  VALUES
    (v_comp1, v_company_id, '对手蓝牙耳机X1',     'B0CCCCCC01', v_sku1::text, 'Amazon', 'https://amazon.com/dp/B0CCCCCC01', '{"卖家":"竞声科技","月销量":2500}'),
    (v_comp2, v_company_id, '极速充电线旗舰版',    'B0CCCCCC02', v_sku2::text, 'Amazon', 'https://amazon.com/dp/B0CCCCCC02', '{"卖家":"线缆世界","月销量":5000}'),
    (v_comp3, v_company_id, '专业厨具套装16件',    'B0CCCCCC03', v_sku3::text, 'Amazon', 'https://amazon.com/dp/B0CCCCCC03', '{"卖家":"厨房大师","月销量":1800}'),
    (v_comp4, v_company_id, '禅意瑜伽垫高端款',    'B0CCCCCC04', v_sku4::text, 'Amazon', 'https://amazon.com/dp/B0CCCCCC04', '{"卖家":"瑜伽生活","月销量":1200}'),
    (v_comp5, v_company_id, '智能LED办公台灯',     'B0CCCCCC05', v_sku5::text, 'Amazon', 'https://amazon.com/dp/B0CCCCCC05', '{"卖家":"光之王","月销量":900}')
  ON CONFLICT DO NOTHING;

  -- ─── 竞品快照（最近7天） ───────────────────────────────────
  FOR i IN 0..6 LOOP
    v_date := CURRENT_DATE - i;
    INSERT INTO competitor_snapshots (id, company_id, competitor_id, price, rating, review_count, rank, is_in_stock, snapshot_at, extra)
    VALUES
      (gen_random_uuid(), v_company_id, v_comp1, 44.99 + (random()*5)::numeric(4,2),  4.2 + (random()*0.5)::numeric(3,2), 1200 + (random()*100)::int, 15 + (random()*10)::int, true,  v_date + TIME '10:00', NULL),
      (gen_random_uuid(), v_company_id, v_comp2, 12.99 + (random()*3)::numeric(4,2),  4.0 + (random()*0.8)::numeric(3,2), 800  + (random()*50)::int,  25 + (random()*15)::int, true,  v_date + TIME '10:00', NULL),
      (gen_random_uuid(), v_company_id, v_comp3, 26.99 + (random()*4)::numeric(4,2),  4.3 + (random()*0.4)::numeric(3,2), 650  + (random()*80)::int,  10 + (random()*8)::int,  true,  v_date + TIME '10:00', NULL),
      (gen_random_uuid(), v_company_id, v_comp4, 22.99 + (random()*3)::numeric(4,2),  4.5 + (random()*0.3)::numeric(3,2), 430  + (random()*40)::int,  20 + (random()*12)::int, true,  v_date + TIME '10:00', NULL),
      (gen_random_uuid(), v_company_id, v_comp5, 32.99 + (random()*5)::numeric(4,2),  3.9 + (random()*0.6)::numeric(3,2), 350  + (random()*60)::int,  30 + (random()*20)::int, true,  v_date + TIME '10:00', NULL);
  END LOOP;

  -- ─── 告警 ──────────────────────────────────────────────────
  INSERT INTO alerts (id, company_id, type, severity, status, sku_id, store_id, site_id, title, message, evidence_json, dedupe_key, window_start, window_end)
  VALUES
    (v_alert1, v_company_id, 'COMPETITOR_PRICE_DROP', 'HIGH',     'OPEN',         v_sku1::text, v_store1::text, v_site1::text,
      '竞品耳机大幅降价',
      '对手蓝牙耳机X1降价15%至$42.99，已低于我方售价',
      '{"竞品":"对手蓝牙耳机X1","原价":50.99,"现价":42.99,"降幅":"15%"}',
      'CPD-' || v_sku1, NOW() - INTERVAL '2 hours', NOW()),

    (v_alert2, v_company_id, 'ACOS_ANOMALY', 'CRITICAL', 'OPEN', v_sku2::text, v_store1::text, v_site1::text,
      'USB-C数据线ACOS飙升异常',
      '过去24小时ACOS从22%飙升至48%，远超目标值35%',
      '{"ACOS_之前":22,"ACOS_之后":48,"阈值":35,"异常广告组":"broad-match"}',
      'ACOS-' || v_sku2, NOW() - INTERVAL '24 hours', NOW()),

    (v_alert3, v_company_id, 'STOCKOUT', 'CRITICAL', 'ACKNOWLEDGED', v_sku3::text, v_store1::text, v_site1::text,
      '厨房用具套装即将断货',
      '当前仅剩12件库存，按日均4件速度预计3天后断货',
      '{"当前库存":12,"日均销量":4,"预计剩余天数":3,"补货周期_天":14}',
      'SO-' || v_sku3, NOW() - INTERVAL '6 hours', NOW()),

    (v_alert4, v_company_id, 'RANK_CHANGE', 'MEDIUM', 'OPEN', v_sku4::text, v_store1::text, v_site1::text,
      '瑜伽垫自然排名大幅下降',
      '主关键词"yoga mat 6mm"自然排名从第8位跌至第23位',
      '{"关键词":"yoga mat 6mm","原排名":8,"现排名":23,"变化":-15}',
      'RC-' || v_sku4, NOW() - INTERVAL '12 hours', NOW()),

    (v_alert5, v_company_id, 'ADS_WASTE', 'HIGH', 'OPEN', v_sku5::text, v_store1::text, v_site1::text,
      'LED台灯广告严重浪费',
      '广告活动LED-AUTO-01今日花费$156却零转化',
      '{"广告活动":"LED-AUTO-01","花费":156,"转化数":0,"点击数":89}',
      'AW-' || v_sku5, NOW() - INTERVAL '8 hours', NOW()),

    (v_alert6, v_company_id, 'MARGIN_BREACH', 'HIGH', 'CLOSED', v_sku6::text, v_store2::text, v_site2::text,
      '德国站耳机利润率跌破阈值',
      '净利润率降至8.2%，低于15%的最低阈值，主因汇率波动',
      '{"当前利润率":8.2,"阈值":15,"原因":"欧元汇率下跌3.5%"}',
      'MB-' || v_sku6, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),

    (v_alert7, v_company_id, 'REVIEW_ANOMALY', 'LOW', 'OPEN', v_sku8::text, v_store1::text, v_site1::text,
      '保温水杯差评突增',
      '过去24小时内收到3条一星差评，均提及"漏水"问题',
      '{"新增一星":3,"时间范围_小时":24,"关键词":"漏水","总评分":4.1}',
      'RA-' || v_sku8, NOW() - INTERVAL '24 hours', NOW())
  ON CONFLICT DO NOTHING;

  -- ─── AI 推荐 ───────────────────────────────────────────────
  INSERT INTO recommendations (id, company_id, alert_id, sku_id, rationale, evidence_json, expected_gain, risk_level, suggested_actions, status)
  VALUES
    (v_rec1, v_company_id, v_alert1, v_sku1::text,
      '建议跟进竞品降价以维持市场份额。对手蓝牙耳机X1已降至$42.99，比我方低14%。根据价格弹性模型，降价$5预计可提升周销量35件。',
      '{"价格弹性":-1.8,"预估销量提升":35,"竞品价格":42.99}',
      1250.00, 'MEDIUM',
      '[{"type":"ADJUST_PRICE","params":{"new_price":44.99,"reason":"竞品跟价"}}]',
      'PENDING'),

    (v_rec2, v_company_id, v_alert2, v_sku2::text,
      '建议暂停高ACOS广告组并添加否定关键词。当前ACOS 48%远超目标25%，主要浪费来自"usb cable cheap"和"free cable"等低质流量。',
      '{"浪费关键词":["usb cable cheap","free cable"],"浪费金额":89.50,"建议否定词":["cheap","free","便宜"]}',
      890.00, 'LOW',
      '[{"type":"PAUSE_ADGROUP","params":{"campaign":"USB-C-AUTO-02","adgroup":"broad-match"}},{"type":"ADD_NEGATIVE_KEYWORD","params":{"keywords":["cheap","free"]}}]',
      'ACCEPTED'),

    (v_rec3, v_company_id, v_alert3, v_sku3::text,
      '建议立即创建紧急补货单。当前日均销量4件，库存仅剩12件，约3天后断货。供应商备货周期14天，建议加急空运200件。',
      '{"供应商交期_天":14,"建议补货数量":200,"加急费用预估":450,"断货损失预估_每天":120}',
      3500.00, 'HIGH',
      '[{"type":"CREATE_REORDER","params":{"qty":200,"expedite":true,"reason":"紧急补货防断货"}}]',
      'ACCEPTED'),

    (v_rec4, v_company_id, v_alert4, v_sku4::text,
      '建议提高主关键词出价并扩展相关关键词以恢复自然排名。"yoga mat 6mm"排名下跌15位，需通过广告拉动销量来提升自然排名。',
      '{"关键词":"yoga mat 6mm","建议出价":1.85,"扩展词":["yoga mat thick","exercise mat"],"预计7天恢复排名":true}',
      450.00, 'LOW',
      '[{"type":"ADJUST_BID","params":{"keyword":"yoga mat 6mm","new_bid":1.85}},{"type":"EXPAND_KEYWORDS","params":{"keywords":["yoga mat thick","exercise mat"]}}]',
      'PENDING'),

    (v_rec5, v_company_id, v_alert5, v_sku5::text,
      '建议暂停浪费严重的广告活动，将预算转移至表现好的手动广告活动。LED-AUTO-01日均浪费$156，而LED-MANUAL-01的ACOS仅18%。',
      '{"广告活动":"LED-AUTO-01","日均浪费":156,"手动广告ACOS":18}',
      4680.00, 'LOW',
      '[{"type":"PAUSE_ADGROUP","params":{"campaign":"LED-AUTO-01"}},{"type":"ADJUST_BUDGET","params":{"campaign":"LED-MANUAL-01","increase_pct":20}}]',
      'PENDING')
  ON CONFLICT DO NOTHING;

  -- ─── 执行动作（覆盖各状态） ────────────────────────────────
  INSERT INTO actions (id, company_id, recommendation_id, type, status, params, guardrails, risk_score, requires_approval, sku_id, store_id, site_id, created_by, executed_at, verification_result)
  VALUES
    -- 草稿
    (v_act1, v_company_id, v_rec1::text, 'ADJUST_PRICE', 'DRAFT',
      '{"new_price":44.99,"old_price":49.99,"reason":"竞品跟价"}',
      '{"最大调价幅度_百分比":15,"最低利润率_百分比":20}',
      35.00, true, v_sku1::text, v_store1::text, v_site1::text, v_user_id, NULL, NULL),

    -- 已提交待审批
    (v_act2, v_company_id, v_rec2::text, 'PAUSE_ADGROUP', 'SUBMITTED',
      '{"campaign":"USB-C-AUTO-02","adgroup":"broad-match","reason":"ACOS超标暂停"}',
      '{"暂停前最低曝光量":1000}',
      15.00, true, v_sku2::text, v_store1::text, v_site1::text, v_user_id, NULL, NULL),

    -- 已批准待执行
    (v_act3, v_company_id, v_rec3::text, 'CREATE_REORDER', 'APPROVED',
      '{"qty":200,"expedite":true,"supplier":"深圳主力供应商","reason":"紧急补货"}',
      '{"最大补货金额":10000}',
      55.00, true, v_sku3::text, v_store1::text, v_site1::text, v_user_id, NULL, NULL),

    -- 已执行待验证
    (v_act4, v_company_id, v_rec4::text, 'ADJUST_BID', 'EXECUTED',
      '{"keyword":"yoga mat 6mm","old_bid":1.20,"new_bid":1.85,"reason":"恢复排名"}',
      '{"最高出价":3.00,"日预算上限":50}',
      20.00, false, v_sku4::text, v_store1::text, v_site1::text, v_user_id, NOW() - INTERVAL '1 day', NULL),

    -- 已验证
    (v_act5, v_company_id, v_rec5::text, 'PAUSE_ADGROUP', 'VERIFIED',
      '{"campaign":"LED-AUTO-01","reason":"零转化广告暂停"}',
      '{"暂停前最低曝光量":500}',
      10.00, false, v_sku5::text, v_store1::text, v_site1::text, v_user_id, NOW() - INTERVAL '3 days',
      '{"节省金额":312.00,"状态":"正向验证","验证说明":"暂停后3天节省$312广告费，未影响自然销量"}'),

    -- 已关闭
    (v_act6, v_company_id, NULL, 'ADD_NEGATIVE_KEYWORD', 'CLOSED',
      '{"keywords":["cheap","free"],"campaign":"USB-C-AUTO-02","reason":"过滤低质流量"}',
      '{}',
      5.00, false, v_sku2::text, v_store1::text, v_site1::text, v_user_id, NOW() - INTERVAL '5 days',
      '{"屏蔽曝光数":1450,"节省花费":67.30,"验证说明":"添加否定词后ACOS下降12个百分点"}')
  ON CONFLICT DO NOTHING;

  -- ─── 审批记录 ──────────────────────────────────────────────
  INSERT INTO approvals (id, company_id, action_id, approver_user_id, decision, comment, decided_at)
  VALUES
    (gen_random_uuid(), v_company_id, v_act3, v_user_id, 'APPROVED', '紧急补货批准，走空运加急通道。', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), v_company_id, v_act5, v_user_id, 'APPROVED', '该广告活动明显浪费预算，同意暂停。', NOW() - INTERVAL '4 days')
  ON CONFLICT DO NOTHING;

  -- ─── 执行记录 ──────────────────────────────────────────────
  INSERT INTO executions (id, company_id, action_id, executed_by, result, error, executed_at)
  VALUES
    (gen_random_uuid(), v_company_id, v_act4, v_user_id, '{"api响应":"出价已更新","新出价":1.85}', NULL, NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), v_company_id, v_act5, v_user_id, '{"api响应":"广告组已暂停","广告活动":"LED-AUTO-01"}', NULL, NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), v_company_id, v_act6, v_user_id, '{"api响应":"否定关键词已添加","数量":2}', NULL, NOW() - INTERVAL '5 days')
  ON CONFLICT DO NOTHING;

  -- ─── 销售数据（14天） ──────────────────────────────────────
  FOR i IN 0..13 LOOP
    v_date := CURRENT_DATE - i;
    INSERT INTO sales_facts (id, company_id, sku_id, store_id, site_id, report_date, units_ordered, units_shipped, ordered_revenue, shipped_revenue, sessions, conversion_rate)
    VALUES
      (gen_random_uuid(), v_company_id, v_sku1::text, v_store1::text, v_site1::text, v_date, 15 + (random()*20)::int, 12 + (random()*18)::int, 750 + (random()*500)::numeric(8,2),  600 + (random()*450)::numeric(8,2),  800 + (random()*400)::int,  (5 + random()*8)::numeric(6,4)),
      (gen_random_uuid(), v_company_id, v_sku2::text, v_store1::text, v_site1::text, v_date, 30 + (random()*40)::int, 28 + (random()*35)::int, 480 + (random()*320)::numeric(8,2),  450 + (random()*300)::numeric(8,2),  1200 + (random()*600)::int, (8 + random()*7)::numeric(6,4)),
      (gen_random_uuid(), v_company_id, v_sku3::text, v_store1::text, v_site1::text, v_date, 8  + (random()*12)::int, 6  + (random()*10)::int, 240 + (random()*200)::numeric(8,2),  180 + (random()*180)::numeric(8,2),  500 + (random()*300)::int,  (3 + random()*5)::numeric(6,4)),
      (gen_random_uuid(), v_company_id, v_sku4::text, v_store1::text, v_site1::text, v_date, 10 + (random()*15)::int, 8  + (random()*12)::int, 250 + (random()*200)::numeric(8,2),  200 + (random()*180)::numeric(8,2),  600 + (random()*350)::int,  (4 + random()*6)::numeric(6,4)),
      (gen_random_uuid(), v_company_id, v_sku5::text, v_store1::text, v_site1::text, v_date, 5  + (random()*10)::int, 4  + (random()*8)::int,  180 + (random()*180)::numeric(8,2),  145 + (random()*150)::numeric(8,2),  400 + (random()*250)::int,  (3 + random()*4)::numeric(6,4)),
      (gen_random_uuid(), v_company_id, v_sku6::text, v_store2::text, v_site2::text, v_date, 12 + (random()*16)::int, 10 + (random()*14)::int, 550 + (random()*350)::numeric(8,2),  460 + (random()*320)::numeric(8,2),  650 + (random()*300)::int,  (5 + random()*7)::numeric(6,4)),
      (gen_random_uuid(), v_company_id, v_sku7::text, v_store2::text, v_site2::text, v_date, 20 + (random()*30)::int, 18 + (random()*25)::int, 280 + (random()*210)::numeric(8,2),  252 + (random()*200)::numeric(8,2),  900 + (random()*400)::int,  (6 + random()*8)::numeric(6,4)),
      (gen_random_uuid(), v_company_id, v_sku8::text, v_store1::text, v_site1::text, v_date, 18 + (random()*22)::int, 15 + (random()*20)::int, 360 + (random()*220)::numeric(8,2),  300 + (random()*200)::numeric(8,2),  700 + (random()*350)::int,  (6 + random()*6)::numeric(6,4)),
      (gen_random_uuid(), v_company_id, v_sku10::text, v_store1::text, v_site1::text, v_date, 22 + (random()*25)::int, 20 + (random()*22)::int, 374 + (random()*210)::numeric(8,2), 340 + (random()*200)::numeric(8,2),  1000 + (random()*500)::int, (7 + random()*5)::numeric(6,4));
  END LOOP;

  -- ─── 广告数据（14天，5个投广告的SKU） ──────────────────────
  FOR i IN 0..13 LOOP
    v_date := CURRENT_DATE - i;
    INSERT INTO ads_facts (id, company_id, sku_id, store_id, site_id, report_date, impressions, clicks, ad_spend, ad_revenue, ad_orders, acos, roas)
    VALUES
      (gen_random_uuid(), v_company_id, v_sku1::text, v_store1::text, v_site1::text, v_date, 5000 + (random()*3000)::int, 120 + (random()*80)::int, 45.00 + (random()*30)::numeric(8,2),  180 + (random()*120)::numeric(8,2), 8 + (random()*6)::int, (20 + random()*15)::numeric(6,2), (3.0 + random()*2)::numeric(6,4)),
      (gen_random_uuid(), v_company_id, v_sku2::text, v_store1::text, v_site1::text, v_date, 8000 + (random()*4000)::int, 200 + (random()*100)::int, 35.00 + (random()*25)::numeric(8,2), 140 + (random()*100)::numeric(8,2), 15 + (random()*10)::int, (22 + random()*26)::numeric(6,2), (2.5 + random()*2)::numeric(6,4)),
      (gen_random_uuid(), v_company_id, v_sku4::text, v_store1::text, v_site1::text, v_date, 3000 + (random()*2000)::int, 80 + (random()*60)::int,  30.00 + (random()*20)::numeric(8,2),  100 + (random()*80)::numeric(8,2),  5 + (random()*5)::int,  (25 + random()*15)::numeric(6,2), (2.0 + random()*2)::numeric(6,4)),
      (gen_random_uuid(), v_company_id, v_sku5::text, v_store1::text, v_site1::text, v_date, 2500 + (random()*1500)::int, 60 + (random()*40)::int,  25.00 + (random()*15)::numeric(8,2),  70 + (random()*60)::numeric(8,2),   3 + (random()*4)::int,  (30 + random()*20)::numeric(6,2), (1.5 + random()*2)::numeric(6,4)),
      (gen_random_uuid(), v_company_id, v_sku8::text, v_store1::text, v_site1::text, v_date, 4000 + (random()*2500)::int, 100 + (random()*70)::int, 28.00 + (random()*18)::numeric(8,2),  110 + (random()*90)::numeric(8,2),  7 + (random()*5)::int,  (18 + random()*12)::numeric(6,2), (3.5 + random()*2)::numeric(6,4));
  END LOOP;

  -- ─── 库存数据（14天，9个活跃SKU） ─────────────────────────
  FOR i IN 0..13 LOOP
    v_date := CURRENT_DATE - i;
    INSERT INTO inventory_facts (id, company_id, sku_id, store_id, site_id, report_date, fulfillable_qty, inbound_qty, reserved_qty, unfulfillable_qty, days_of_supply, is_stockout)
    VALUES
      (gen_random_uuid(), v_company_id, v_sku1::text, v_store1::text, v_site1::text, v_date, 350 - i*12 + (random()*10)::int, 0,   5 + (random()*3)::int, 0, 25 - i, false),
      (gen_random_uuid(), v_company_id, v_sku2::text, v_store1::text, v_site1::text, v_date, 800 - i*25 + (random()*15)::int, 0,  10 + (random()*5)::int, 1, 30 - i, false),
      (gen_random_uuid(), v_company_id, v_sku3::text, v_store1::text, v_site1::text, v_date, GREATEST(60 - i*4 + (random()*3)::int, 0), 0, 2 + (random()*2)::int, 0, GREATEST(3 - i/4, 0), (i > 10)),
      (gen_random_uuid(), v_company_id, v_sku4::text, v_store1::text, v_site1::text, v_date, 200 - i*8  + (random()*5)::int,  50,  3 + (random()*2)::int, 0, 20 - i, false),
      (gen_random_uuid(), v_company_id, v_sku5::text, v_store1::text, v_site1::text, v_date, 150 - i*5  + (random()*4)::int,  0,   2 + (random()*2)::int, 0, 18 - i, false),
      (gen_random_uuid(), v_company_id, v_sku6::text, v_store2::text, v_site2::text, v_date, 280 - i*10 + (random()*8)::int,  0,   4 + (random()*3)::int, 0, 22 - i, false),
      (gen_random_uuid(), v_company_id, v_sku7::text, v_store2::text, v_site2::text, v_date, 500 - i*18 + (random()*12)::int, 0,   8 + (random()*4)::int, 2, 28 - i, false),
      (gen_random_uuid(), v_company_id, v_sku8::text, v_store1::text, v_site1::text, v_date, 400 - i*15 + (random()*10)::int, 100, 6 + (random()*3)::int, 0, 24 - i, false),
      (gen_random_uuid(), v_company_id, v_sku10::text, v_store1::text, v_site1::text, v_date, 600 - i*20 + (random()*10)::int, 0,  5 + (random()*3)::int, 0, 30 - i, false);
  END LOOP;

  -- ─── 指标快照 ──────────────────────────────────────────────
  INSERT INTO metric_snapshots (id, company_id, metric_code, sku_id, store_id, site_id, value, "window", window_start, window_end, dimensions)
  VALUES
    (gen_random_uuid(), v_company_id, 'REVENUE',          v_sku1::text, v_store1::text, v_site1::text, 12500.00,  'DAILY',   NOW() - INTERVAL '1 day', NOW(), '{"币种":"USD","说明":"蓝牙耳机日营收"}'),
    (gen_random_uuid(), v_company_id, 'UNITS_SOLD',       v_sku1::text, v_store1::text, v_site1::text, 250.0000,  'DAILY',   NOW() - INTERVAL '1 day', NOW(), '{"说明":"蓝牙耳机日销量"}'),
    (gen_random_uuid(), v_company_id, 'ACOS',             v_sku2::text, v_store1::text, v_site1::text, 48.2000,   'DAILY',   NOW() - INTERVAL '1 day', NOW(), '{"广告活动":"USB-C-AUTO-02","说明":"数据线广告成本"}'),
    (gen_random_uuid(), v_company_id, 'CONVERSION_RATE',  v_sku3::text, v_store1::text, v_site1::text, 6.8000,    'DAILY',   NOW() - INTERVAL '1 day', NOW(), '{"说明":"厨具套装转化率"}'),
    (gen_random_uuid(), v_company_id, 'ORGANIC_RANK',     v_sku4::text, v_store1::text, v_site1::text, 23.0000,   'HOURLY',  NOW() - INTERVAL '1 hour', NOW(), '{"关键词":"yoga mat 6mm","说明":"瑜伽垫自然排名"}'),
    (gen_random_uuid(), v_company_id, 'REVENUE',          NULL,         v_store1::text, v_site1::text, 85600.00,  'WEEKLY',  NOW() - INTERVAL '7 days', NOW(), '{"币种":"USD","说明":"美国站周营收汇总"}'),
    (gen_random_uuid(), v_company_id, 'MARGIN_PCT',       v_sku6::text, v_store2::text, v_site2::text, 8.2000,    'DAILY',   NOW() - INTERVAL '1 day', NOW(), '{"币种":"EUR","说明":"德国站耳机利润率"}'),
    (gen_random_uuid(), v_company_id, 'AD_SPEND',         NULL,         v_store1::text, v_site1::text, 1630.00,   'WEEKLY',  NOW() - INTERVAL '7 days', NOW(), '{"币种":"USD","说明":"美国站周广告总花费"}'),
    (gen_random_uuid(), v_company_id, 'INVENTORY_DAYS',   v_sku3::text, v_store1::text, v_site1::text, 3.0000,    'DAILY',   NOW() - INTERVAL '1 day', NOW(), '{"说明":"厨具套装库存可售天数"}'),
    (gen_random_uuid(), v_company_id, 'UNITS_SOLD',       NULL,         NULL,           NULL,          1850.0000, 'MONTHLY', NOW() - INTERVAL '30 days', NOW(), '{"范围":"全公司","说明":"月度总销量"}')
  ON CONFLICT DO NOTHING;

  -- ─── 审计日志 ──────────────────────────────────────────────
  INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action_performed, details, ip_address, created_at)
  VALUES
    (gen_random_uuid(), v_company_id, v_user_id, 'action', v_act1::text, 'CREATE',  '{"类型":"调整价格","状态":"草稿","说明":"创建竞品跟价动作"}',         '127.0.0.1', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), v_company_id, v_user_id, 'action', v_act2::text, 'CREATE',  '{"类型":"暂停广告组","状态":"草稿","说明":"创建暂停ACOS超标广告动作"}', '127.0.0.1', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), v_company_id, v_user_id, 'action', v_act2::text, 'SUBMIT',  '{"原状态":"草稿","新状态":"已提交","说明":"提交暂停广告动作待审批"}',   '127.0.0.1', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), v_company_id, v_user_id, 'action', v_act3::text, 'APPROVE', '{"原状态":"已提交","新状态":"已批准","说明":"审批通过紧急补货单"}',     '127.0.0.1', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), v_company_id, v_user_id, 'action', v_act4::text, 'EXECUTE', '{"原状态":"已批准","新状态":"已执行","说明":"执行调整出价操作"}',       '127.0.0.1', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), v_company_id, v_user_id, 'action', v_act5::text, 'VERIFY',  '{"原状态":"已执行","新状态":"已验证","节省金额":312.00,"说明":"验证暂停广告效果"}', '127.0.0.1', NOW() - INTERVAL '12 hours')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '样例数据插入成功！';
  RAISE NOTICE '店铺: 2, 站点: 2, SKU商品: 10, 竞品: 5';
  RAISE NOTICE '告警: 7, AI推荐: 5, 执行动作: 6';
  RAISE NOTICE '销售数据: 14天x9个SKU, 广告数据: 14天x5个SKU, 库存数据: 14天x9个SKU';
  RAISE NOTICE '竞品快照: 7天x5个, 指标快照: 10条, 审计日志: 6条';
END $$;

-- 恢复审计日志触发器
ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_no_update;
