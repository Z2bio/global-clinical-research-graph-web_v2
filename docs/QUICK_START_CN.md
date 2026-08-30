# v2.3 五分钟部署说明（GitHub）

## 第一步：替换代码

GitHub Desktop：

`Repository → Show in Finder`

把 v2.3 `replace-root.zip` 解压后的**所有文件**覆盖进去。

然后：

`Commit to main → Push origin`

## 第二步：把 Pages 改成 GitHub Actions

GitHub 网页：

`Settings → Pages → Build and deployment → Source → GitHub Actions`

v2.3 需要这一步，才能让每天的数据同步完成后自动发布最新快照。

## 第三步：给 Actions 写权限

`Settings → Actions → General → Workflow permissions → Read and write permissions → Save`

## 第四步：手动跑第一次同步

`Actions → Sync clinical research sources and deploy → Run workflow`

成功后应看到绿色勾。

## 第五步：检查网站

1. 主页面默认应该看到“列表 + 地图”；
2. 左侧筛选右边应该有清晰的上下滚动轨道和拖拽滑块；
3. 来源状态至少可看到 CTG Live、ChiCTR seed/同步、NMPA partial/同步；
4. WHO/NMRR 未配置时应显示待授权/待数据，而不是假 Live；
5. 若未配置高德 Key，右侧地图为坐标预览；配置 Key 后切换正式地图。

## 可选：高德地图

`assets/js/config.js`

填写：

```js
amapKey: '...',
amapSecurityJsCode: '...'
```

## 可选：WHO / 国内备案 Feed

`Settings → Secrets and variables → Actions`

创建：

- `WHO_ICTRP_FEED_URL`
- `NMRR_FEED_URL`
- `NMPA_SEEDS`
