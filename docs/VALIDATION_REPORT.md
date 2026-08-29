# v2.1 最终验证报告

## 已验证

- GitHub Pages 根目录部署结构完整；
- `index.html` / `404.html` 可作为 SPA 壳；
- 全部 JavaScript 通过 `node --check`；
- 11 项自动化测试通过；
- 静态审计通过；
- Source、注册路径、研究类型、药物开发阶段为独立字段；
- 多源合并只使用精确交叉编号；
- Service Worker 缓存版本升级至 v2.1.0；
- WHO/ChiCTR/NMRR/NMPA 空快照不会伪装成实时接通。

## 发布后需要人工验证

- Chrome / Safari / 微信内置浏览器的响应式布局；
- GitHub Pages 首次发布后的 Service Worker 刷新；
- ClinicalTrials.gov API 在用户网络环境下的跨域访问；
- 后续导入国内来源真实快照后的字段映射准确性。
