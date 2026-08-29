# v2.2 Test Report

执行：

```bash
npm run check
```

覆盖：

- ClinicalTrials.gov v2 标准化。
- 中文疾病查询转换。
- 多源过滤与研究分类。
- 浏览器本地存储降级。
- geoPoint 经纬度保留。
- 同一执行中心关联研究聚合。
- 地图研究数 / 可定位研究数 / 执行中心数统计。
- GitHub Pages 必需文件和 DOM ID 审计。
- v2.2 研究地图、语言切换模块存在性检查。

高德 JS API 的真实底图加载需要使用者自己的 Web(JS API) Key，因此自动化测试不包含真实 Key 联网调用。
