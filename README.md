# Global + China Clinical Research Graph v2.3.0

面向中国客户的 **全球 + 中国临床研究公开信息图谱**。v2.3 在 v2.2.1 的多源研究模型、中文/English UI 和研究地图基础上，重点完成三件事：

1. **把地图直接放回公示主页面**：桌面端默认“列表 + 地图”，无需先进入单独地图页。
2. **把左侧结构化筛选做成真正可操作的独立滚动区**：新增始终可见的自定义滚动轨道、拖拽滑块和上下箭头，不依赖 macOS 自动隐藏系统滚动条。
3. **把“多数据源复选框”升级成自动数据管线**：ClinicalTrials.gov 继续浏览器实时查询；ChiCTR / NMPA 由 GitHub Actions 每日增量刷新；WHO ICTRP / 国家医学研究登记备案通过合规的授权/公开导出 Feed 自动导入。

> 重要：复选框只负责“选择已有数据”，不会神奇地打通数据源。v2.3 新增 `.github/workflows/sync-sources.yml + scripts/sync_sources.py`，才是自动同步层。

---

## 一、当前五类来源的真实状态

| 来源 | v2.3 模式 | 自动化状态 | 覆盖边界 |
| --- | --- | --- | --- |
| ClinicalTrials.gov | 浏览器实时 API v2 | ✅ 访问时自动查询 | 官方 API 查询范围 |
| ChiCTR | GitHub Actions + 公开最新登记页增量 | ✅ 每日自动积累 | 从启用日起增量；不是一次性历史全量镜像 |
| NMPA 药物临床试验登记 | GitHub Actions + 公开查询/CTR 种子 | ✅ 每日自动刷新 | 增量/种子覆盖；完整历史仍需稳定批量源 |
| WHO ICTRP | 授权/官方导出 Feed | 🟡 配置后自动 | 未配置授权数据源时明确显示“待授权” |
| 国家医学研究登记备案 | 公开/授权导出 Feed | 🟡 配置后自动 | 未配置机器可读 Feed 时明确显示“待数据” |

仓库预置了少量 **ChiCTR / NMPA 官方公开记录种子**，用于让多源 UI、证据链和地图联动可以被真实测试；页面会明确标识 `seeded / partial`，不会把少量样本伪装成全量数据库。

---

## 二、主页面现在直接展示地图

桌面端首次打开默认：

```text
结构化筛选      公示结果列表           执行中心地图
┌─────────┐   ┌────────────┐       ┌─────────────┐
│来源      │   │Study A      │       │   ●北京      │
│研究路径   │   │[地图定位]    │ ←→    │      ●上海   │
│研究类型   │   │Study B      │       │    ◉聚合点   │
│阶段/地区  │   │...          │       │             │
└─────────┘   └────────────┘       └─────────────┘
```

顶部可切换：

- `列表`
- `列表 + 地图`（桌面默认）
- `地图`

联动逻辑：

- 来源、研究类型、注册路径、状态、地区等筛选 → 列表与地图同时刷新；
- 点击研究卡片“地图定位” → 自动定位其公开执行中心；
- 点击医院/中心点 → 展示该中心关联研究；
- 地图支持“中国优先 / 全球”切换；
- 单独的完整“研究图谱”页面继续保留。

---

## 三、左侧筛选的可见滚动条

v2.3 不再依赖系统滚动条。

桌面端左侧具有：

- 独立滚动区域；
- 始终可见的自定义滚动槽；
- 可拖拽滑块；
- 上 / 下滚动按钮；
- 点击滚动槽快速跳转；
- 键盘 Arrow / PageUp / PageDown / Home / End；
- 右侧结果列表长度不会改变左侧筛选的可操作性。

移动端仍使用原筛选抽屉，避免把桌面交互强行缩到手机上。

---

## 四、自动同步架构

```text
                        ┌────────────────────────┐
浏览器访问 ───────────→ │ ClinicalTrials.gov API │  实时
                        └────────────────────────┘

GitHub Actions（每天）
        │
        ├──→ ChiCTR 公开最新登记页 ──→ data/chictr.json
        │
        ├──→ NMPA 公开查询 + CTR seeds ─→ data/nmpa.json
        │
        ├──→ WHO_ICTRP_FEED_URL ─────→ data/who-ictrp.json
        │      （取得允许的数据下载/Web Service 后配置）
        │
        └──→ NMRR_FEED_URL ──────────→ data/nmrr.json
               （公开/授权导出 Feed）

                         ↓
                    source-status.json
                         ↓
GitHub Pages ← 标准化快照 + CTG 实时结果 ← 多源合并/筛选/地图
```

工作流：`.github/workflows/sync-sources.yml`

同步脚本：`scripts/sync_sources.py`

默认每天中国时间约 11:25 触发（GitHub cron 可能延迟），也支持 GitHub Actions 页面手动运行。

### GitHub Secrets（可选）

在仓库：`Settings → Secrets and variables → Actions` 配置：

- `WHO_ICTRP_FEED_URL`：你依法/按条款取得的 WHO ICTRP JSON/CSV/TSV 下载 Feed；
- `NMRR_FEED_URL`：国家医学研究登记备案公开/授权导出 Feed；
- `NMPA_SEEDS`：额外的 CTR 编号或关键词，逗号分隔。

如果这些 Secret 未配置，系统不会报假“已连接”，而会在页面显示：`待授权 / 待数据 / 部分覆盖`。

---

## 五、中国地图配置

正式地图使用高德地图 JS API 2.0 适配器。

打开：`assets/js/config.js`

```js
map: {
  provider: 'amap',
  amapKey: '',
  amapSecurityJsCode: '',
  ...
}
```

填写自己的 Web(JS API) Key 与安全密钥 JsCode 后即可启用正式底图、MarkerCluster 以及中国执行机构名称地理编码。

未配置 Key 时不会白屏，系统自动使用“坐标分布预览”。

详见：`docs/MAP_SETUP_CN.md`。

---

## 六、中文 / English UI

顶部 `中文 / EN`：

- 导航、筛选、数据源状态、地图操作、按钮和说明支持中英文切换；
- 官方研究标题、入排标准、研究方案等医学原文原则上保留登记源语言；
- 不把未经审核的机器翻译当作官方医学内容。

---

## 七、部署到现有 GitHub Pages

将 **replace-root ZIP 解压后的全部文件**覆盖现有仓库根目录，然后：

```text
GitHub Desktop
→ Commit to main
→ Push origin
→ GitHub Actions 自动部署 GitHub Pages
```

**v2.3 为了让定时同步后的数据一定发布到网页，Pages 发布源应切换为 GitHub Actions。**

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

原因：GitHub 官方明确说明，用 `GITHUB_TOKEN` 推送的 workflow commit 不会再次触发 Pages branch build。v2.3 的同步 workflow 因此会在同步后直接部署 Pages。

同时需要确认 workflow 能写回快照：

```text
Settings
→ Actions
→ General
→ Workflow permissions
→ Read and write permissions
```

如果组织策略不允许写入，定时抓取仍可运行，但无法自动 commit 数据，需要改用外部存储或手动导入。

详见：`docs/DEPLOYMENT.md`、`docs/AUTOMATIC_SOURCE_SYNC.md`。

---

## 八、本地校验

```bash
npm test
npm run audit
npm run check
python -m py_compile scripts/sync_sources.py
```

当前 v2.3.0：

- `18 / 18` 自动化测试通过；
- `29` 个必需文件审计通过；
- `23` 项 HTML 检查通过；
- `153` 个 DOM ID 引用检查通过；
- `14` 个 JavaScript 模块语法/结构审计通过。

---

## 九、边界

- 本平台展示公开临床研究登记信息，不构成诊断、治疗建议、入组资格判断或报名保证。
- 不绕过登录、验证码、反爬或访问控制。
- WHO ICTRP / 国家医学研究登记备案若没有合规机器可读数据来源，不伪装成实时连接。
- 中国境内正式地图建议配置合规互联网地图服务，并按地图服务商及监管要求展示相关标识。

## 版本

- v2.1：Global + China Clinical Research Graph 数据模型基线
- v2.2：Research Map + 中英文 UI
- v2.2.1：左侧独立滚动修复
- **v2.3.0：自动源同步 + 主页面直接地图 + 显式可拖拽筛选滚动条**
