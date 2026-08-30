# 多数据源自动同步说明

## 1. 为什么不能仅靠 GitHub Pages “自动打通所有来源”

GitHub Pages 是静态托管。浏览器可以直接调用允许跨域的公开 API（例如 ClinicalTrials.gov），但不能安全地承担：

- 定时任务；
- 需要凭据/授权的数据下载；
- 跨站 HTML 数据清洗；
- 密钥隐藏；
- 长时间批量同步。

因此 v2.3 使用：

> **GitHub Pages（GitHub Actions 发布） + GitHub Actions（定时 ETL） + JSON 快照（公开静态数据）**

并要求 Pages `Source = GitHub Actions`。这是因为 workflow 使用 `GITHUB_TOKEN` 写回的 commit 不会再次触发 Pages 的 branch build；同步 workflow 会在同一次运行中直接部署最新站点。

## 2. 五个数据源的连接策略

### ClinicalTrials.gov

- 模式：浏览器实时 API v2；
- 不需要 GitHub Actions 预抓取；
- 用户搜索时拿最新官方可用数据；
- 页面显示官方 `dataTimestamp`。

### ChiCTR

- 模式：每日读取官方公开最新登记检索页；
- 从启用 v2.3 之日起增量累积；
- 每次保留旧记录并合并当天新记录；
- 可对少量最新记录进一步读取公开详情页补字段；
- 不绕过验证码、登录或访问限制；
- **不宣称一次性覆盖全部历史记录**。

### NMPA 药物临床试验登记

- 模式：公开查询结果 + CTR/关键词 seeds；
- `data/nmpa-seeds.txt` 可以放 CTR 编号；
- GitHub Secret `NMPA_SEEDS` 可额外提供逗号分隔 seeds；
- 已有数据会日常刷新并积累；
- 若未来取得稳定批量数据接口，可替换 connector 而不改前端数据模型。

### WHO ICTRP

- WHO 数据下载/Web Service 受官方使用条件约束；
- v2.3 不对其网页做无授权批量爬取；
- 获得允许的数据下载方式后，配置 `WHO_ICTRP_FEED_URL`；
- 也可以把官方允许导出的 JSON/CSV/TSV 放到 `data/import/who.*`；
- GitHub Actions 会自动标准化后写入 `data/who-ictrp.json`。

### 国家医学研究登记备案

- 没有假设存在匿名稳定 REST API；
- 取得公开/授权导出后配置 `NMRR_FEED_URL`；
- 或放入 `data/import/nmrr.json|csv|tsv`；
- 自动标准化到统一 Study 模型。

## 3. GitHub Actions 配置

文件：`.github/workflows/sync-sources.yml`

支持：

- 每日 cron；
- `workflow_dispatch` 手动触发；
- 只在 `data/` 发生变化时 commit；
- 失败保留 last-good snapshot；
- `source-status.json` 记录每个来源健康状态。

### 必要权限

仓库：

`Settings → Actions → General → Workflow permissions → Read and write permissions`

否则同步脚本可能运行成功，但 workflow 无法 `git push` 数据更新。

## 4. 可选 GitHub Secrets

`Settings → Secrets and variables → Actions → New repository secret`

| Secret | 用途 |
| --- | --- |
| `WHO_ICTRP_FEED_URL` | WHO 允许的 JSON/CSV/TSV 数据地址 |
| `NMRR_FEED_URL` | 国内医学研究登记备案公开/授权导出地址 |
| `NMPA_SEEDS` | 额外 CTR 编号/关键词，逗号分隔 |

不要把用户名、密码、Cookie、API 私钥写入前端 JS 或公共仓库。

## 5. 状态解释

| 状态 | 含义 |
| --- | --- |
| `live` | 访问时实时请求官方 API |
| `ready` | 最近一次计划同步成功 |
| `seeded` | 预置官方公开种子，等待后续计划同步继续积累 |
| `partial` | 自动同步，但覆盖不是全量历史 |
| `authorization-required` | 数据源需要先取得允许的下载/服务方式 |
| `feed-required` | 需要配置机器可读 Feed/导出 |
| `degraded` | 本轮同步失败，仍使用上一版成功快照 |
| `error` | 当前没有可用数据且同步失败 |

## 6. 生产化下一步

当数据规模继续增加时，建议从 JSON 快照升级为：

- Cloudflare Worker / Vercel Function / 自有 API；
- PostgreSQL 或图数据库；
- 统一 source_record / canonical_study / facility / sponsor / disease 实体；
- 增量 hash / 更新时间检测；
- 历史状态版本表；
- 独立后台监控同步失败、重复和冲突。

v2.3 的前端和统一 Study 模型已为这一步保留兼容结构。

## 7. WHO ICTRP 特别合规提醒

WHO ICTRP 官方数据条款要求来源归属、保持数据更新并显示 WHO 处理日期，同时对营销、推广或商业用途有限制。因此，如果本项目作为面向客户的商业产品部署，**不要仅因为技术上能下载就自动启用 WHO ICTRP 数据**；应先核对最新官方条款并确认具体使用场景获得允许。v2.3 默认把 WHO 标记为 `authorization-required`，就是为了避免把技术连接误当成使用许可。
