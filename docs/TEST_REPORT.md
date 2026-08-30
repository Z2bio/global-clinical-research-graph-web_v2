# v2.4.0 测试报告

## 自动化结果

- Node test：22 / 22 PASS
- 静态审计：PASS
- Python `scripts/sync_sources.py` 编译检查：PASS

## 静态审计范围

- 31 个必需文件；
- 26 项 HTML 检查；
- 153 个 DOM ID 引用；
- 15 个 JavaScript 模块。

## v2.4 新增回归测试

1. 筛选栏可以收起/展开；
2. 公示页列表与地图有可拖拽分隔条；
3. 完整图谱页列表可收起并可拖拽比例；
4. `viewList/viewSplit/viewMap` 不作为可见文案泄漏；
5. 坐标预览保持等比例；
6. 集群点保持圆形；
7. 中国/全球视野逻辑存在并可切换；
8. runtime 地图配置可由部署时注入；
9. ChiCTR/NMPA 同步脚本具备公开分页/回填能力；
10. 国家医学研究登记备案支持门户状态与官方 Feed 双模式。

## 浏览器说明

当前执行容器中的 headless Chromium 受到环境/DBus 策略影响，无法稳定完成截图式端到端渲染测试。因此不把“本地浏览器截图”伪报为已完成。正式推送 GitHub Pages 后仍建议在 Chrome、Safari 和微信内置浏览器各做一次人工验收。
