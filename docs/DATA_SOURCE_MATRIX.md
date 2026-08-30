# v2.3 数据源能力矩阵

| 数据源 | 主要覆盖 | v2.3 接入方式 | 自动刷新 | 当前状态 | 关键边界 |
| --- | --- | --- | --- | --- | --- |
| ClinicalTrials.gov | 全球研究、美国及国际多中心 | 官方 REST API v2 | 访问时实时 | Live | 以官方 `dataTimestamp` 判断最新数据时间 |
| WHO ICTRP | WHO 主注册中心网络跨注册聚合 | 官方允许的 CSV/XML/Web Service / 授权 Feed | 配置后自动 | Authorization required | WHO ICTRP 数据使用条款需要单独遵守；面向商业客户前必须确认具体使用权限 |
| ChiCTR | 中国 IIT、观察性、干预性等 | 低频读取公开最新登记检索页，日增量积累 | 每日 | Seeded → Ready | 非官方 API；不绕过验证码/登录；不是一次性历史全量镜像 |
| 国家医学研究登记备案 | 医疗卫生机构临床研究备案 | 公开/授权机器可读导出 Feed | 配置后自动 | Feed required | 不假设匿名 REST API；不绕过登录体系 |
| NMPA 药物临床试验登记 | 中国药品注册性试验、BE/PK、I–IV期 | 公开查询结果 + CTR/关键词 seeds | 每日 | Seeded partial → Partial | 当前为增量/种子覆盖；全量历史需要稳定批量源 |

## UI 状态必须与真实连接状态一致

页面不再只显示来源名称，而显示连接健康状态：

- `实时 / Live`
- `已同步 / Synced`
- `部分覆盖 / Partial`
- `待授权 / Authorization required`
- `待数据 / Feed required`
- `降级/旧快照 / Degraded`
- `同步异常 / Sync error`

复选框只允许用户筛选已经进入系统的来源记录，不能被理解为“勾选即自动联网”。
