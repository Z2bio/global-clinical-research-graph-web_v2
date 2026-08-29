# GitHub Pages 部署 / 替换旧版

## 替换现有仓库

1. 解压 v2.1.0 ZIP。
2. GitHub Desktop 选择原仓库。
3. `Repository → Show in Finder`。
4. 把 v2.1.0 解压目录**里面的全部文件**复制到该仓库根目录并替换旧文件。
5. 回 GitHub Desktop，确认出现大量 Changes。
6. Commit：`Upgrade clinical research graph to v2.1.0`。
7. `Push origin`。

如果 Pages 已是：

```text
Settings → Pages
Deploy from a branch
main / (root)
```

无需重新设置。

## 缓存提醒

v2.1 把 Service Worker 缓存名升级为 `clinical-research-graph-shell-v2.1.0`。

发布后如果第一次仍看到旧页面：

- 普通刷新一次；
- 如仍旧，再强制刷新浏览器。

## 文件位置

`index.html` 必须位于仓库根目录，不能额外套一层 v2.1.0 文件夹。
