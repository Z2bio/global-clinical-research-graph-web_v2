# v2.4 中国地图与研究图谱工作区

## 1. 主页面默认布局

桌面端主页面提供：

- 列表；
- 列表 + 地图（推荐）；
- 地图。

v2.4 修复了 `viewList / viewSplit / viewMap` 内部翻译 key 泄漏，用户只会看到正常中文/英文标签。

## 2. 左侧可收缩

结构化筛选顶部有“收起”。收起后只保留窄展开栏，给结果列表和地图更多空间。

左侧仍支持独立滚动和显式拖拽滚动条，不依赖 macOS 是否显示系统滚动条。

## 3. 地图比例可拖拽

列表与地图之间有分隔拖动条：

- 向左拖：地图变宽；
- 向右拖：列表变宽；
- “自适应”：恢复推荐比例；
- 浏览器大小变化：地图自动 resize。

完整“研究图谱”页也支持结果列表收起与比例拖拽。

## 4. 中国优先 / 全球视野

### 中国优先

优先根据中国执行中心自动 fit；当前没有中国坐标时回到中国默认视野。

### 全球视野

显式切换为世界范围中心/缩放，不依赖当前点位是否刚好都在中国。

两种模式在高德正式地图和无 Key 的坐标预览中都有效。

## 5. 聚合点视觉

v2.4 保证聚合点：

- 圆形不变形；
- 数字严格居中；
- 大小按数量适度变化；
- 缩放/容器比例变化不拉成椭圆。

## 6. 高德地图运行配置

推荐通过 GitHub Repository Variables 配置，而不是改源码。

`Settings → Secrets and variables → Actions → Variables`

新增：

- `AMAP_WEB_KEY`
- `AMAP_SECURITY_JSCODE`
- `AMAP_ENGLISH_LABELS`（`true` / `false`）

`.github/workflows/sync-sources.yml` 部署时自动生成 `runtime-config.js`。

本地也可以直接编辑 `runtime-config.js`：

```js
window.__CRG_RUNTIME_CONFIG__ = {
  map: {
    amapKey: 'YOUR_KEY',
    amapSecurityJsCode: 'YOUR_JSCODE',
    enableEnglishMapLabels: false
  }
}
```

## 7. 无 Key 降级

没有高德 Key 时：

- 地图区域不消失；
- 使用坐标分布预览；
- 已有经纬度的中心仍可定位和查看关联研究；
- 中国/全球视野仍能切换；
- 页面明确提示非正式底图。
