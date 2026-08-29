# 多源快照标准 v2.1

该目录用于承载 WHO ICTRP / ChiCTR / 国家医学研究登记备案 / NMPA 的合规数据快照。

默认 JSON 为空。本项目不会通过未授权网页抓取伪装“实时多源覆盖”。

## 推荐标准记录

```json
{
  "id": "来源主编号",
  "identifiers": {
    "chictr": "ChiCTR...",
    "clinicaltrials": "NCT...",
    "nmpa": "CTR..."
  },
  "title": "研究标题",
  "statusCode": "RECRUITING",

  "registrationPathCode": "IIT",
  "registrationPathNote": "来源材料明确标记为研究者发起研究",

  "researchTypeCode": "INTERVENTIONAL",
  "developmentStageCode": "NA",

  "conditions": ["疾病"],
  "sponsor": {"name": "申办/发起机构", "className": "OTHER"},
  "facilities": [
    {"name": "执行机构", "city": "城市", "country": "China"}
  ],
  "centerScopeCode": "MULTICENTER",
  "sourceRecordUrl": "https://官方记录地址",
  "dates": {"lastUpdatePosted": "2026-08-28"}
}
```

## registrationPathCode

- `REGULATORY_DRUG`：药品注册性试验
- `IIT`：IIT / 研究者发起研究
- `NON_REG`：其他非注册性临床研究
- `UNKNOWN`：暂无法判定

### 默认规则

- NMPA：若无显式字段，默认 `REGULATORY_DRUG`
- 国家医学研究登记备案：若无显式 IIT 字段，默认 `NON_REG`
- ChiCTR：不自动等同 IIT，默认 `UNKNOWN`
- WHO ICTRP：默认 `UNKNOWN`

## researchTypeCode

可用值：

`INTERVENTIONAL`、`OBSERVATIONAL`、`DIAGNOSTIC`、`PROGNOSTIC`、`ETIOLOGIC`、`EPIDEMIOLOGIC`、`PREVENTION`、`SCREENING`、`HEALTH_SERVICES`、`EXPANDED_ACCESS`、`OTHER`、`UNKNOWN`。

## developmentStageCode

可用值：

`EARLY_PHASE1`、`PHASE1`、`PHASE1_PHASE2`、`PHASE2`、`PHASE2_PHASE3`、`PHASE3`、`PHASE4`、`BE`、`PK`、`NA`、`UNKNOWN`。

该字段仅描述药物开发/试验阶段，不用于表达 IIT。

## centerScopeCode

- `SINGLE_CENTER`
- `MULTICENTER`
- `UNKNOWN`

前端在未提供显式值时，会根据公开执行中心数量进行保守推断。
