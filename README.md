# Global + China Clinical Research Graph v2.0.0

面向普通用户、医生、研究者和行业人员的 **全球 + 中国临床研究公开信息图谱**。

本版本从单一 `ClinicalTrials.gov` 查询工具升级为 **四层数据源架构**：

1. **Layer 1｜全球主注册层**：ClinicalTrials.gov
2. **Layer 2｜全球跨注册中心层**：WHO ICTRP
3. **Layer 3｜中国广义临床研究层**：ChiCTR + 国家医学研究登记备案信息系统
4. **Layer 4｜中国药物注册监管层**：NMPA 药物临床试验登记与信息公示平台

核心原则不是“把五个网站放在一起”，而是把每项 **研究 Study** 作为核心实体，连接其注册编号、疾病、干预措施、申办/发起机构、执行医院、进度、结果及多个来源记录。

## 当前真正可实时运行的能力

### ClinicalTrials.gov

已配置 API V2，GitHub Pages 用户访问时直接查询最新公开数据，同时使用浏览器本地缓存作为故障降级。

### WHO ICTRP / ChiCTR / 国家医学研究登记备案 / NMPA

已完成：

- 数据源分层 UI；
- 官方入口；
- 统一字段模型；
- 来源适配器；
- JSON 快照加载；
- 来源证据链；
- 交叉注册编号模型；
- 精确去重/合并；
- 后续 API / 官方导出接入位置。

默认 `data/*.json` 为空，因此当前不会谎称这些平台已经被实时抓取。

> GitHub Pages 只有浏览器前端。对于没有公开匿名 API、需要授权、需要下载凭证或不适合浏览器跨域调用的来源，必须通过官方授权接口、官方导出文件或合规后端 ETL 接入。

## 为什么这样设计

错误方案：

```text
ClinicalTrials.gov = 全球全部临床研究
```

更合理的模型：

```text
ClinicalTrials.gov
        +
WHO ICTRP / WHO Primary Registries
        +
ChiCTR
        +
国家医学研究登记备案
        +
NMPA 中国药物注册性试验
        ↓
Canonical Study Entity
        ↓
Global + China Clinical Research Graph
```

## 交叉注册去重原则

系统当前只在存在 **完全一致的交叉注册编号** 时自动合并，例如：

```text
ClinicalTrials.gov: NCT01234567
ChiCTR: ChiCTR2600123456
ChiCTR secondary ID: NCT01234567
```

此时可以判断两条来源记录存在明确交叉关联。

系统 **不会仅凭标题、药企或医院相似度强行合并**，避免误把不同研究当作同一个项目。

## GitHub Pages 部署

本项目无构建依赖，可直接放在仓库根目录。

推荐：

```text
Settings → Pages → Deploy from a branch
Branch: main
Folder: /(root)
```

也保留 `.github/workflows/deploy-pages.yml`，如改用 GitHub Actions 亦可。

## 本地测试

```bash
npm test
npm run audit
python3 -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

## 多源快照目录

```text
data/
├── who-ictrp.json
├── chictr.json
├── nmrr.json
├── nmpa.json
└── README.md
```

接入新的官方数据时，不需要改 UI，只需要把数据转换为统一 JSON 结构即可。

详见：

- `docs/DATA_SOURCE_MATRIX.md`
- `docs/ARCHITECTURE.md`
- `data/README.md`

## 数据与使用边界

本项目：

- 仅展示公开研究登记信息；
- 不收集姓名、电话、病历或基因检测结果；
- 不进行患者资格判断；
- 不提供一键报名；
- 不提供诊疗或用药建议；
- 不保证公开联系信息持续有效；
- 所有研究应回链至官方原始记录。

WHO ICTRP 数据另有专门的数据使用条款；若未来将本项目用于商业、营销或推广用途，必须先单独评估 WHO ICTRP 数据的使用许可。
