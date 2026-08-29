# v2.0 → v2.1 升级说明

## UI

新增：

- 数据来源多选筛选；
- 研究发起/注册路径筛选；
- 研究类型筛选；
- “研究分期”更名为“药物开发/试验阶段”；
- I/II、II/III、BE、PK；
- 最近更新时间；
- 单/多中心；
- 结果登记状态；
- 卡片和详情页同步展示研究路径、研究类型、阶段和多来源标签。

## 数据模型

新增字段：

- `registrationPathCode / Label / Note`
- `researchTypeCode / Label`
- `developmentStageCode / Label`
- `centerScopeCode / Label`
- `classificationWarnings`

## 真实性策略

- ClinicalTrials.gov 不自动等同“注册性”；
- ChiCTR 不自动等同“IIT”；
- NMPA 作为药物注册性试验来源时可提供注册路径证据；
- NMRR 未显式标注 IIT 时只归为其他非注册性临床研究；
- 多源合并仍只采用精确交叉编号。
