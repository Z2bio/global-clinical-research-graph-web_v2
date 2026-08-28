# 多源快照目录

该目录用于承载 **WHO ICTRP / ChiCTR / 国家医学研究登记备案 / NMPA** 的合规数据快照。

默认四个 JSON 文件为空。原因是这些来源目前并非都提供可供匿名 GitHub Pages 前端直接调用的公开 REST API。本项目不会通过未授权网页抓取来伪装“实时多源覆盖”。

## 标准记录最小字段

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
  "conditions": ["疾病"],
  "sponsor": {"name": "申办/发起机构"},
  "facilities": [{"name": "执行机构", "city": "城市", "country": "国家"}],
  "sourceRecordUrl": "https://官方记录地址",
  "dates": {"lastUpdatePosted": "2026-08-28"}
}
```

其余字段为可选。前端会自动补齐“未公开”。

## 推荐接入路径

- WHO ICTRP：优先使用 WHO 允许的数据下载/SharePoint/正式 Web Service；遵守其使用条款。
- ChiCTR：优先通过官方授权、公开导出或后续官方 API 接入。
- 国家医学研究登记备案：优先使用官方公开查询/授权接口或合规数据导出。
- NMPA：优先使用药物临床试验登记与信息公示平台的官方接口/授权数据导出。

任何新接入都应保留 `sourceRecordUrl`、来源处理时间和原始注册编号，用于证据追溯。
