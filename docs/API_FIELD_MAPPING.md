# v2.1 统一字段映射

## 核心研究字段

| 统一字段 | ClinicalTrials.gov | 多源快照 |
|---|---|---|
| `canonicalId` | NCT ID | 来源主编号/交叉编号合并后主实体ID |
| `identifiers` | NCT ID | ChiCTR / NCT / CTR / 备案编号等 |
| `statusCode` | `statusModule.overallStatus` | `statusCode` |
| `conditions` | `conditionsModule.conditions` | `conditions[]` |
| `sponsor` | `sponsorCollaboratorsModule.leadSponsor` | `sponsor` |
| `facilities` | `contactsLocationsModule.locations` | `facilities[]` |
| `enrollment` | `designModule.enrollmentInfo` | `enrollment` |
| `sourceRecordUrl` | ClinicalTrials.gov 原始页 | 各来源官方原始页 |

## v2.1 四维分类

### 1. 数据来源 `sourceRecords[]`

由各适配器写入，合并后可同时存在多个来源。

### 2. 研究发起 / 注册路径 `registrationPathCode`

| 值 | 含义 |
|---|---|
| `REGULATORY_DRUG` | 药品注册性试验 |
| `IIT` | IIT / 研究者发起研究 |
| `NON_REG` | 其他非注册性临床研究 |
| `UNKNOWN` | 暂无法判定 |

ClinicalTrials.gov 不提供足够证据时保持 `UNKNOWN`。

NMPA 快照在无显式值时默认 `REGULATORY_DRUG`。

### 3. 研究类型 `researchTypeCode`

ClinicalTrials.gov：

- `INTERVENTIONAL`
- `OBSERVATIONAL`
- `EXPANDED_ACCESS`

国内快照还可使用：

- `DIAGNOSTIC`
- `PROGNOSTIC`
- `ETIOLOGIC`
- `EPIDEMIOLOGIC`
- `PREVENTION`
- `SCREENING`
- `HEALTH_SERVICES`
- `OTHER`

### 4. 药物开发 / 试验阶段 `developmentStageCode`

ClinicalTrials.gov `designModule.phases` 标准化为：

- `EARLY_PHASE1`
- `PHASE1`
- `PHASE1_PHASE2`
- `PHASE2`
- `PHASE2_PHASE3`
- `PHASE3`
- `PHASE4`
- `NA`
- `UNKNOWN`

NMPA 等来源还可显式提供：

- `BE`
- `PK`

## 执行中心范围

`centerScopeCode`：`SINGLE_CENTER` / `MULTICENTER` / `UNKNOWN`。

若来源未显式提供，前端适配器根据公开执行中心数量做保守推断。
