# v2.3.0 Test Report

执行：

```bash
npm test
npm run audit
python -m py_compile scripts/sync_sources.py
```

## 自动化测试：18 / 18 通过

覆盖：

- ClinicalTrials.gov API v2 标准化；
- ChiCTR 统一研究模型；
- NMPA 注册性试验分类；
- 不把 ChiCTR 自动等同 IIT；
- 精确交叉注册编号合并；
- 多来源过滤；
- Source / Registration Path / Research Type / Stage 四维模型；
- geoPoint 坐标保留；
- 同执行中心多研究聚合；
- 地图 KPI 统计；
- 左侧独立滚动；
- v2.3 自定义可拖拽滚动条；
- 主页面 `列表 + 地图` 工作区；
- source health 与中国来源 seed 存在；
- 浏览器 localStorage 降级。

## 静态审计

- 29 required files；
- 23 HTML checks；
- 153 DOM ID references；
- 14 JavaScript modules。

## 同步脚本检查

`scripts/sync_sources.py` 通过 Python 编译检查。

网络侧的真实数据抓取由 GitHub Actions 在部署仓库环境执行。测试包不会为了“看起来已打通”而在离线单测中伪造 WHO/NMRR 授权连接。

## 地图说明

高德正式底图需要项目自己的 Web(JS API) Key，因此本地自动测试主要验证：

- 地图容器存在；
- 视图切换；
- 坐标聚合；
- 研究/中心联动；
- 无 Key 坐标预览降级；
- 地图适配模块结构。
