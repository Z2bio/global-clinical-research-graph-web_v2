# v2.3 中国地图接入与主页面地图说明

## 1. v2.3 地图入口

地图现在有两种使用方式：

1. **主公示页直接地图**：桌面端首次加载默认 `列表 + 地图`；
2. **完整研究图谱页**：顶部“研究图谱 / Research Map”。

主页面上方还可手动切换：`列表 / 列表 + 地图 / 地图`。

## 2. 为什么中国生产地图默认使用高德

本项目面向中国客户，正式地图展示优先采用在中国境内提供互联网地图服务的供应商。v2.3 的地图适配器默认实现高德地图 JS API 2.0。

项目不会把境外免费底图偷偷作为中国正式生产底图。

## 3. 配置位置

文件：`assets/js/config.js`

```js
map: {
  provider: 'amap',
  amapKey: '',
  amapSecurityJsCode: '',
  enableEnglishMapLabels: false,
  geocodeMissingChinaFacilities: true,
  geocodeBatchLimit: 60
}
```

申请高德开放平台 Web端（JS API）Key 和安全密钥 JsCode 后填写。

## 4. 无 Key 时仍直接显示

如果 Key 为空：

- 主页面地图区域仍存在；
- 使用坐标分布预览；
- 已有经纬度的执行中心仍可点击、聚合、查看关联研究；
- 页面明确提示“非正式底图”；
- 不会白屏。

正式客户演示建议配置高德 Key，以获得完整中国地图体验。

## 5. 中国执行机构缺少坐标时

部分中国登记来源只提供医院/城市名称，不直接提供经纬度。

配置高德 Key 后，v2.3 可以：

1. 读取公开医院/城市名称；
2. 调用 `AMap.Geocoder`；
3. 获取展示用坐标；
4. 缓存在浏览器本地，减少重复查询；
5. 再参与 MarkerCluster 聚合。

不会读取用户实时位置。

## 6. 坐标系

ClinicalTrials.gov `geoPoint` 进入高德地图时，对中国境内坐标调用：

```js
AMap.convertFrom(coords, 'gps', callback)
```

v2.3 对已标记为 `gcj02` 的点不会重复转换。

## 7. 中英文

- 网站 UI 可中文 / English 切换；
- 地图控件、主页面地图标题、视图切换和中心详情同步切换；
- 高德英文地图标注需要对应服务权限，`enableEnglishMapLabels` 默认关闭；
- 医学研究原始字段不因 UI 语言切换而被未经审核地改写。

## 8. GitHub Pages 与密钥

纯 GitHub Pages 无法真正隐藏前端地图凭据。

- Demo：可前端配置；
- 正式生产：建议增加安全代理/自有后端并按地图服务商安全方案管理密钥。
