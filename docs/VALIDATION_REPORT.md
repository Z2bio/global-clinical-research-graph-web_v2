# v2.4.0 最终验证报告

## 结论

**PASS — 可作为现有 GitHub Pages 项目的 v2.4.0 完整替换基线。**

## 已验证

- `index.html` / `404.html` 位于仓库根目录；
- GitHub Pages 相对路径资源；
- Service Worker 缓存版本 `v2.4.0`；
- ClinicalTrials.gov API v2 访问模块；
- ChiCTR / NMPA / WHO / NMRR 多源快照适配；
- `source-status.json` 来源健康状态；
- GitHub Actions 定时同步与同步后 Pages 直接部署；
- 中英文 UI；
- 左侧显式可拖拽筛选滚动条；
- 主公示页默认 `列表 + 地图`；
- 医院/中心点聚合、研究定位和关联研究；
- 中国高德地图适配及无 Key 坐标预览；
- 18 / 18 Node 自动化测试；
- Python 同步脚本编译检查；
- 两个 GitHub workflow YAML 解析检查。

## 需要用户部署后完成的外部验证

- 在 GitHub `Settings → Pages` 将 Source 设为 `GitHub Actions`；
- 第一次手动运行 `Sync clinical research sources and deploy`；
- 检查 Actions 是否有写回权限；
- 如需正式中国地图，配置高德 Key / JsCode；
- 如需 WHO ICTRP / 国家医学研究备案真实自动数据，配置合规 Feed；
- 在 Chrome / Safari / 微信内置浏览器进行一次线上交互测试。

## 不伪装为已完成的能力

- WHO ICTRP 未取得允许的数据下载/服务配置时，不显示为 Live；
- NMRR 没有机器可读 Feed 时，不显示为已同步；
- ChiCTR/NMPA 当前自动化属于公开页面/查询增量策略，不宣称一次性历史全量覆盖；
- 无高德 Key 时显示坐标预览，不冒充正式中国地图底图。
