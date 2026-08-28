# 数据源能力矩阵

更新：2026-08-28

| 层级 | 数据源 | 最适合覆盖 | 官方公开机制 | GitHub Pages 匿名实时直连 | v2.0 当前模式 |
|---|---|---|---|---|---|
| Layer 1 | ClinicalTrials.gov | 全球研究，尤其美国及国际多中心 | REST API V2；工作日每日刷新 | **可以** | **实时 API** |
| Layer 2 | WHO ICTRP | 多个 WHO Primary Registry 的跨注册中心聚合 | Search Portal；CSV/XML 下载；Web Service/数据下载机制 | **不按匿名 REST API 假设** | 官方入口 + 快照适配器 |
| Layer 3 | ChiCTR | 中国临床研究、IIT、观察性/干预性研究 | 官方搜索与公开详情 | 本次核查未发现适合匿名前端的公开开发 API 文档 | 官方入口 + 快照适配器 |
| Layer 3 | 国家医学研究登记备案 | 医疗卫生机构临床研究、IIT、备案项目 | 国家医学研究登记备案信息系统 / 公开机制 | 本次核查未发现适合匿名前端的公开开发 API 文档 | 官方入口 + 快照适配器 |
| Layer 4 | NMPA 药物临床试验登记 | 中国药物注册性试验、BE/PK、I–IV 期等 | 药物临床试验登记与信息公示平台 | 本次核查未发现适合匿名前端的公开开发 API 文档 | 官方入口 + 快照适配器 |

## 1. ClinicalTrials.gov

官方 API V2 可供程序化查询。官方说明数据在周一至周五每日刷新，一般在美国东部时间上午 9 点前完成，并可通过 `/api/v2/version` 的 `dataTimestamp` 判断最新数据时间。

本项目已接入。

## 2. WHO ICTRP

WHO ICTRP Search Portal 聚合 WHO Registry Network 中多个注册中心的数据，并支持 CSV/XML 下载。WHO 页面说明数据库按周更新。

需要特别注意：

- WHO 的 crawling service 需要账号/密码；
- WHO 另提供 Web Service，但有使用条件及资源成本；
- WHO ICTRP 数据使用条款要求来源归属、保持数据最新，并禁止将 ICTRP 数据用于 marketing / promotional / commercial purposes。

因此本项目不直接通过未授权爬虫抓取 ICTRP。

## 3. ChiCTR

ChiCTR 是 WHO ICTRP Primary Registry，可公开检索并查看项目。它对于中国 IIT、观察性研究和非药物研究特别重要。

当前前端保留独立适配器，是因为：

- WHO ICTRP 聚合可能存在同步延迟；
- 中国场景需要突出本土主注册编号与研究机构；
- 需要保留 ChiCTR 原始来源证据。

## 4. 国家医学研究登记备案

国家卫生健康委 2024 年发布的《医疗卫生机构开展研究者发起的临床研究管理办法》明确：医疗卫生机构立项审核通过时，临床研究信息应上传国家医学研究登记备案信息系统；完成上传的有关信息应通过系统或国家卫健委明确的平台向社会公开。

因此它对“中国医院内部立项 / IIT / 非注册性临床研究”非常关键，不能用 NMPA 或 ClinicalTrials.gov 替代。

## 5. NMPA 药物临床试验登记与信息公示

国家药监局政务服务门户明确，获准在我国开展的药物临床试验，包括 BE、PK、I、II、III、IV 期等，应在药物临床试验登记和信息公示平台登记并公示；后续信息更新也需重新递交审核后公示。

该层与 ChiCTR / 国家医学研究登记备案的定位不同：它更接近 **中国药品监管注册链条**。

## 建议的最终生产架构

```text
GitHub Pages / Web Frontend
           ↓
Unified Search API
           ↓
┌────────────┬───────────┬──────────┬───────────┬──────────┐
│ CTG Live   │ WHO ICTRP │ ChiCTR   │ NMRR      │ NMPA     │
│ API        │ Export/API│ Adapter  │ Adapter   │ Adapter  │
└────────────┴───────────┴──────────┴───────────┴──────────┘
           ↓
Canonical Study Graph + Provenance
```

GitHub Pages v2.0 已经实现前端图谱结构；真正做到五源自动同步时，应增加一个轻量后端 / ETL 层，而不是强行在浏览器里抓取网页。
