# GitHub Pages 部署与 v2 升级

## 已有 v1 仓库升级

当前若仓库已经发布 v1：

1. 解压 v2.0 包；
2. 将 v2.0 包中的所有文件复制到现有 GitHub 本地仓库根目录；
3. 允许覆盖同名文件；
4. GitHub Desktop 中检查 Changes；
5. Summary 建议：`Upgrade to Global + China Clinical Research Graph v2.0.0`；
6. Commit to main；
7. Push origin；
8. 等待 GitHub Pages 自动重新构建。

不需要新建仓库。

## Pages 设置

推荐继续使用：

```text
Settings → Pages
Source: Deploy from a branch
Branch: main
Folder: /(root)
```

或者使用已包含的 `.github/workflows/deploy-pages.yml` 并选择 GitHub Actions。

## 首次发布后的检查

1. 首页是否出现四层数据源架构；
2. `数据源覆盖` 页面是否显示 5 个来源卡片；
3. ClinicalTrials.gov 查询是否正常；
4. WHO / ChiCTR / NMRR / NMPA 是否明确显示当前快照状态；
5. 详情页是否出现“来源证据链与交叉注册编号”；
6. 原始来源链接是否可打开。

## 浏览器旧缓存

v2 service worker 使用新缓存名 `clinical-research-graph-shell-v2.0.0`，正常情况下旧静态缓存会自动失效。

若 GitHub Pages 已更新但浏览器仍显示 v1，可硬刷新一次：

- macOS Chrome/Safari：`Command + Shift + R`
- Windows Chrome/Edge：`Ctrl + Shift + R`
