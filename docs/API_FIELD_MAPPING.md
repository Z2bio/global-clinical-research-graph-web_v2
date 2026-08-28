# 统一字段模型与来源映射

## Canonical Study Model

所有来源先转换为统一结构：

| 统一字段 | 含义 |
|---|---|
| `nctId` / `canonicalId` | 当前主显示编号；兼容旧 UI 字段名 |
| `identifiers` | 各来源注册编号映射 |
| `briefTitle` / `officialTitle` | 标题 |
| `statusCode` / `statusLabel` | 研究状态 |
| `conditions` | 疾病/研究条件 |
| `interventions` | 干预措施 |
| `sponsor` | 主要申办/发起机构 |
| `collaborators` | 合作方 |
| `facilities` | 执行中心 |
| `enrollment` | 计划或实际人数 |
| `dates` | 研究时间节点 |
| `eligibility` | 入排标准 |
| `primaryOutcomes` / `secondaryOutcomes` | 结局指标 |
| `sourceRecords` | 来源证据链 |
| `sourceKey` / `sourceName` | 当前主来源 |

## ClinicalTrials.gov V2

| 统一字段 | ClinicalTrials.gov API V2 |
|---|---|
| NCT ID | `protocolSection.identificationModule.nctId` |
| 标题 | `identificationModule.briefTitle / officialTitle` |
| 状态 | `statusModule.overallStatus` |
| 疾病 | `conditionsModule.conditions` |
| 分期/类型/人数 | `designModule` |
| 申办/合作 | `sponsorCollaboratorsModule` |
| 干预/分组 | `armsInterventionsModule` |
| 联系人与执行中心 | `contactsLocationsModule` |
| 入排标准 | `eligibilityModule` |
| 结局指标 | `outcomesModule` |

## WHO ICTRP / ChiCTR / NMRR / NMPA

v2.0 使用 `data/*.json` 统一导入接口。各来源的 ETL 应至少保留：

- 来源主编号；
- 交叉注册编号（如有）；
- 原始页面 URL；
- 来源处理时间；
- 标题；
- 状态；
- 疾病；
- 申办/发起机构；
- 执行机构；
- 最近更新时间。

完整 schema 示例见 `data/README.md`。
