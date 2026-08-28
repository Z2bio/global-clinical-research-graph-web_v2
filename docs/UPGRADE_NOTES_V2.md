# v2.0 升级说明

## 从 v1 到 v2 的变化

### v1

- 单源：ClinicalTrials.gov
- NCT 为主键
- 偏“全球药物/临床试验公示”

### v2

- 四层、五来源架构
- 支持 NCT / ChiCTR / NMPA CTR / 备案编号等多标识
- 新增来源证据链
- 新增交叉注册精确合并
- 新增数据源覆盖页
- 新增 WHO/ChiCTR/NMRR/NMPA 快照适配器
- 新增多源失败降级
- 新增多源来源状态
- 保留 ClinicalTrials.gov 访问时实时更新

## 替换 GitHub 仓库方法

将 v2.0 文件覆盖到原仓库根目录，提交并 Push。GitHub Pages 会自动重新部署。

因为 service worker 缓存版本已经从 v1 改为 v2，重新打开网页时旧静态资源会自动失效。
