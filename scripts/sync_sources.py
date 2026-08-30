#!/usr/bin/env python3
"""Scheduled multi-source synchronizer for Global + China Clinical Research Graph.

Design goals:
- never bypass authentication, CAPTCHAs, or access controls;
- use public pages only where they are openly accessible;
- use authorized/export feeds for WHO ICTRP and NMRR when configured;
- preserve last good snapshots if a source is temporarily unavailable;
- write explicit source health metadata so the UI never pretends an unavailable
  source is live.

This script is intended for GitHub Actions or a small trusted backend.
"""
from __future__ import annotations

import csv
import io
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
IMPORT = DATA / "import"
DATA.mkdir(exist_ok=True)
IMPORT.mkdir(exist_ok=True)

NOW = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
USER_AGENT = os.getenv(
    "CRG_USER_AGENT",
    "GlobalClinicalResearchGraph/2.3 (+public research metadata aggregator; contact via repository)",
)
TIMEOUT = int(os.getenv("CRG_HTTP_TIMEOUT", "25"))
MAX_RECORDS = int(os.getenv("CRG_MAX_SNAPSHOT_RECORDS", "5000"))
CHICTR_DETAIL_LIMIT = int(os.getenv("CHICTR_DETAIL_LIMIT", "10"))
REQUEST_DELAY = float(os.getenv("CRG_REQUEST_DELAY_SECONDS", "0.45"))

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"})


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path: Path, payload: Any) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def unique(items: Iterable[str]) -> list[str]:
    out, seen = [], set()
    for item in items:
        item = text(item)
        if item and item.lower() not in seen:
            seen.add(item.lower())
            out.append(item)
    return out


def fetch(url: str, *, params: dict[str, Any] | None = None) -> requests.Response:
    r = SESSION.get(url, params=params, timeout=TIMEOUT)
    r.raise_for_status()
    return r


def merge_snapshot(path: Path, source_name: str, new_records: list[dict[str, Any]], note: str = "") -> dict[str, Any]:
    old = read_json(path, {"records": []})
    by_id: dict[str, dict[str, Any]] = {}
    for record in old.get("records", []):
        rid = text(record.get("id") or record.get("primaryId"))
        if rid:
            by_id[rid] = record
    for record in new_records:
        rid = text(record.get("id") or record.get("primaryId"))
        if not rid:
            continue
        previous = by_id.get(rid, {})
        # New values win, but keep richer old fields when the latest list page is sparse.
        merged = {**previous, **{k: v for k, v in record.items() if v not in (None, "", [], {})}}
        by_id[rid] = merged
    records = list(by_id.values())
    records.sort(key=lambda r: text(r.get("registeredAt") or r.get("lastUpdate") or r.get("updatedAt")), reverse=True)
    records = records[:MAX_RECORDS]
    payload = {
        "generatedAt": NOW,
        "sourceProcessedAt": NOW,
        "note": note,
        "sourceName": source_name,
        "recordCount": len(records),
        "records": records,
    }
    write_json(path, payload)
    return payload


def infer_stage(title: str) -> tuple[str, str]:
    t = title.lower()
    if "生物等效" in title or re.search(r"\bBE\b", title, re.I):
        return "BE", "BE 生物等效性试验"
    if "药代" in title or re.search(r"\bPK\b", title, re.I):
        return "PK", "PK 药代动力学试验"
    patterns = [
        (r"\bphase\s*iii\b|Ⅲ期|iii期|3期", "PHASE3", "Ⅲ期"),
        (r"\bphase\s*ii\b|Ⅱ期|ii期|2期", "PHASE2", "Ⅱ期"),
        (r"\bphase\s*i\b|Ⅰ期|\bi期|1期", "PHASE1", "Ⅰ期"),
        (r"\bphase\s*iv\b|Ⅳ期|iv期|4期", "PHASE4", "Ⅳ期"),
    ]
    # Compound phases before single phases.
    if re.search(r"phase\s*i\s*/\s*ii|Ⅰ/Ⅱ|i/ii", t, re.I):
        return "PHASE1_PHASE2", "Ⅰ/Ⅱ期"
    if re.search(r"phase\s*ii\s*/\s*iii|Ⅱ/Ⅲ|ii/iii", t, re.I):
        return "PHASE2_PHASE3", "Ⅱ/Ⅲ期"
    for pattern, code, label in patterns:
        if re.search(pattern, title, re.I):
            return code, label
    return "UNKNOWN", "阶段未公开"


def map_research_type(value: str) -> tuple[str, str]:
    v = value.lower()
    if "interventional" in v or "干预" in value:
        return "INTERVENTIONAL", "干预性研究"
    if "observational" in v or "观察" in value:
        return "OBSERVATIONAL", "观察性研究"
    if "diagnostic" in v or "诊断" in value:
        return "DIAGNOSTIC", "诊断研究"
    if "prognostic" in v or "预后" in value:
        return "PROGNOSTIC", "预后研究"
    if "epidemi" in v or "流行病" in value:
        return "EPIDEMIOLOGIC", "流行病学研究"
    return "OTHER", value or "其他研究"


def map_status(value: str) -> tuple[str, str]:
    v = value.lower()
    rules = [
        (("招募中", "recruiting"), "RECRUITING", "招募中"),
        (("尚未招募", "not yet recruiting"), "NOT_YET_RECRUITING", "尚未招募"),
        (("招募完成", "active, not recruiting", "not recruiting"), "ACTIVE_NOT_RECRUITING", "进行中，不再招募"),
        (("暂停", "suspended"), "SUSPENDED", "暂停"),
        (("终止", "terminated"), "TERMINATED", "已终止"),
        (("已完成", "completed"), "COMPLETED", "已完成"),
    ]
    for needles, code, label in rules:
        if any(n.lower() in v for n in needles):
            return code, label
    return "UNKNOWN", value or "状态未公开"


def chictr_row_records(html: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    out: list[dict[str, Any]] = []
    for row in soup.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if len(cells) < 4:
            continue
        row_text = " | ".join(text(c.get_text(" ", strip=True)) for c in cells)
        m = re.search(r"\b(ChiCTR[-A-Z0-9]+|ChiCTR\d+)\b", row_text, re.I)
        if not m:
            continue
        rid = m.group(1)
        title_anchor = None
        for a in row.find_all("a", href=True):
            if "showproj" in a["href"].lower():
                title_anchor = a
                break
        # Usual columns: history | registration no | public title+institution | type | date.
        public_cell = cells[2] if len(cells) >= 5 else cells[1]
        title = text(title_anchor.get_text(" ", strip=True)) if title_anchor else text(public_cell.get_text(" ", strip=True))
        public_cell_text = text(public_cell.get_text(" ", strip=True))
        institution = text(public_cell_text.replace(title, "", 1)) if title else ""
        study_type = text(cells[-2].get_text(" ", strip=True))
        reg_date = text(cells[-1].get_text(" ", strip=True))
        rtype_code, rtype_label = map_research_type(study_type)
        stage_code, stage_label = infer_stage(title)
        url = urljoin("https://www.chictr.org.cn/", title_anchor["href"]) if title_anchor else f"https://www.chictr.org.cn/searchprojEN.html?registrationnumber={rid}"
        record = {
            "id": rid,
            "identifiers": {"chictr": rid},
            "title": title or rid,
            "briefTitle": title or rid,
            "officialTitle": title or rid,
            "researchTypeCode": rtype_code,
            "researchTypeLabel": rtype_label,
            "studyType": rtype_code,
            "developmentStageCode": stage_code,
            "developmentStageLabel": stage_label,
            "registrationPathCode": "UNKNOWN",
            "registrationPathNote": "ChiCTR 登记本身不能自动等同为 IIT 或药品注册性试验；无明确证据时保持未判定。",
            "registeredAt": reg_date,
            "lastUpdate": reg_date,
            "sourceRecordUrl": url,
            "facilities": ([{"name": institution, "country": "China"}] if institution else []),
            "countries": ["China"],
        }
        out.append(record)
    return out


def chictr_detail_enrich(record: dict[str, Any]) -> dict[str, Any]:
    url = record.get("sourceRecordUrl")
    if not url or "showproj" not in url:
        return record
    try:
        time.sleep(REQUEST_DELAY)
        html = fetch(url).text
        soup = BeautifulSoup(html, "html.parser")
        rows: list[str] = []
        kv: dict[str, str] = {}
        for tr in soup.find_all("tr"):
            cells = [text(td.get_text(" ", strip=True)) for td in tr.find_all(["td", "th"])]
            if not cells:
                continue
            row_text = " | ".join(cells)
            rows.append(row_text)
            val = cells[-1] if len(cells) >= 2 else ""
            low = row_text.lower()
            for key, needles in {
                "condition": ["target disease", "研究疾病"],
                "primary_sponsor": ["primary sponsor", "研究实施负责"],
                "secondary_sponsor": ["secondary sponsor", "试验主办单位"],
                "study_leader": ["study leader", "研究负责人"],
                "intervention": ["intervention", "干预措施"],
                "recruitment": ["recruiting status", "征募研究对象"],
                "phase": ["study phase", "研究所处阶段"],
                "country": ["nation(area)", "国家"],
                "province": ["province", "省"],
                "city": ["city", "城市"],
                "unit": ["unit (hospital)", "研究实施单位", "unit(hospital)"],
                "secondary_id": ["secondary id", "在其它机构的注册号"],
            }.items():
                if key not in kv and any(n in low for n in needles):
                    kv[key] = val
        if kv.get("condition"):
            record["conditions"] = unique(re.split(r"[;；、,/]+", kv["condition"]))
        sponsor = kv.get("primary_sponsor") or kv.get("secondary_sponsor")
        if sponsor:
            record["sponsor"] = {"name": sponsor, "classLabel": "医院/高校/研究机构"}
        if kv.get("study_leader"):
            record["officials"] = [{"name": kv["study_leader"], "role": "PRINCIPAL_INVESTIGATOR"}]
        if kv.get("intervention"):
            record["interventions"] = [{"name": kv["intervention"], "description": kv["intervention"]}]
        if kv.get("recruitment"):
            code, label = map_status(kv["recruitment"])
            record["statusCode"], record["statusLabel"] = code, label
        if kv.get("phase"):
            code, label = infer_stage(kv["phase"])
            record["developmentStageCode"], record["developmentStageLabel"] = code, label
        if kv.get("secondary_id"):
            sec = re.findall(r"\b(?:NCT\d{8}|CTR\d{8}|MR-[A-Z0-9-]+)\b", kv["secondary_id"], re.I)
            ids = dict(record.get("identifiers", {}))
            for sid in sec:
                if sid.upper().startswith("NCT"):
                    ids["clinicaltrials"] = sid.upper()
                elif sid.upper().startswith("CTR"):
                    ids["nmpa"] = sid.upper()
                elif sid.upper().startswith("MR-"):
                    ids["nmrr"] = sid.upper()
            record["identifiers"] = ids
        facility_name = kv.get("unit") or (record.get("facilities") or [{}])[0].get("name")
        if facility_name:
            record["facilities"] = [{
                "name": facility_name,
                "country": kv.get("country") or "China",
                "state": kv.get("province", ""),
                "city": kv.get("city", ""),
            }]
        record["rawDetailDigest"] = " | ".join(rows[:30])[:4000]
    except Exception as e:
        record["syncWarning"] = f"detail enrichment failed: {e}"
    return record


def sync_chictr() -> tuple[dict[str, Any], dict[str, Any]]:
    path = DATA / "chictr.json"
    try:
        log("ChiCTR: fetching latest public registry page")
        r = fetch("https://www.chictr.org.cn/searchprojEN.html")
        records = chictr_row_records(r.text)
        for i in range(min(CHICTR_DETAIL_LIMIT, len(records))):
            records[i] = chictr_detail_enrich(records[i])
        payload = merge_snapshot(
            path,
            "ChiCTR",
            records,
            note="自动同步公开检索页的最新登记记录并累积保存；不绕过登录、验证码或访问控制。历史全量回填需单独的官方导出/授权方案。",
        )
        status = {
            "status": "ready" if payload["recordCount"] else "empty",
            "mode": "scheduled-public-html",
            "lastAttempt": NOW,
            "lastSuccess": NOW,
            "recordCount": payload["recordCount"],
            "coverage": "incremental-latest",
            "note": "每日读取公开最新登记页；从启用日期起增量积累。并非对历史 12 万+ 条记录的一次性全量镜像。",
        }
        return payload, status
    except Exception as e:
        old = read_json(path, {"records": []})
        status = {
            "status": "degraded" if old.get("records") else "error",
            "mode": "scheduled-public-html",
            "lastAttempt": NOW,
            "lastSuccess": old.get("generatedAt"),
            "recordCount": len(old.get("records", [])),
            "coverage": "incremental-latest",
            "note": f"同步失败，保留上次成功快照：{e}",
        }
        return old, status


def nmpa_records_from_html(html: str, source_url: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for row in soup.find_all("tr"):
        cells = [text(td.get_text(" ", strip=True)) for td in row.find_all(["td", "th"])]
        if len(cells) < 4:
            continue
        joined = " | ".join(cells)
        m = re.search(r"\bCTR\d{8}\b", joined, re.I)
        if not m:
            continue
        rid = m.group(0).upper()
        # Typical: no | CTR | status | drug | indication | plain title
        idx = next((i for i, c in enumerate(cells) if rid in c.upper()), 1)
        status_raw = cells[idx + 1] if idx + 1 < len(cells) else ""
        drug = cells[idx + 2] if idx + 2 < len(cells) else ""
        indication = cells[idx + 3] if idx + 3 < len(cells) else ""
        title = cells[idx + 4] if idx + 4 < len(cells) else (cells[-1] if cells else rid)
        status_code, status_label = map_status(status_raw)
        stage_code, stage_label = infer_stage(title)
        out.append({
            "id": rid,
            "identifiers": {"nmpa": rid},
            "briefTitle": title or rid,
            "officialTitle": title or rid,
            "statusCode": status_code,
            "statusLabel": status_label,
            "conditions": [indication] if indication else [],
            "keywords": [drug] if drug else [],
            "interventions": ([{"name": drug, "type": "DRUG", "typeLabel": "药物", "description": title}] if drug else []),
            "registrationPathCode": "REGULATORY_DRUG",
            "registrationPathNote": "记录来自国家药监局药物临床试验登记与信息公示平台，作为药品注册性临床试验路径证据展示。",
            "researchTypeCode": "INTERVENTIONAL",
            "researchTypeLabel": "干预性研究",
            "developmentStageCode": stage_code,
            "developmentStageLabel": stage_label,
            "sourceRecordUrl": f"https://www.chinadrugtrials.org.cn/clinicaltrials.searchlist.dhtml?keywords={rid}",
            "plainSummary": f"NMPA 公开登记：{drug or '研究药物未提取'}；适应症：{indication or '未提取'}。",
            "sponsor": {"name": "未公开", "classLabel": "企业/申办方"},
        })
    return out


def read_nmpa_seeds() -> list[str]:
    seeds = []
    path = DATA / "nmpa-seeds.txt"
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                seeds.append(line)
    seeds.extend([x.strip() for x in os.getenv("NMPA_SEEDS", "").split(",") if x.strip()])
    # Cross-registration identifiers discovered from ChiCTR snapshots are excellent enrichment seeds.
    chictr = read_json(DATA / "chictr.json", {"records": []})
    for record in chictr.get("records", []):
        sid = text((record.get("identifiers") or {}).get("nmpa"))
        if sid:
            seeds.append(sid)
    return unique(seeds)


def sync_nmpa() -> tuple[dict[str, Any], dict[str, Any]]:
    path = DATA / "nmpa.json"
    new_records: list[dict[str, Any]] = []
    errors = []
    # Try the public list without a keyword first. Some deployments return recent rows; if not, seeds still work.
    try:
        r = fetch("https://www.chinadrugtrials.org.cn/clinicaltrials.searchlist.dhtml")
        new_records.extend(nmpa_records_from_html(r.text, r.url))
    except Exception as e:
        errors.append(f"latest-list: {e}")
    seeds = read_nmpa_seeds()[:80]
    for seed in seeds:
        try:
            time.sleep(REQUEST_DELAY)
            r = fetch("https://www.chinadrugtrials.org.cn/clinicaltrials.searchlist.dhtml", params={"keywords": seed})
            new_records.extend(nmpa_records_from_html(r.text, r.url))
        except Exception as e:
            errors.append(f"{seed}: {e}")
    # de-duplicate before merge
    by_id = {r["id"]: r for r in new_records if r.get("id")}
    if by_id:
        payload = merge_snapshot(
            path,
            "NMPA Drug Clinical Trial Registry",
            list(by_id.values()),
            note="自动同步公开查询结果；默认结合公开列表与可配置 CTR/关键词种子做增量发现和交叉注册补充。历史全量覆盖仍需稳定官方导出/API。",
        )
        status = {
            "status": "partial",
            "mode": "scheduled-public-query",
            "lastAttempt": NOW,
            "lastSuccess": NOW,
            "recordCount": payload["recordCount"],
            "coverage": "seeded-incremental",
            "note": "自动刷新公开查询可发现的 NMPA 记录；若要系统性全量覆盖，建议取得稳定批量数据接口/导出。",
        }
        return payload, status
    old = read_json(path, {"records": []})
    return old, {
        "status": "degraded" if old.get("records") else "needs-seeds",
        "mode": "scheduled-public-query",
        "lastAttempt": NOW,
        "lastSuccess": old.get("generatedAt"),
        "recordCount": len(old.get("records", [])),
        "coverage": "seeded-incremental",
        "note": "未发现可自动解析的公开列表记录。可在 data/nmpa-seeds.txt 添加 CTR 编号/关键词，或配置稳定官方批量数据源。" + (f" 错误：{errors[:2]}" if errors else ""),
    }


def normalize_feed_rows(rows: Iterable[dict[str, Any]], source_key: str) -> list[dict[str, Any]]:
    """Normalize a deliberately simple, documented import schema.

    The feed may already use the platform schema. For generic CSV we accept common
    field names instead of guessing every registry-specific export format.
    """
    out = []
    for row in rows:
        rid = text(row.get("id") or row.get("primaryId") or row.get("registration_number") or row.get("trial_id"))
        if not rid:
            continue
        title = text(row.get("title") or row.get("public_title") or row.get("briefTitle")) or rid
        condition = text(row.get("condition") or row.get("conditions") or row.get("target_disease"))
        sponsor = text(row.get("sponsor") or row.get("primary_sponsor") or row.get("institution"))
        status_raw = text(row.get("status") or row.get("recruiting_status"))
        status_code, status_label = map_status(status_raw)
        rtype_code, rtype_label = map_research_type(text(row.get("study_type") or row.get("researchTypeLabel")))
        stage_code, stage_label = infer_stage(text(row.get("phase") or row.get("study_phase") or title))
        facilities = []
        facility = text(row.get("facility") or row.get("hospital") or row.get("unit"))
        if facility:
            facilities.append({
                "name": facility,
                "city": text(row.get("city")),
                "state": text(row.get("province") or row.get("state")),
                "country": text(row.get("country")),
            })
        record = {
            "id": rid,
            "identifiers": {source_key: rid},
            "briefTitle": title,
            "officialTitle": text(row.get("official_title")) or title,
            "conditions": [condition] if condition else [],
            "sponsor": {"name": sponsor or "未公开"},
            "statusCode": status_code,
            "statusLabel": status_label,
            "researchTypeCode": rtype_code,
            "researchTypeLabel": rtype_label,
            "developmentStageCode": stage_code,
            "developmentStageLabel": stage_label,
            "facilities": facilities,
            "registeredAt": text(row.get("registered_at") or row.get("registration_date")),
            "lastUpdate": text(row.get("updated_at") or row.get("last_update")),
            "sourceRecordUrl": text(row.get("url") or row.get("source_url")),
        }
        if source_key == "nmrr":
            record["registrationPathCode"] = text(row.get("registration_path")) or "NON_REG"
        out.append(record)
    return out


def load_feed(url: str | None, local_candidates: list[Path]) -> tuple[list[dict[str, Any]], str]:
    data: bytes | None = None
    origin = ""
    if url:
        r = fetch(url)
        data = r.content
        origin = url
    else:
        for path in local_candidates:
            if path.exists() and path.stat().st_size > 2:
                data = path.read_bytes()
                origin = str(path.relative_to(ROOT))
                break
    if data is None:
        return [], ""
    lower = origin.lower()
    if lower.endswith(".json") or data.lstrip().startswith((b"{", b"[")):
        obj = json.loads(data.decode("utf-8-sig"))
        rows = obj.get("records", obj) if isinstance(obj, dict) else obj
        return list(rows or []), origin
    # Generic CSV/TSV.
    txt = data.decode("utf-8-sig", errors="replace")
    dialect = csv.Sniffer().sniff(txt[:4000], delimiters=",\t;")
    return list(csv.DictReader(io.StringIO(txt), dialect=dialect)), origin


def sync_authorized_feed(source_key: str, display_name: str, env_var: str) -> tuple[dict[str, Any], dict[str, Any]]:
    path = DATA / ("who-ictrp.json" if source_key == "who" else "nmrr.json")
    url = os.getenv(env_var, "").strip()
    local_candidates = [
        IMPORT / f"{source_key}.json",
        IMPORT / f"{source_key}.csv",
        IMPORT / f"{source_key}.tsv",
    ]
    try:
        rows, origin = load_feed(url or None, local_candidates)
        if not rows:
            old = read_json(path, {"records": []})
            label = "authorization-required" if source_key == "who" else "feed-required"
            note = (
                "WHO ICTRP 批量/实时服务需按官方条款取得适当的数据下载或 Web Service 使用方式；配置 WHO_ICTRP_FEED_URL 或放置 data/import/who.* 后可自动同步。"
                if source_key == "who"
                else "当前未发现稳定公开机器接口；配置经授权/公开导出的 NMRR_FEED_URL 或放置 data/import/nmrr.* 后可自动同步。"
            )
            return old, {
                "status": label,
                "mode": "authorized-feed",
                "lastAttempt": NOW,
                "lastSuccess": old.get("generatedAt"),
                "recordCount": len(old.get("records", [])),
                "coverage": "configured-feed",
                "note": note,
            }
        records = normalize_feed_rows(rows, source_key)
        payload = merge_snapshot(path, display_name, records, note=f"自动导入已配置数据源：{origin}")
        return payload, {
            "status": "ready",
            "mode": "authorized-feed",
            "lastAttempt": NOW,
            "lastSuccess": NOW,
            "recordCount": payload["recordCount"],
            "coverage": "configured-feed",
            "note": f"已从配置的批量数据源自动同步：{origin}",
        }
    except Exception as e:
        old = read_json(path, {"records": []})
        return old, {
            "status": "degraded" if old.get("records") else "error",
            "mode": "authorized-feed",
            "lastAttempt": NOW,
            "lastSuccess": old.get("generatedAt"),
            "recordCount": len(old.get("records", [])),
            "coverage": "configured-feed",
            "note": f"同步失败，保留上次成功快照：{e}",
        }


def main() -> int:
    only = {x.strip() for x in os.getenv("CRG_SYNC_ONLY", "").split(",") if x.strip()}
    statuses: dict[str, Any] = {
        "generatedAt": NOW,
        "clinicaltrials": {
            "status": "live",
            "mode": "browser-live-api",
            "lastAttempt": NOW,
            "recordCount": None,
            "coverage": "full-query",
            "note": "前端访问时直接调用 ClinicalTrials.gov API v2；该源不依赖本定时任务。",
        },
    }
    tasks = [
        ("chictr", sync_chictr),
        ("nmpa", sync_nmpa),
        ("who", lambda: sync_authorized_feed("who", "WHO ICTRP", "WHO_ICTRP_FEED_URL")),
        ("nmrr", lambda: sync_authorized_feed("nmrr", "National Medical Research Registration", "NMRR_FEED_URL")),
    ]
    for key, fn in tasks:
        if only and key not in only:
            statuses[key] = {"status": "skipped", "mode": "manual", "lastAttempt": NOW, "recordCount": None, "note": "CRG_SYNC_ONLY skipped"}
            continue
        log(f"Syncing {key}...")
        _, status = fn()
        statuses[key] = status
        log(f"{key}: {status.get('status')} / {status.get('recordCount')} records")
    write_json(DATA / "source-status.json", statuses)
    log("Wrote data/source-status.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
