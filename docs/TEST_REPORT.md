# v2.0 测试报告

日期：2026-08-28

## 自动化测试

共 7 项：

- ClinicalTrials.gov V2 标准化；
- 中文疾病查询词转换；
- 分期/国家/申办方筛选与排序；
- localStorage 故障降级；
- ChiCTR 通用快照标准化；
- 精确交叉注册编号合并；
- 多源快照检索与图谱指标统计。

结果：**7/7 通过**。

## 静态审计

检查：

- GitHub Pages 必需文件；
- 5 个数据源文案与入口；
- DOM ID 与 JS 引用一致性；
- manifest 相对路径；
- 8 个 JS 模块安全检查；
- 无 `eval()`；
- 医疗免责声明；
- 多源快照 JSON 存在。

结果：**通过**。

## HTTP 静态文件测试

本地 `python3 -m http.server` 返回：

- `/` → 200
- `/assets/js/app.js` → 200
- `/assets/js/federated.js` → 200
- `/data/who-ictrp.json` → 200
- `/manifest.webmanifest` → 200

## 浏览器 E2E 限制

当前执行环境的 Chromium 对 `127.0.0.1` 访问被管理员策略阻止（`ERR_BLOCKED_BY_ADMINISTRATOR`），因此无法在本环境完成截图式浏览器 E2E。

正式 GitHub Pages 发布后建议在 Chrome / Safari / 微信内置浏览器各检查一次。
