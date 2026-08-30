# v2.3 GitHub Pages 部署与自动同步

## A. 覆盖当前网页代码

1. 解压 `v2.3.0-replace-root.zip`。
2. GitHub Desktop 选择当前仓库。
3. `Repository → Show in Finder`。
4. 把 ZIP **内部全部文件**复制到仓库根目录并 Replace。
5. GitHub Desktop 应出现大量 Changes。
6. Commit：`Upgrade to v2.3.0 auto-sync map workspace`。
7. `Push origin`。

**v2.3 请把 Pages Source 改为 GitHub Actions：**

```text
Settings → Pages
Build and deployment
Source → GitHub Actions
```

这是 v2.3 与之前版本唯一需要改变的 GitHub Pages 设置。原因是定时同步 workflow 使用 `GITHUB_TOKEN` 写回 `data/` 时，该 commit 不会自动触发 branch Pages build；因此同步 workflow 会直接上传并部署最新站点构件。

## B. 开启自动数据同步

v2.3 新增：`.github/workflows/sync-sources.yml`

请检查：

```text
GitHub 仓库
→ Settings
→ Actions
→ General
→ Workflow permissions
→ Read and write permissions
```

然后进入：

```text
Actions
→ Sync public clinical research sources
→ Run workflow
```

建议第一次手动运行一次，确认：

- job 绿色通过；
- `data/source-status.json` 更新；
- 如 ChiCTR/NMPA 有变化，仓库会自动出现 bot commit。

之后 workflow 每天自动运行。

## C. 配置 WHO / 国内备案 Feed（可选）

`Settings → Secrets and variables → Actions`：

- `WHO_ICTRP_FEED_URL`
- `NMRR_FEED_URL`
- `NMPA_SEEDS`

没有这些 Secret 时，网页不会中断：对应来源继续显示“待授权 / 待数据 / 部分覆盖”。

## D. 配置正式中国地图（建议）

`assets/js/config.js`：

```js
amapKey: 'YOUR_KEY',
amapSecurityJsCode: 'YOUR_JSCODE'
```

不配置也能看到坐标预览；配置后才是完整高德底图、点聚合和中国机构名称地理编码。

## E. 发布后强制刷新

v2.3 使用新 Service Worker 缓存版本，同时主页面地图视图使用新的偏好 key。

如果仍看到旧版：

- macOS Chrome/Safari：`Command + Shift + R`；
- 或清理该站点缓存后再打开。
