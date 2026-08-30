# v2.4 生产准备清单

## GitHub Pages Demo 可直接使用

- [x] ClinicalTrials.gov 实时查询
- [x] ChiCTR/NMPA 定时同步框架
- [x] WHO/NMRR 合规 Feed 接入口
- [x] 多源状态可视化
- [x] 中英文 UI
- [x] 主页面列表 + 地图
- [x] 左侧显式滚动控件
- [x] 本地缓存/收藏
- [x] 不收患者敏感信息

## 正式对外前建议完成

- [ ] 配置高德正式 Key/安全方案
- [ ] GitHub Actions 首轮同步验证
- [ ] 设置 workflow 写权限
- [ ] 根据实际授权配置 WHO ICTRP Feed
- [ ] 根据可获得方式配置国内医学研究备案 Feed
- [ ] 扩充 NMPA CTR seeds 或取得稳定批量数据源
- [ ] 对 ChiCTR 增量覆盖率建立监控
- [ ] 增加数据纠错/反馈入口
- [ ] 做一次中国/海外桌面与手机浏览器实测

## 数据规模扩大后的建议

当累计研究达到数万/数十万时，不建议继续让浏览器一次加载全部 JSON：

- 数据迁移到后端数据库；
- 增加分页 API；
- 中心、疾病、申办方做独立实体表；
- 建立 canonical study 和 source record 映射；
- 保存历史状态变更；
- 增加同步监控和人工审核后台。
