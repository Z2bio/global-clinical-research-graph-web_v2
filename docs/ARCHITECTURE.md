# v2.1 架构：Global + China Clinical Research Graph

## 核心实体

系统核心仍然是 `Study`，而不是 Drug。

```text
Canonical Study
├── identifiers[]
├── sourceRecords[]
├── classification
│   ├── source
│   ├── registrationPath
│   ├── researchType
│   └── developmentStage
├── conditions
├── interventions
├── sponsor / initiator
├── collaborators
├── facilities
├── investigators
├── enrollment
├── status
├── dates
├── outcomes
└── eligibility
```

## 四个不可混淆的分类维度

1. **Source**：这条证据来自哪里。
2. **Registration Path**：注册性药物试验、IIT、其他非注册研究或未知。
3. **Research Type**：干预、观察、诊断、预后等。
4. **Development Stage**：I/II/III/IV、BE、PK、N/A等。

## 多源数据流

```text
ClinicalTrials.gov API ─────┐
WHO ICTRP snapshot ─────────┤
ChiCTR snapshot ────────────┤
NMRR snapshot ──────────────┼─→ normalize
NMPA snapshot ──────────────┘
                               ↓
                       exact-ID merge
                               ↓
                  classification evidence merge
                               ↓
                       cards / detail / filters
```

## 交叉来源分类升级

例如：

```text
NCT00000001
ClinicalTrials.gov → registrationPath = UNKNOWN

CTR20260001
NMPA → registrationPath = REGULATORY_DRUG
secondary ID = NCT00000001
```

精确 ID 合并后，Canonical Study 可使用 NMPA 的明确来源证据，把注册路径升级为：

```text
REGULATORY_DRUG
```

但不会仅凭“企业申办 + III期”自动推断。

## 冲突处理

若两个已明确来源对同一维度给出互相冲突的非 UNKNOWN 分类：

- 不静默覆盖；
- 保留 `classificationWarnings`；
- 后续可在后台审核模块中人工处理。
