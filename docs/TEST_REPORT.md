# v2.1 测试报告

自动化测试覆盖：

1. ClinicalTrials.gov V2 标准化；
2. 中文常见疾病检索词转换；
3. 基础筛选与排序；
4. ChiCTR 快照统一模型；
5. 精确交叉注册编号合并；
6. 图谱指标计算；
7. NMPA 注册性路径默认分类；
8. ChiCTR 不自动等同 IIT；
9. 跨来源证据升级注册路径；
10. Source / Registration Path / Research Type / Development Stage 四维独立；
11. 合并研究按任一来源证据进行来源筛选；
12. 本地存储降级。

运行：

```bash
npm test
npm run audit
```
