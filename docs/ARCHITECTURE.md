# v2.0 架构：Global + China Clinical Research Graph

## 目标

从“Drug Trial Database”升级为“Clinical Research Graph”。

核心实体不是药物，而是 **Study（研究）**。

## 核心数据对象

```text
Study
├── identifiers
│   ├── NCT
│   ├── ChiCTR
│   ├── WHO/UTN/Primary Registry ID
│   ├── NMPA CTR
│   └── 国家医学研究备案编号
├── conditions
├── interventions
├── sponsor / initiator
├── collaborators
├── facilities
├── investigators
├── enrollment
├── status
├── dates
├── outcomes
├── eligibility
└── sourceRecords[]
```

## 前端数据流

```text
ClinicalTrials.gov API ─────┐
WHO ICTRP JSON snapshot ────┤
ChiCTR JSON snapshot ───────┤
NMRR JSON snapshot ─────────┼─→ normalize → exact-ID merge → cards/detail/source chain
NMPA JSON snapshot ─────────┘
```

## 真实性优先

多源系统最危险的问题不是“数据少”，而是：

1. 把不同研究错误合并；
2. 把旧数据显示成实时数据；
3. 把网页抓取结果伪装成官方 API；
4. 丢失来源，导致无法核验。

因此 v2.0 采用：

- 明确显示来源；
- 显示来源原始链接；
- 显示更新时间；
- 仅用精确交叉编号自动去重；
- 对没有接入的数据源明确显示“当前快照为空”。

## 后续 v2.1 推荐

新增后端：

- Cloudflare Workers / Pages Functions；或
- Vercel Functions；或
- 自有 FastAPI / Node 服务。

后端负责：

- WHO 下载/授权接口同步；
- ChiCTR 合规同步；
- 国家医学研究登记备案合规同步；
- NMPA 合规同步；
- 定时 ETL；
- 历史版本；
- 跨源 ID 映射；
- Graph 数据库存储。
