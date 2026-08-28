# Validation Report — Global + China Clinical Research Graph v2.0.0

## 结论

代码包已通过 Node 自动化测试、静态审计和本地 HTTP 静态资源检查，可用于 GitHub Pages 覆盖升级。

## 关键真实性检查

- ClinicalTrials.gov：真实 API V2 访问时查询；
- WHO ICTRP：未伪装匿名实时 API；
- ChiCTR：未伪装匿名实时 API；
- 国家医学研究登记备案：未伪装匿名实时 API；
- NMPA：未伪装匿名实时 API；
- 未接入来源明确显示快照为空；
- 交叉来源仅按明确相同注册编号自动合并；
- 每条记录保留来源 URL。

## 自动测试

`npm run check`：通过。

- 7 tests passed
- 19 required files checked
- 11 HTML semantic/source checks
- 106 DOM id references checked
- 8 JavaScript modules audited

## 已知边界

GitHub Pages 本身没有后端任务。五源全部自动同步需要在后续增加官方数据下载/授权接口及 ETL 服务。
