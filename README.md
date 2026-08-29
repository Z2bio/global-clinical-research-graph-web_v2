# Global + China Clinical Research Graph v2.1.0

面向普通用户、医生、研究者和行业人员的 **全球 + 中国临床研究公开信息图谱**。

本版在 v2.0 四层数据源架构上，重点升级了“研究分类体系”和筛选逻辑，避免把 **数据来源、IIT/注册性、研究类型、药物试验阶段** 混成一个维度。

## 四层数据源

1. **Layer 1｜全球主注册层**：ClinicalTrials.gov
2. **Layer 2｜全球跨注册中心层**：WHO ICTRP
3. **Layer 3｜中国广义临床研究层**：ChiCTR + 国家医学研究登记备案信息系统
4. **Layer 4｜中国药物注册监管层**：NMPA 药物临床试验登记与信息公示平台

## v2.1 的四维分类模型

每条研究记录至少保留以下四个相互独立的维度：

```text
Source 数据来源
├── ClinicalTrials.gov
├── WHO ICTRP
├── ChiCTR
├── 国家医学研究登记备案
└── NMPA

Registration Path 研究发起/注册路径
├── 药品注册性试验
├── IIT / 研究者发起研究
├── 其他非注册性临床研究
└── 暂无法判定

Research Type 研究类型
├── 干预性
├── 观察性
├── 诊断
├── 预后
├── 病因/相关因素
├── 流行病学
├── 预防
├── 筛查
├── 卫生服务
└── 其他

Drug Development Stage 药物开发/试验阶段
├── Early Phase I
├── I / I-II / II / II-III / III / IV
├── BE
├── PK
├── 不适用
└── 未公开
```

**IIT 不是“研究分期”。** 因此 v2.1 不会把 IIT 放进 I/II/III/IV 的下拉框。

## 真实性规则

### ClinicalTrials.gov

仍通过 API V2 在用户访问时查询，并使用浏览器本地缓存降级。

但 ClinicalTrials.gov 记录本身 **不会被自动判断为“药品注册性试验”或“IIT”**。如果没有 NMPA、ChiCTR、备案等明确交叉证据，统一显示：

> 注册路径暂无法判定

### NMPA

通过 NMPA 快照适配器进入系统的记录，默认归入：

> 药品注册性试验

并可使用 `developmentStageCode` 标记 `BE`、`PK`、`PHASE1` 等阶段。

### ChiCTR

ChiCTR 记录 **不会因为来自 ChiCTR 就自动等同为 IIT**。只有导入数据明确提供：

```json
"registrationPathCode": "IIT"
```

才显示为 IIT。

### 国家医学研究登记备案

默认归入“其他非注册性临床研究”；只有导入数据明确标记 IIT 时才进一步归入 IIT。

## 新版筛选项

左侧结构化筛选包括：

- 数据来源（多选）
- 研究发起 / 注册路径
- 研究类型
- 公开状态
- 药物开发 / 试验阶段
- 执行国家/地区
- 申办方 / 主办单位类型
- 最近公开更新时间
- 更多筛选：单/多中心、是否已有结果登记
- 当前页排序

## 多源合并

系统只在存在 **完全一致的交叉注册编号** 时自动合并。

当 ClinicalTrials.gov 记录本身“注册路径未知”，但合并到明确的 NMPA 记录时，可以由 NMPA 证据把该 Canonical Study 的注册路径升级为“药品注册性试验”。

如果两个来源对同一分类维度给出冲突值，系统保留冲突标记，不靠标题相似度强制消解。

## GitHub Pages 部署

直接把本目录的全部文件覆盖到原 GitHub 仓库根目录：

```text
index.html
404.html
assets/
data/
docs/
.github/
.nojekyll
manifest.webmanifest
sw.js
...
```

然后：

```text
GitHub Desktop
→ Commit to main
→ Push origin
```

如果原仓库 Pages 已配置为：

```text
Settings → Pages
Deploy from a branch
main / (root)
```

无需重新配置。

> v2.1 已更换 Service Worker 缓存版本。发布后如第一次看到旧页面，强制刷新一次即可让新缓存接管。

## 本地检查

```bash
npm test
npm run audit
python3 -m http.server 8080
```

## 多源快照

```text
data/
├── who-ictrp.json
├── chictr.json
├── nmrr.json
├── nmpa.json
└── README.md
```

当前 WHO ICTRP、ChiCTR、国家医学研究登记备案、NMPA 的 JSON 默认仍为空，不伪装成已实时接通。获得官方授权接口、官方导出或合规 ETL 数据后，按统一结构写入即可。

## 使用边界

本项目：

- 仅整理公开研究登记信息；
- 不收集姓名、电话、病历或基因检测信息；
- 不做患者资格判断；
- 不提供一键报名；
- 不提供诊断、治疗或用药建议；
- 所有信息应可回链到官方来源核验。
