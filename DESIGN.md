# 归物 · 家庭物品管理器 — 设计文档

> 替代归物本 App 的本地 Web 应用。自己搓，无计件限制，数据完全本地。

---

## 1. 定位

| 维度 | 决定 |
|------|------|
| 核心功能 | 家庭物品记录 + 统计 + 折旧 + 保修提醒 |
| 物品上限 | 500+（IndexedDB 轻松承载） |
| 平台 | 电脑优先，浏览器 Web 应用 |
| 数据存储 | 完全本地 IndexedDB |
| 多端同步 | 不做 |
| 云备份 | 不做（保留 JSON 手动导出/导入） |
| 数据迁移 | 归物本无法导出，17 条手动重录，做快速录入模式 |

---

## 2. 技术栈

| 层 | 选型 | 理由 |
|----|------|------|
| 框架 | React 18 + TypeScript | 生态最全，类型安全 |
| 构建 | Vite | 快，零配置 |
| 样式 | Tailwind CSS + shadcn/ui | 组件丰富，可定制 |
| 存储 | IndexedDB（via Dexie.js） | 浏览器原生，异步，支持索引 |
| 图表 | Recharts | React 生态最成熟的图表库 |
| 拼音 | pinyin-pro | 拼音首字母搜索 |
| 图标 | Lucide React | UI 操作图标 |

---

## 3. 数据模型

### 3.1 物品 Item

```typescript
interface Item {
  id: string;                    // UUID
  name: string;                  // 物品名称
  emoji: string;                 // emoji 图标（如 📺）
  categoryId: string;            // 分类 ID（外键 → Category）
  status: 'active' | 'idle' | 'retired';  // 在用 / 闲置 / 已退役
  quantity: number;              // 数量，默认 1

  // 购买信息
  purchasePrice: number;         // 购买价格
  additionalCost: number;        // 附加费用（运费/安装费等）
  purchaseDate: string;          // 购买日期 ISO (YYYY-MM-DD)
  currency: 'CNY' | 'HKD';       // 币种

  // 保修 / 退役
  warrantyExpiry?: string;       // 过保日期 ISO
  retiredDate?: string;          // 退役日期（status=retired 时必填）

  // 折旧
  depreciationRate?: number;     // 年折旧率，默认 0.1（10%），单件可覆盖

  // 备注
  notes?: string;

  // 元数据
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 分类 Category

```typescript
interface Category {
  id: string;
  name: string;
  emoji: string;
  isPreset: boolean;             // true = 预设，不可删除
  sortOrder: number;
}
```

### 3.3 设置 Settings

```typescript
interface Settings {
  defaultDepreciationRate: number;   // 默认年折旧率，0.1
  hkdToCnyRate: number;              // HKD→CNY 手动汇率（统计合并用），默认 0.92
  warrantyWarningDays: number;       // 过保提前提醒天数，默认 30
  warrantyCriticalDays: number;      // 过保紧急提醒天数，默认 7
}
```

### 3.4 计算字段（派生，不存储）

```
持有天数 = (retiredDate || 今天) - purchaseDate
总成本   = purchasePrice + additionalCost
日均成本 = 总成本 / 持有天数（持有天数为0时返回总成本）
已用年数 = 持有天数 / 365
残值     = 总成本 × max(0, 1 - 折旧率 × 已用年数)
         （status=retired 时残值 = 0）
```

---

## 4. 预设分类

| 分类 | Emoji |
|------|-------|
| 家电 | 📺 |
| 家具 | 🪑 |
| 厨具 | 🍳 |
| 数码 | 💻 |
| 日用品 | 🧴 |
| 服饰 | 👕 |
| 装饰 | 🖼️ |
| 食品 | 🍜 |
| 其他 | 📦 |

用户可新增自定义分类，也可删除非预设分类。

---

## 5. 页面结构

### 5.1 首页（列表页）

```
┌─────────────────────────────────────────────┐
│  归物                          [+ 添加物品]  │
├─────────────────────────────────────────────┤
│  📦 17 件    ¥12,345    HK$2,100           │  ← 统计栏
│  总物品数    总资产CNY   总资产HKD           │
│  日均 ¥34.5                                 │
├─────────────────────────────────────────────┤
│  [分类柱状图：各分类物品数 + 价值占比]        │  ← Recharts
├─────────────────────────────────────────────┤
│  🔍 [搜索...]  [分类▼] [状态▼] [排序▼]      │  ← 筛选栏
├──────────────┬──────────────────────────────┤
│ 📺 微波炉     │ 家电  ¥899   日均¥2.4  372天 │  ← 列表行
│ 💻 MacBook    │ 数码  ¥9,999 日均¥13.7 730天 │
│ 🪑 餐桌       │ 家具  ¥450   日均¥1.2  365天 │
│ ⚠️ 💡 台灯    │ 日用  ¥89    过保3天         │  ← 过保高亮
│ ...          │                              │
└──────────────┴──────────────────────────────┘
```

**功能清单**：
- 顶部统计：总物品数、总资产（CNY / HKD 分开）、总日均成本
- 分类柱状图：横轴=分类，柱高=物品数，颜色深浅=总价值
- 过保高亮：30 天内黄色标记 ⚠️，7 天内红色标记 🔴
- 搜索：支持名称模糊 + 拼音首字母（输入 "wbl" 匹配 "微波炉"）
- 排序：购买日期↓（默认）/ 价格↓↑ / 日均成本↓↑ / 名称
- 筛选：分类（多选）/ 状态（在用/闲置/已退役）/ 过保状态
- 点击行展开详情或跳转详情页

### 5.2 添加/编辑物品页

**快速录入模式**（首页 [+ 添加] 直达）：
- 名称（必填）
- Emoji（默认 📦，可点选）
- 分类（默认"其他"）
- 购买价格 + 附加费用（附加默认 0）
- 购买日期（默认今天）
- 币种（默认 CNY）
- 其他字段折叠在"更多"里（保修日期、折旧率、备注、状态）

**完整编辑模式**：
- 展开所有字段
- 状态切换（在用→闲置→已退役，退役需填退役日期）

### 5.3 物品详情页

- 展示所有字段 + 计算结果（持有天数、日均成本、残值）
- 编辑按钮
- 退役操作（在用→已退役，需填退役日期）
- 删除（二次确认）

### 5.4 设置页

- 默认折旧率
- HKD→CNY 汇率
- 过保提醒天数
- 分类管理（增删改）
- 数据导出（JSON）/ 导入

---

## 6. 交互细节

| 场景 | 行为 |
|------|------|
| 新增物品 | 快速模式，5 个字段填完即保存 |
| 搜索 | 实时搜索，支持拼音首字母 |
| 过保提醒 | 首页列表行高亮，不弹窗不推送 |
| 退役 | 状态改为 retired，填退役日期，统计排除 |
| 删除 | 弹窗二次确认 |
| 统计 | CNY / HKD 分别汇总，可选手动汇率合并 |
| 折旧 | 全局默认 10%/年，单件可覆盖，退役=残值0 |
| 排序 | 点击表头切换，默认购买日期倒序 |

---

## 7. 视觉风格

- 白底 + 圆角卡片（类似归物本）
- 亮色主题，不做暗色切换
- 紧凑列表，信息密度优先
- 过保高亮：30 天 #FEF3C7（黄底），7 天 #FEE2E2（红底）
- 统计数字大号无衬线，列表正文 14px

---

## 8. 运行方式

```bash
# 开发
cd home-inventory
npm run dev          # → http://localhost:5173

# 构建
npm run build        # → dist/

# 本地静态部署
npx serve dist       # → http://localhost:3000
```

---

## 9. 项目结构

```
home-inventory/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   └── index.ts              # Item, Category, Settings 类型
│   ├── db/
│   │   └── database.ts           # Dexie 初始化 + CRUD
│   ├── hooks/
│   │   ├── useItems.ts            # 物品列表 hooks
│   │   ├── useCategories.ts
│   │   └── useSettings.ts
│   ├── utils/
│   │   ├── calculations.ts        # 日均/残值/持有天数
│   │   ├── pinyin.ts              # 拼音搜索
│   │   └── format.ts              # 货币格式化
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── StatsBar.tsx           # 顶部统计
│   │   ├── CategoryChart.tsx     # 分类柱状图
│   │   ├── ItemList.tsx           # 物品列表
│   │   ├── ItemRow.tsx            # 单行
│   │   ├── ItemForm.tsx           # 添加/编辑表单
│   │   ├── ItemDetail.tsx         # 详情页
│   │   ├── SearchBar.tsx          # 搜索+筛选+排序
│   │   ├── EmojiPicker.tsx        # emoji 选择器
│   │   └── Settings.tsx           # 设置页
│   └── pages/
│       ├── HomePage.tsx
│       ├── AddItemPage.tsx
│       ├── EditItemPage.tsx
│       ├── DetailPage.tsx
│       └── SettingsPage.tsx
└── dist/                          # build 输出
```

---

## 10. 不做的事（明确排除）

- ❌ 存放位置（房间/柜子/层）
- ❌ 物品照片上传
- ❌ 云同步 / 多端
- ❌ 暗色主题
- ❌ 应用密码锁
- ❌ 自动备份（保留手动 JSON 导出）
- ❌ 浏览器推送通知
- ❌ 用户账号系统
