# Global + China Clinical Research Graph v2.2.1

面向中国客户的全球 + 中国临床研究公开信息图谱。v2.2 在 v2.1 多源研究模型上新增 **研究地图 / Research Map**，并提供 **中文 / English UI** 切换。

## v2.2.1 小版本修复

- 桌面端左侧“结构化筛选”改为 **sticky + 独立纵向滚动**。
- 右侧公示结果再长，左侧筛选都可在当前视口内完整滚动查看，无需先滚到页面底部。
- 保留移动端筛选抽屉逻辑，不改变 v2.2 的地图、双语、多源筛选和联动功能。
- 增加稳定滚动槽与可见滚动条样式，便于 Mac/Windows 用户识别该区域可滚动。


## v2.2 新增能力

1. 左侧研究结果列表 + 右侧地图联动。
2. 执行医院/研究中心点位聚合展示。
3. 数据来源、研究类型、研究发起/注册路径、公开状态、国家/地区筛选与地图同步。
4. 点击地图医院/中心，查看其关联研究。
5. 点击研究卡片，自动定位到其公开执行中心。
6. 为后续 `Study → Disease → Sponsor → Facility → Source` 关系图谱预留入口。
7. 中文 / English 界面切换；研究标题和医学内容优先保留登记源原文，避免未经审核的自动医学翻译造成信息偏差。
8. 中国优先地图模式：正式中国地图优先使用高德地图 JS API；未配置 Key 时自动退化为“坐标分布预览”，不会偷偷加载境外第三方底图。

## 中国场景适配

- 地图默认“中国优先”，同时保留“全球视图”。
- 数据模型继续区分：`Source / 注册路径 / Research Type / Development Stage`。
- 中国来源保留：ChiCTR、国家医学研究登记备案、NMPA。
- ClinicalTrials.gov 的公开 `geoPoint` 被保留用于执行中心定位。
- 对中国境内 WGS84/GPS 坐标，在高德地图模式下通过 `AMap.convertFrom(..., 'gps')` 转为高德坐标后再展示。
- 不读取用户实时位置，不收集患者位置或健康信息。

## 数据源现状

| 来源 | 当前模式 |
| --- | --- |
| ClinicalTrials.gov | 访问时实时 API |
| WHO ICTRP | 标准化快照/待官方授权接口 |
| ChiCTR | 标准化快照/待正式数据接入 |
| 国家医学研究登记备案 | 标准化快照/待正式数据接入 |
| NMPA | 标准化快照/待正式数据接入 |

> v2.2 不通过未经授权的网页抓取伪装成“多源实时同步”。

## 直接部署 GitHub Pages

把本目录全部文件覆盖到现有 GitHub 仓库根目录：

```text
index.html
404.html
assets/
data/
docs/
.github/
.nojekyll
manifest.webmanifest
sw.js
...
```

然后：

```text
GitHub Desktop
→ Commit to main
→ Push origin
→ GitHub Pages 自动重新构建
```

## 配置中国地图

打开：

```text
assets/js/config.js
```

填写：

```js
map: {
  provider: 'amap',
  amapKey: 'YOUR_AMAP_WEB_JS_KEY',
  amapSecurityJsCode: 'YOUR_SECURITY_JSCODE',
  ...
}
```

未填写 Key 时，网页仍可运行，但地图区域显示 **坐标分布预览（不是正式底图）**。

### GitHub Pages 演示与正式生产的区别

纯 GitHub Pages 无法安全隐藏高德安全密钥。开发/演示阶段可以使用前端配置；正式生产建议按高德官方“JS API 安全密钥”文档，通过代理服务器保存安全密钥。

详见：`docs/MAP_SETUP_CN.md`。

## English UI

顶部 `中文 / EN` 可切换界面语言。

- UI 标签、筛选和地图模块支持中英文切换。
- 官方研究标题、入排标准、研究方案等医疗内容优先保留原注册平台语言。
- 如果未来导入 ChiCTR/NMPA 的中英文字段，可在标准化快照中使用 `zhTitle / enTitle` 扩展双语内容。
- 高德英文底图属于单独的多语言地图能力；默认配置不假设已经开通该权限。

## 本地检查

```bash
npm test
npm run audit
npm run check
```

## 版本

- Baseline: v2.1.0 Global + China Clinical Research Graph
- Current: **v2.2.1 Research Map**
