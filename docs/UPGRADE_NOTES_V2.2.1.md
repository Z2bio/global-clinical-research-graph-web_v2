# v2.2.0 → v2.2.1 筛选侧栏滚动修复

## 问题
桌面端左侧“结构化筛选”内容高度超过浏览器视口时，原 sticky 侧栏没有独立滚动容器；当右侧结果很长，用户需要继续滚动整个页面才能看到左侧底部筛选项。

## 修复
- `filters-panel` 增加基于视口高度的 `max-height`。
- 增加 `overflow-y: auto`，左侧筛选独立滚动。
- 使用 `100dvh` + `100vh` fallback，改善不同浏览器窗口高度适配。
- 增加 `scrollbar-gutter: stable`、Firefox/WebKit scrollbar 样式。
- `overscroll-behavior: contain` 避免滚到边界时误带动整个页面。
- 移动端仍使用原筛选 Drawer，不受本次修改影响。

## 未改变
ClinicalTrials.gov API、多源数据模型、研究地图、中英文切换、研究卡片和筛选业务逻辑均未改变。
