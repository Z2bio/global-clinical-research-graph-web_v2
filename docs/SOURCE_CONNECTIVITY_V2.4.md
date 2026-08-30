# v2.4 多来源连接说明（公益非商业版）

## 1. 为什么“公益”仍不能等于“无条件抓取”

本项目不收费、不做营销、不收集患者敏感信息，有利于降低商业与隐私风险，但各登记平台的技术访问规则、数据使用条款和账号/验证码限制仍需遵守。

因此 v2.4 的原则是：

> **能通过公开 API / 公开机器可读页面 / 官方导出合法获得的数据自动同步；需要授权、账户或人工导出的来源，完成一次官方数据通道配置后再自动同步。**

## 2. ClinicalTrials.gov

状态：**完全自动、访问时实时**。

浏览器直接调用官方 API v2；无需 GitHub Actions 预抓取。

## 3. ChiCTR

状态：**公开页面自动增量 + 回填**。

GitHub Actions 每天执行：

1. 请求公开检索/登记页面；
2. 跟随公开可访问分页；
3. 读取新记录；
4. 对近期少量记录进一步读取公开详情补字段；
5. 与历史快照按注册号去重；
6. 写入 `data/chictr.json`。

不绕过登录、验证码、WAF 或其他访问限制。

## 4. NMPA 药物临床试验登记

状态：**公开查询自动增量 + 回填**。

同步层会组合：

- 公开列表/检索；
- 当前与前若干年份 `CTRYYYY` 查询前缀；
- `data/nmpa-seeds.txt`；
- GitHub Secret `NMPA_SEEDS`。

结果写入 `data/nmpa.json`，并保留 last-good snapshot。

## 5. WHO ICTRP

状态：**官方数据通道一次配置后自动**。

WHO ICTRP 提供 Search Portal 和 CSV/XML 等下载/服务机制，但数据下载/Web Service 有官方使用条件。v2.4 不对受限入口做无授权 crawler。

有两种接入方式：

- GitHub Secret `WHO_ICTRP_FEED_URL` 指向允许使用的 JSON/CSV/TSV/XML 导出；
- 将官方允许导出的文件放入 `data/import/` 后由同步脚本标准化。

配置后即纳入每日 GitHub Actions 流程。

## 6. 国家医学研究登记备案

状态：**公开门户健康检测 + 官方/授权批量数据通道一次配置后自动**。

当前架构不假设存在匿名稳定的全量 REST API。同步层会：

- 检查公开门户是否在线；
- 如果设置 `NMRR_FEED_URL`，自动下载、标准化、去重和发布；
- 或读取 `data/import/nmrr.*` 的官方/授权导出。

未取得机器可读数据通道时，页面显示“官网在线·待批量数据”，而不是“实时”。

## 7. 来源状态含义

| 状态 | 含义 |
| --- | --- |
| live | 浏览器访问时实时官方 API |
| ready | 最近计划同步成功 |
| seeded / seeded-partial | 有官方公开样本，覆盖不完整 |
| partial | 自动同步但并非历史全量 |
| authorization-required | 需要满足数据下载/服务条件 |
| portal-online-feed-required | 官网公开可访问，但批量机器可读 Feed 未配置 |
| degraded | 本轮失败，仍使用上一成功快照 |
| error | 当前无可用数据且同步失败 |

## 8. 后续真正做到“大规模全盘”的推荐生产架构

GitHub Pages + GitHub Actions 适合公益 Demo、产品验证和中小规模公开数据集。若要长期维护多源历史全量，建议升级：

- 独立 ETL Worker / 云函数；
- PostgreSQL / ClickHouse / 图数据库；
- source_record 与 canonical_study 分层；
- 原始源快照存档；
- 增量更新时间/内容 hash；
- 冲突与重复人工审计队列；
- API 对前端提供统一分页与地理聚合。

v2.4 的前端 Study 模型和来源证据链可直接迁移到该架构。
