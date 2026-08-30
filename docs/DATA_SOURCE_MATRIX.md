# v2.4 数据源能力矩阵

| 数据源 | 主要覆盖 | v2.4 接入方式 | 自动刷新 | 当前状态 | 关键边界 |
| --- | --- | --- | --- | --- | --- |
| ClinicalTrials.gov | 全球研究、美国及国际多中心 | 官方 REST API v2 | 访问时实时 | Live | 以官方 `dataTimestamp` 判断最新数据时间 |
| WHO ICTRP | WHO 主注册中心网络跨注册聚合 | 官方允许的 CSV/XML/Web Service / 导出 Feed | 配置后自动 | Authorization / export required | 公益非商业仍需遵守 WHO 数据归属、更新和访问条件；不抓受限服务 |
| ChiCTR | 中国临床研究，包括 IIT、观察性、干预性等 | 公开检索页面分页 + 增量/回填 | 每日 | Seeded → Partial/Ready | 不把 ChiCTR 自动等同 IIT；不绕过验证码/登录/反爬 |
| 国家医学研究登记备案 | 医疗卫生机构临床研究登记备案 | 公共门户健康检测 + 官方/授权机器可读导出 | 配置后自动 | Portal online / feed required | 未确认稳定匿名批量接口时不绕过账户体系 |
| NMPA 药物临床试验登记 | 中国药品注册性试验、BE/PK、I–IV期 | 公开查询 + 年度 CTR 前缀 + seeds + 回填 | 每日 | Seeded partial → Partial/Ready | 当前按公开查询逐步回填；不虚构官方全量镜像 |

## UI 状态必须与真实连接状态一致

页面显示：

- `实时 / Live`
- `已同步 / Synced`
- `部分覆盖 / Partial`
- `官网在线·待批量数据 / Portal online · feed required`
- `待官方导出 / Official export required`
- `降级/旧快照 / Degraded`
- `同步异常 / Sync error`

来源复选框的作用是筛选**已经进入统一研究模型的数据**。没有真实记录进入系统的来源，不应因为复选框存在而被描述成“已接通”。
