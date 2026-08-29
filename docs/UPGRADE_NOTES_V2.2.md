# v2.1 → v2.2 升级说明

## 产品层

- 新增独立“研究图谱 / Research Map”导航。
- 地图不是装饰组件，而是研究、执行中心和来源证据的空间视图。
- 中国用户优先使用中国地图服务和中国临床研究分类框架。

## UI 层

- 左研究列表 / 右地图工作区。
- 医院/中心点聚合。
- 地图筛选与主公示列表筛选使用同一状态。
- 点击研究 → 地图定位。
- 点击中心 → 显示关联研究。
- 中文 / English UI 切换。

## 数据层

- 保留 ClinicalTrials.gov `geoPoint`。
- 使用 `buildFacilityPoints()` 将同一执行中心下的多个研究聚合为一个地图实体。
- 中国境内 GPS/WGS84 坐标在 AMap 模式下批量转换为高德坐标。

## 关系图谱

本版只预留 UI 和数据方向，不在 v2.2 中实现完整知识图谱引擎：

`Study → Disease → Sponsor → Facility → Source`

后续建议在多源 canonical study 去重稳定后再进入 v2.3。
