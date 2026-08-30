# v2.4 GitHub Pages 快速部署

## 1. 覆盖代码

将 `v2.4.0-replace-root.zip` 解压后的全部文件覆盖到 GitHub Desktop 当前仓库目录。

然后：

```text
Commit to main
→ Push origin
```

## 2. Pages 使用 GitHub Actions

GitHub：

```text
Settings → Pages
→ Build and deployment
→ Source = GitHub Actions
```

## 3. 允许同步 workflow 写回数据

```text
Settings → Actions → General
→ Workflow permissions
→ Read and write permissions
```

## 4. 配置正式中国地图（推荐）

```text
Settings → Secrets and variables → Actions → Variables
```

新增：

- `AMAP_WEB_KEY`
- `AMAP_SECURITY_JSCODE`
- `AMAP_ENGLISH_LABELS` = `false`（需要并已具备英文标签能力时改 `true`）

不配置时仍有坐标预览，不会白屏。

## 5. 可选数据 Feed

在 `Secrets` 中可配置：

- `WHO_ICTRP_FEED_URL`
- `NMRR_FEED_URL`
- `NMPA_SEEDS`

ChiCTR / NMPA 的公开增量/回填无需上述两个 Feed；WHO/NMRR 在未配置官方/授权机器可读来源时不会伪报为全量实时连接。

## 6. 第一次手动运行

```text
Actions
→ Sync clinical research sources and deploy
→ Run workflow
```

等待绿色 `✓` 后访问 Pages。

## 7. v2.4 人工验收点

- 右上按钮应显示“列表 / 列表 + 地图 / 地图”，不能显示 `viewList` 等 key；
- 左侧结构化筛选可收起/展开；
- 列表与地图分隔条可拖动；
- “中国优先 / 全球视野”应明显改变地图范围；
- 地图聚合点应为正圆且数字居中；
- 中英文 UI 切换正常；
- 来源状态不能把“待 Feed”误写成“实时”。
