
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {Plus, Search, Copy, FileDown, RefreshCw, X, ChevronLeft, ShieldCheck, History, Pencil, ChevronDown, ChevronUp, Minus, Sparkles, Lightbulb, AlertTriangle, ThumbsUp, ThumbsDown, Download, Columns, Trash2, Upload, BookOpen, Database} from "lucide-react";


class ErrorBoundary extends React.Component{
  constructor(props){ super(props); this.state={ hasError:false, error:null, info:null }; }
  static getDerivedStateFromError(error){ return { hasError:true, error }; }
  componentDidCatch(error, info){ this.setState({ info }); }
  render(){
    if(this.state.hasError){
      return (
        <div className="container">
          <div className="card">
            <div className="spread">
              <div>
                <div style={{fontWeight:900,fontSize:18}}>Runtime Error</div>
                <div className="muted small">The app hit an unexpected condition. Use the details below to fix quickly.</div>
              </div>
              <button className="btn" onClick={()=>{ localStorage.removeItem(LS_QUOTES); window.location.reload(); }}>
                Reset local data
              </button>
            </div>
            <hr className="sep"/>
            <div className="small" style={{whiteSpace:"pre-wrap"}}>
              {String(this.state.error?.message || this.state.error)}
            </div>
            <div className="muted small" style={{marginTop:10, whiteSpace:"pre-wrap"}}>
              {String(this.state.error?.stack || "")}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const LS_QUOTES = "serviot_beta_quotes_v6";
const LS_SYNC = "serviot_beta_sync_v6";
const LS_ROLE = "serviot_beta_role_v1"; // employee|customer
const LS_FEEDBACK = "serviot_beta_suggestion_feedback_v1";
const LS_RULES = "serviot_beta_rules_v1";
const LS_NOTES = "serviot_beta_knowledge_notes_v1";
const LS_LIBRARY = "serviot_beta_knowledge_library_v1";

const AUTO_SNAPSHOT_MINUTES = 3;
const MAX_VERSIONS_PER_QUOTE = 25;
const PRICE_HALF_LIFE_DAYS = 30;
const OVERPRICE_THRESHOLD = 0.05;
const UNDERPRICE_THRESHOLD = -0.05;

const CATEGORY_ORDER = [
  "Server Chassis","CPU","Memory","RAID Controller","Drives","Power Supplies","Rail Kit",
  "Onboard Networking","Network Daughter Card","OCP Networking","Other Networking Adapters",
  "BOSS Controller","M.2 Drives","Licensing","Bezel","Power Cords",
];

const NETWORKING_CATS = ["Onboard Networking","Network Daughter Card","OCP Networking","Other Networking Adapters"];
const OTHER_CATS = ["BOSS Controller","M.2 Drives","Licensing","Bezel","Power Cords"];

const MOCK_CUSTOMERS = [
  { id: "CUST-1001", name: "Acme Corp", reps: ["Jordan Lee", "Priya Patel"] },
  { id: "CUST-1002", name: "Pine Ridge Health", reps: ["Matt Walters", "Sofia Nguyen"] },
  { id: "CUST-1003", name: "Summit Manufacturing", reps: ["Ben Carter"] },
  { id: "CUST-1004", name: "City of Aurora", reps: ["Alyssa Kim", "Drew Martin"] },
];

const MOCK_ITEMS = [
  { sku: "379-BCQY", desc: 'PowerEdge R760 - 8 x 2.5" Chassis', cat: "Server Chassis", tags: ["R760","2U","DDR5"], price: 2150, lead: 14 },
  { sku: "379-BCR2", desc: 'PowerEdge R760 - 16 x 2.5" Chassis', cat: "Server Chassis", tags: ["R760","2U","DDR5"], price: 2395, lead: 16 },
  { sku: "379-BDTF", desc: 'PowerEdge R750 - 8 x 3.5" Chassis', cat: "Server Chassis", tags: ["R750","2U","DDR4"], price: 1750, lead: 10 },
  { sku: "379-BDTG", desc: 'PowerEdge R750 - 16 x 2.5" Chassis', cat: "Server Chassis", tags: ["R750","2U","DDR4"], price: 1890, lead: 12 },
  { sku: "379-BGAA", desc: 'PowerEdge R650 - 10 x 2.5" Chassis', cat: "Server Chassis", tags: ["R650","1U","DDR4"], price: 1550, lead: 12 },
  { sku: "379-BGAB", desc: 'PowerEdge R650 - 4 x 3.5" Chassis', cat: "Server Chassis", tags: ["R650","1U","DDR4"], price: 1495, lead: 11 },
  { sku: "379-CR66", desc: 'PowerEdge R660 - 10 x 2.5" Chassis', cat: "Server Chassis", tags: ["R660","1U","DDR5"], price: 1985, lead: 13 },
  { sku: "379-CR67", desc: 'PowerEdge R660 - 16 x EDSFF Chassis', cat: "Server Chassis", tags: ["R660","1U","DDR5"], price: 2280, lead: 15 },

  { sku: "338-CPBR", desc: "Intel Xeon Gold 6542Y - 2.9GHz - 24 Core CPU", cat: "CPU", tags: ["DDR5"], price: 2450, lead: 7 },
  { sku: "338-CPBS", desc: "Intel Xeon Gold 6530 - 2.1GHz - 32 Core CPU", cat: "CPU", tags: ["DDR5"], price: 2285, lead: 8 },
  { sku: "338-BPQR", desc: "Intel Xeon Gold 6354 - 3.0GHz - 18 Core CPU", cat: "CPU", tags: ["DDR4"], price: 1650, lead: 8 },
  { sku: "338-BPQS", desc: "Intel Xeon Gold 6330 - 2.0GHz - 28 Core CPU", cat: "CPU", tags: ["DDR4"], price: 1725, lead: 9 },

  { sku: "370-AGZR", desc: "64GB DDR5 4800MHz ECC RDIMM", cat: "Memory", tags: ["DDR5"], price: 310, lead: 5 },
  { sku: "370-AGZS", desc: "32GB DDR5 4800MHz ECC RDIMM", cat: "Memory", tags: ["DDR5"], price: 178, lead: 5 },
  { sku: "370-AFQX", desc: "64GB DDR4 3200MHz ECC RDIMM", cat: "Memory", tags: ["DDR4"], price: 225, lead: 5 },
  { sku: "370-AFQY", desc: "32GB DDR4 3200MHz ECC RDIMM", cat: "Memory", tags: ["DDR4"], price: 128, lead: 5 },

  { sku: "405-AAXT", desc: "PERC H755 RAID Controller - Front Load", cat: "RAID Controller", tags: ["SAS","SATA"], price: 640, lead: 9 },
  { sku: "405-AAXU", desc: "PERC H745 RAID Controller", cat: "RAID Controller", tags: ["SAS","SATA"], price: 540, lead: 8 },

  { sku: "400-AXTV", desc: '480GB SATA Read Intensive SSD 6Gbps - 2.5"', cat: "Drives", tags: ["SATA","RI"], price: 195, lead: 6 },
  { sku: "400-AXTW", desc: '960GB SATA Read Intensive SSD 6Gbps - 2.5"', cat: "Drives", tags: ["SATA","RI"], price: 305, lead: 6 },
  { sku: "400-BGMMM", desc: '1.92TB SAS Mix Use SSD 12Gbps - 2.5"', cat: "Drives", tags: ["SAS","MU"], price: 515, lead: 8 },
  { sku: "400-BGMMN", desc: '3.84TB SAS Mix Use SSD 12Gbps - 2.5"', cat: "Drives", tags: ["SAS","MU"], price: 895, lead: 9 },

  { sku: "450-AIQX", desc: "1100W Power Supply - 14th Gen", cat: "Power Supplies", tags: ["PSU"], price: 285, lead: 5 },
  { sku: "450-AIQY", desc: "1400W Power Supply - 14th Gen", cat: "Power Supplies", tags: ["PSU"], price: 355, lead: 5 },
  { sku: "770-BDMW", desc: "2U - ReadyRails Sliding Rail Kit", cat: "Rail Kit", tags: ["2U"], price: 130, lead: 5 },
  { sku: "770-BDMX", desc: "1U - ReadyRails Sliding Rail Kit", cat: "Rail Kit", tags: ["1U"], price: 118, lead: 5 },

  { sku: "540-BBBB", desc: "Broadcom 5720 Dual Port 1Gb LOM", cat: "Onboard Networking", tags: ["1Gb"], price: 0, lead: 0 },
  { sku: "540-BCCC", desc: "Broadcom 5720 QP 1Gb Network Daughter Card", cat: "Network Daughter Card", tags: ["1Gb"], price: 145, lead: 7 },
  { sku: "540-BCOC", desc: "Broadcom 57414 Dual Port 10GbE SFP+ OCP NIC 3.0", cat: "OCP Networking", tags: ["10Gb","SFP+"], price: 285, lead: 7 },
  { sku: "540-BCOD", desc: "Intel X710 Dual Port 10Gb SFP+ Adapter", cat: "Other Networking Adapters", tags: ["10Gb","SFP+"], price: 240, lead: 7 },

  { sku: "BOSS-S2", desc: "BOSS-S2 Controller Card", cat: "BOSS Controller", tags: ["BOSS"], price: 110, lead: 6 },
  { sku: "470-AFMF", desc: "480GB SATA M.2", cat: "M.2 Drives", tags: ["M.2"], price: 125, lead: 5 },
  { sku: "528-CTIE", desc: "iDRAC9 Enterprise 16G", cat: "Licensing", tags: ["iDRAC"], price: 295, lead: 0 },
  { sku: "325-BEZL", desc: "PowerEdge 2U Standard Bezel", cat: "Bezel", tags: ["2U"], price: 45, lead: 0 },
  { sku: "450-CORD", desc: "C13 to C14 PDU Style Power Cord - 2 Meter", cat: "Power Cords", tags: ["Cord"], price: 12, lead: 0 },
];


function extractGenericModel(item){
  const tag = (item?.tags || []).find(t => /^R\d{3,4}$/i.test(t));
  if(tag) return `PowerEdge ${tag.toUpperCase()}`;
  const m = (item?.desc || "").match(/PowerEdge\s+(R\d{3,4})/i);
  return m ? `PowerEdge ${m[1].toUpperCase()}` : "";
}
function getModelOptions(){
  const seen = new Map();
  (MOCK_ITEMS||[]).filter(i=>i.cat==="Server Chassis").forEach(i=>{
    const label = extractGenericModel(i);
    if(label && !seen.has(label)) seen.set(label, { id: label, label });
  });
  return [...seen.values()];
}
function safeParse(s, fallback){ try{ const v=JSON.parse(s); return v ?? fallback }catch{ return fallback } }
function nowIso(){ return new Date().toISOString() }
function money(n){ return (typeof n==="number" && !Number.isNaN(n)) ? n.toLocaleString(undefined,{style:"currency",currency:"USD"}) : "$0.00" }
function fmtDate(iso){ try{ return new Date(iso).toLocaleDateString() }catch{ return "" } }

function triggerDownload(filename, content, mime='application/json'){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value){
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}

function parseCsv(text=''){
  const rows=[];
  let row=[]; let cell=''; let inQuotes=false;
  const pushCell=()=>{ row.push(cell); cell=''; };
  const pushRow=()=>{ if(row.length || cell.length){ pushCell(); rows.push(row); row=[]; } };
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(inQuotes){
      if(ch==='"'){
        if(text[i+1]==='"'){ cell+='"'; i++; }
        else inQuotes=false;
      } else cell+=ch;
    } else {
      if(ch==='"') inQuotes=true;
      else if(ch===',') pushCell();
      else if(ch==='\n'){ pushRow(); }
      else if(ch==='\r'){}
      else cell+=ch;
    }
  }
  pushRow();
  if(!rows.length) return [];
  const headers = rows[0].map(h=>String(h||'').trim());
  return rows.slice(1).filter(r=>r.some(v=>String(v||'').trim())).map(r=>Object.fromEntries(headers.map((h,i)=>[h, r[i] ?? ''])));
}

function libraryCsv(docs=[]){
  const headers = ['title','category','tags','summary','filename','created_at','updated_at'];
  const lines = [headers.join(',')];
  docs.forEach(doc=>{
    const row = [doc.title, doc.category, (doc.tags||[]).join('|'), doc.summary, doc.file_name||'', doc.created_at||'', doc.updated_at||''].map(csvEscape).join(',');
    lines.push(row);
  });
  return lines.join('\n');
}

function normalizeModelLabel(value){
  const raw = String(value || '').trim();
  if(!raw || /^all models$/i.test(raw)) return 'all-models';
  if(/^amd models$/i.test(raw)) return 'amd-models';
  if(/^intel models$/i.test(raw)) return 'intel-models';
  if(/^single-socket models$/i.test(raw)) return 'single-socket-models';
  if(/^dual-socket models$/i.test(raw)) return 'dual-socket-models';
  if(/^14th gen models$/i.test(raw)) return '14th-gen-models';
  if(/^15th gen models$/i.test(raw)) return '15th-gen-models';
  const m = raw.match(/(R\d{3,4})/i);
  if(m) return m[1].toLowerCase();
  return raw.toLowerCase();
}

function normalizeComponentGroup(value){
  const raw = String(value || '').trim();
  if(!raw || /^all groups$/i.test(raw)) return 'all-groups';
  const key = raw.toLowerCase();
  const map = {
    'chassis':'Server Chassis',
    'server chassis':'Server Chassis',
    'cpu':'CPU',
    'memory':'Memory',
    'raid':'RAID Controller',
    'raid controller':'RAID Controller',
    'drives':'Drives',
    'power supplies':'Power Supplies',
    'rail kit':'Rail Kit',
    'onboard networking':'Onboard Networking',
    'network daughter card':'Network Daughter Card',
    'ocp networking':'OCP Networking',
    'other networking adapters':'Other Networking Adapters',
    'boss':'BOSS Controller',
    'boss controller':'BOSS Controller',
    'm.2':'M.2 Drives',
    'm.2 drives':'M.2 Drives',
    'licensing':'Licensing',
    'bezel':'Bezel',
    'power cords':'Power Cords',
    'general':'General',
    'model':'Model'
  };
  return map[key] || raw;
}

function loadSavedRules(){
  return safeParse(localStorage.getItem(LS_RULES), buildDefaultRules()).map(normalizeRule);
}

function loadSavedNotes(){
  return safeParse(localStorage.getItem(LS_NOTES), buildDefaultNotes()).map(normalizeNote);
}


function normalizeLibraryDoc(doc){
  return {
    id: doc?.id || `lib-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    title: doc?.title || '',
    category: doc?.category || 'General Knowledge',
    tags: Array.isArray(doc?.tags) ? doc.tags : String(doc?.tags || '').split(/[|,]/).map(x=>x.trim()).filter(Boolean),
    summary: doc?.summary || '',
    file_name: doc?.file_name || doc?.filename || '',
    file_type: doc?.file_type || '',
    file_data: doc?.file_data || '',
    active: doc?.active !== false,
    created_at: doc?.created_at || nowIso(),
    updated_at: doc?.updated_at || nowIso(),
  };
}

function buildDefaultLibraryDocs(){
  return [
    normalizeLibraryDoc({ id:'lib-1', title:'General quoting playbook', category:'Sales Playbooks', tags:['quoting','playbook'], summary:'Use this section for broader sales guidance that should be searchable outside the builder.' }),
    normalizeLibraryDoc({ id:'lib-2', title:'Firmware preparation checklist', category:'Technical Guidance', tags:['firmware','idrac','bios'], summary:'Track supporting technical documents separately from contextual builder notes.' }),
  ];
}

function loadSavedLibraryDocs(){
  return safeParse(localStorage.getItem(LS_LIBRARY), buildDefaultLibraryDocs()).map(normalizeLibraryDoc);
}

function makeQuoteId(){
  let digits=""; for(let i=0;i<9;i++) digits += Math.floor(Math.random()*10);
  return `SRVQ${digits}`;
}

function daysBetween(isoA, isoB){
  try{
    const a=new Date(isoA).getTime();
    const b=new Date(isoB).getTime();
    return Math.abs(b-a)/(1000*60*60*24);
  }catch{ return 9999; }
}

function allowedByChassis(chassis, item){
  if(!chassis) return item.cat !== "Server Chassis";
  if(item.cat==="CPU" || item.cat==="Memory"){
    const needs = item.tags.includes("DDR5") ? "DDR5" : item.tags.includes("DDR4") ? "DDR4" : null;
    if(needs) return chassis.tags.includes(needs);
  }
  if(item.cat==="Rail Kit" || item.cat==="Bezel"){
    if(item.tags.includes("2U")) return chassis.tags.includes("2U");
  }
  return true;
}

function computeTotals(lines){
  const subtotal = (lines||[]).reduce((a,l)=>a+((l.override_unit_price ?? l.catalog_unit_price)*l.qty),0);
  const overriddenLines = (lines||[]).filter(l=>l.override_unit_price!=null).length;
  const leadTimeMax = (lines||[]).reduce((m,l)=>Math.max(m,l.lead_time_days||0),0);
  return { subtotal, overriddenLines, leadTimeMax };
}

function sortLines(lines){
  return [...(lines||[])].sort((a,b)=> (CATEGORY_ORDER.indexOf(a.portal_category)-CATEGORY_ORDER.indexOf(b.portal_category)) || ((a.line_order??0)-(b.line_order??0)));
}

function readinessScore(lines){
  const required=["Server Chassis","CPU","Memory"];
  const present=new Set(lines.map(l=>l.portal_category));
  const missing=required.filter(c=>!present.has(c)).length;
  const totals=computeTotals(lines);
  let score=100;
  score -= missing*22;
  const hasRAID=present.has("RAID Controller");
  const hasDrives=present.has("Drives");
  const hasPSU=present.has("Power Supplies");
  const hasRails=present.has("Rail Kit");
  if(hasDrives && !hasRAID) score -= 10;
  if(!hasDrives) score -= 8;
  if(!hasPSU) score -= 6;
  if(!hasRails) score -= 4;
  score -= Math.min(18, Math.max(0, totals.leadTimeMax - 10));
  score -= Math.min(12, totals.overriddenLines * 3);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const band = score>=85 ? "Excellent" : score>=70 ? "Good" : score>=50 ? "Needs Work" : "Risky";
  return { score, band };
}

function scoreColor(score){
  const hue = Math.round((score/100)*120);
  return `hsl(${hue} 75% 45%)`;
}

function buildPriceHistory(quotes){
  const m = new Map();
  for(const q of (quotes||[])){
    const customer = q.customer_name || "(unknown)";
    for(const v of (q.versions||[])){
      const dt = v.created_at || q.updated_at || q.created_at;
      for(const l of ((v.configs||[]).flatMap(c=>c.lines||[])||[])){
        const price = l.override_unit_price ?? l.catalog_unit_price;
        if(!m.has(l.sku)) m.set(l.sku, []);
        m.get(l.sku).push({ date: dt, price, customer, quote_id: q.quote_id });
      }
    }
  }
  for(const [sku, arr] of m.entries()){
    arr.sort((a,b)=> new Date(b.date)-new Date(a.date));
    m.set(sku, arr);
  }
  return m;
}

function lastNHistory(historyMap, sku, n=3){
  const arr = historyMap.get(sku) || [];
  return arr.slice(0,n);
}

function weightedAvgPrice(rows, nowIsoStr){
  if(!rows?.length) return null;
  const lambda = Math.log(2) / PRICE_HALF_LIFE_DAYS;
  let num=0, den=0;
  for(const r of rows){
    const age = daysBetween(r.date, nowIsoStr);
    const w = Math.exp(-lambda * age);
    num += r.price * w;
    den += w;
  }
  return den>0 ? (num/den) : null;
}

function summarizeSelected(selectedLines){
  if(!selectedLines?.length) return "No selection";
  const parts = selectedLines.slice(0,2).map(l=>`${l.sku} ×${l.qty}`);
  const more = selectedLines.length>2 ? ` +${selectedLines.length-2} more` : "";
  return parts.join(" • ") + more;
}


function ensureConfigsOnVersion(v){
  if(v.configs && Array.isArray(v.configs)) return v;
  const cfg = {
    id: "cfg-1",
    name: "Config 1",
    qty: 1,
    created_at: v.created_at || nowIso(),
    config: v.config || { condition:"New", notes:"", chassisSku:null, _label: v.config?._label || "Initial" },
    lines: (v.configs||[]).flatMap(c=>c.lines||[]) || []
  };
  const next = { ...v, configs: [cfg] };
  next.config = { ...(v.config||{}), activeConfigId: "cfg-1", _label: v.config?._label || "Initial" };
  delete next.lines;
  return next;
}

function getActiveConfig(version){
  const activeId = version?.config?.activeConfigId || version?.configs?.[0]?.id;
  return (version.configs || []).find(c=>c.id===activeId) || (version.configs||[])[0] || null;
}


function makeConfigNamePreset(name){
  return name;
}

function cloneConfig(cfg){
  return JSON.parse(JSON.stringify(cfg));
}

function duplicateConfigInVersion(version, configId){
  const v = ensureConfigsOnVersion(version);
  const src = (v.configs||[]).find(c=>c.id===configId) || (v.configs||[])[0];
  if(!src) return v;
  const n = (v.configs||[]).length + 1;
  const id = `cfg-${Date.now()}`;
  const next = cloneConfig(src);
  next.id = id;
  next.name = `${src.name} (Copy ${n})`;
  next.qty = src.qty || 1;
  next.created_at = nowIso();
  v.configs = [...(v.configs||[]), next];
  v.config = { ...(v.config||{}), activeConfigId: id };
  return v;
}

function addConfigPresetToVersion(version, presetName, copyFromActive=false){
  const v = ensureConfigsOnVersion(version);
  const active = getActiveConfig(v);
  const n = (v.configs||[]).length + 1;
  const id = `cfg-${Date.now()}`;
  const base = (copyFromActive && active) ? cloneConfig(active) : { id, name:`Config ${n}`, qty:1, created_at: nowIso(), config:{ condition:"New", notes:"", chassisSku:null }, lines:[] };
  base.id = id;
  base.name = presetName || `Config ${n}`;
  base.qty = base.qty || 1;
  base.created_at = nowIso();
  v.configs = [...(v.configs||[]), base];
  v.config = { ...(v.config||{}), activeConfigId: id };
  return v;
}

function exportQuoteToCSV(quote){
  // CSV: Quote header + Config sections + Lines
  const rows = [];
  rows.push(["Quote ID", quote.quote_id]);
  rows.push(["Title", quote.title]);
  rows.push(["Customer", quote.customer_name]);
  rows.push(["Rep", quote.customer_rep]);
  rows.push(["Created", quote.created_at]);
  rows.push(["Updated", quote.updated_at]);
  rows.push([]);
  rows.push(["Config Name","Config Qty","Category","SKU","Description","Line Qty","Unit Price","Extended"]);
  const last = ensureConfigsOnVersion(quote.versions[quote.versions.length-1]);
  for(const cfg of (last.configs||[])){
    for(const l of (cfg.lines||[])){
      const unit = l.override_unit_price ?? l.catalog_unit_price ?? 0;
      const extLine = unit * (l.qty||1);
      const ext = extLine * (cfg.qty||1);
      rows.push([cfg.name, cfg.qty||1, l.portal_category, l.sku, l.description, l.qty||1, unit, ext]);
    }
  }
  return rows.map(r=>r.map(v=>{
    const s = String(v ?? "");
    return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(",")).join("\n");
}

function downloadText(filename, text){
  const blob = new Blob([text], { type:"text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function computeQuoteTotals(configs){
  const cfgs = configs || [];
  const totals = cfgs.map(c=>{
    const t = computeTotals(c.lines||[]);
    return { id:c.id, name:c.name, qty:c.qty||1, subtotal:t.subtotal, extended:(t.subtotal)*(c.qty||1), overriddenLines:t.overriddenLines, leadTimeMax:t.leadTimeMax };
  });
  const quoteSubtotal = totals.reduce((a,t)=>a+t.subtotal,0);
  const quoteExtended = totals.reduce((a,t)=>a+t.extended,0);
  const leadTimeMax = totals.reduce((m,t)=>Math.max(m,t.leadTimeMax||0),0);
  return { totals, quoteSubtotal, quoteExtended, leadTimeMax };
}


function updateLastVersion(quote, mutator){
  const versions = quote.versions.slice();
  const lastIdx = versions.length - 1;
  const last = JSON.parse(JSON.stringify(versions[lastIdx]));
  mutator(last);
  versions[lastIdx] = last;
  return { ...quote, versions };
}

function SearchSelect({ label, placeholder, items, value, onChange, disabled, getKey, getLabel, getSub }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = items.find((it) => getKey(it) === value) || null;

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return items;
    return items.filter((it) => {
      const l = (getLabel(it) || "").toLowerCase();
      const s = (getSub?.(it) || "").toLowerCase();
      return l.includes(n) || s.includes(n);
    });
  }, [items, q, getLabel, getSub]);

  useEffect(() => {
    function onDoc(e) {
      if (!e.target.closest?.(".ddWrap")) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="ddWrap" style={{ width: "100%", opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      {label ? <div className="small muted" style={{ marginBottom: 6 }}>{label}</div> : null}
      <input
        className="input"
        value={open ? q : (selected ? getLabel(selected) : "")}
        onChange={(e) => { setQ(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setOpen(true); setQ(""); }}
        placeholder={placeholder}
      />
      {open ? (
        <div className="ddPanel">
          {filtered.length === 0 ? (
            <div className="ddItem"><div className="ddTitle">No matches</div><div className="ddSub">Try a different search.</div></div>
          ) : filtered.map((it) => (
            <div
              key={getKey(it)}
              className="ddItem"
              onClick={() => { onChange(getKey(it)); setOpen(false); setQ(""); }}
            >
              <div className="ddTitle">{getLabel(it)}</div>
              {getSub ? <div className="ddSub">{getSub(it)}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}


const RULE_TYPE_OPTIONS = [
  { value:"max_qty", label:"Maximum quantity" },
  { value:"min_qty", label:"Minimum quantity" },
  { value:"required_if", label:"Required if" },
  { value:"forbidden_if", label:"Forbidden if" },
  { value:"recommended_if", label:"Recommended if" },
  { value:"model_restriction", label:"Model restriction" },
];
const RULE_OPERATORS = ["==",">=",">","<=","<","contains"];
const GENERIC_MODEL_RULES = [
  "All Models",
  "AMD Models",
  "Intel Models",
  "Single-Socket Models",
  "Dual-Socket Models",
  "14th Gen Models",
  "15th Gen Models",
];

function getRuleModelOptions(){
  const specific = getModelOptions().map(m=>m.label);
  const extra = ["PowerEdge R6715"];
  return [...GENERIC_MODEL_RULES, ...specific, ...extra.filter(x=>!specific.includes(x))];
}
function normalizeRule(rule){
  return {
    id: rule?.id || `rule-${Date.now()}`,
    server_model: rule?.server_model || "All Models",
    component_group: rule?.component_group || "",
    rule: rule?.rule || "",
    rule_type: rule?.rule_type || "required_if",
    condition_group: rule?.condition_group || "",
    condition_operator: rule?.condition_operator || ">=",
    condition_value: rule?.condition_value ?? "",
    action_group: rule?.action_group || "",
    action_operator: rule?.action_operator || ">=",
    action_value: rule?.action_value ?? "",
    message: rule?.message || "",
    severity: rule?.severity || "error",
    active: rule?.active !== false,
  };
}
function ruleScopeLabel(v){
  return v || "All Models";
}
function ruleTypeLabel(v){
  return RULE_TYPE_OPTIONS.find(x=>x.value===v)?.label || v || "Rule";
}
function isGenericModelRule(v){
  return GENERIC_MODEL_RULES.includes(v || "");
}
function validateRule(rule){
  const errors = {};
  if(!rule.server_model) errors.server_model = "Choose a rule scope.";
  if(!rule.component_group) errors.component_group = "Choose the component group this rule governs.";
  if(!rule.condition_group) errors.condition_group = "Choose a condition group.";
  if(!rule.action_group) errors.action_group = "Choose an action group.";
  if(rule.condition_value === "") errors.condition_value = "Enter a condition value.";
  if(rule.action_value === "") errors.action_value = "Enter an action value.";
  if(!rule.message?.trim()) errors.message = "Add the admin/user-facing message.";
  return errors;
}
function buildReadableRule(rule){
  const scope = ruleScopeLabel(rule.server_model);
  const condGroup = rule.condition_group || "condition group";
  const condOp = rule.condition_operator || "==";
  const condVal = String(rule.condition_value ?? "").trim() || "value";
  const actionGroup = rule.action_group || rule.component_group || "component group";
  const actionOp = rule.action_operator || "==";
  const actionVal = String(rule.action_value ?? "").trim() || "value";
  const type = rule.rule_type || "required_if";
  if(type==="max_qty") return `${scope}: keep ${actionGroup} ${actionOp} ${actionVal} when ${condGroup} ${condOp} ${condVal}.`;
  if(type==="min_qty") return `${scope}: require ${actionGroup} ${actionOp} ${actionVal} when ${condGroup} ${condOp} ${condVal}.`;
  if(type==="forbidden_if") return `${scope}: block ${actionGroup} when ${condGroup} ${condOp} ${condVal}.`;
  if(type==="recommended_if") return `${scope}: recommend ${actionGroup} ${actionOp} ${actionVal} when ${condGroup} ${condOp} ${condVal}.`;
  if(type==="model_restriction") return `${scope}: restrict ${actionGroup} to ${actionOp} ${actionVal}.`;
  return `${scope}: require ${actionGroup} ${actionOp} ${actionVal} when ${condGroup} ${condOp} ${condVal}.`;
}

function buildDefaultRules(){
  return [
    normalizeRule({id:"rule-1",server_model:"Intel Models",component_group:"Memory",rule_type:"required_if",condition_group:"CPU",condition_operator:">=",condition_value:"2",action_group:"Memory",action_operator:">=",action_value:"2",message:"Two DIMMs minimum when dual CPUs are selected.",severity:"error",active:true}),
    normalizeRule({id:"rule-2",server_model:"AMD Models",component_group:"CPU",rule_type:"max_qty",condition_group:"Model",condition_operator:"contains",condition_value:"R6715",action_group:"CPU",action_operator:"<=",action_value:"1",message:"R6715 supports a maximum of one CPU.",severity:"error",active:true}),
    normalizeRule({id:"rule-3",server_model:"All Models",component_group:"Drives",rule_type:"required_if",condition_group:"RAID Controller",condition_operator:">=",condition_value:"1",action_group:"Drives",action_operator:">=",action_value:"2",message:"Select at least two drives when RAID is included.",severity:"warning",active:true})
  ];
}

function inferModelAttributes(selectedModel, lines=[]){
  const model = String(selectedModel || '').trim();
  const cpuText = (lines||[]).filter(l=>l.portal_category==='CPU').map(l=>`${l.description || ''} ${l.sku || ''}`).join(' ').toLowerCase();
  const upperModel = model.toUpperCase();
  const amdModel = /(R6515|R6615|R6715|R7515|R7615)/.test(upperModel);
  const intelModel = /(R650|R660|R750|R760)/.test(upperModel);
  const vendor = cpuText.includes('amd') || amdModel ? 'AMD' : (cpuText.includes('intel') || intelModel || model ? 'Intel' : '');
  const socketCount = /(R6515|R6615|R6715|R7515|R7615)/.test(upperModel) ? 1 : (model ? 2 : 0);
  const generation = /(R650|R750|R6515|R7515)/.test(upperModel) ? 14 : (/(R660|R760|R6615|R7615|R6715)/.test(upperModel) ? 15 : null);
  return { model, vendor, socketCount, generation };
}

function getRuleMetricValue(group, selectedModel, lines=[]){
  const g = String(group || '').trim();
  if(!g) return 0;
  if(g === 'Model') return String(selectedModel || '');
  const normalized = g === 'Chassis' ? 'Server Chassis' : g;
  return (lines||[])
    .filter(l => l.portal_category === normalized)
    .reduce((sum, l) => sum + Math.max(1, Number(l.qty) || 0), 0);
}

function compareRuleValues(actual, operator, expected){
  const op = operator || '==';
  const actualNum = Number(actual);
  const expectedNum = Number(expected);
  const bothNumeric = !Number.isNaN(actualNum) && !Number.isNaN(expectedNum) && String(actual).trim() !== '' && String(expected).trim() !== '';
  if(op === 'contains') return String(actual || '').toLowerCase().includes(String(expected || '').toLowerCase());
  if(bothNumeric){
    if(op === '>=') return actualNum >= expectedNum;
    if(op === '<=') return actualNum <= expectedNum;
    if(op === '>') return actualNum > expectedNum;
    if(op === '<') return actualNum < expectedNum;
    if(op === '!=') return actualNum !== expectedNum;
    return actualNum === expectedNum;
  }
  if(op === '!=') return String(actual || '').toLowerCase() !== String(expected || '').toLowerCase();
  return String(actual || '').toLowerCase() === String(expected || '').toLowerCase();
}

function ruleMatchesScope(rule, attrs){
  const scopeKey = normalizeModelLabel(rule?.server_model || 'All Models');
  const modelKey = normalizeModelLabel(attrs?.model || '');
  if(scopeKey === 'all-models') return true;
  if(scopeKey === 'amd-models') return attrs.vendor === 'AMD';
  if(scopeKey === 'intel-models') return attrs.vendor === 'Intel';
  if(scopeKey === 'single-socket-models') return attrs.socketCount === 1;
  if(scopeKey === 'dual-socket-models') return attrs.socketCount === 2;
  if(scopeKey === '14th-gen-models') return attrs.generation === 14;
  if(scopeKey === '15th-gen-models') return attrs.generation === 15;
  return !!modelKey && scopeKey === modelKey;
}

function evaluateBuilderRules(rules, selectedModel, lines=[]){
  const attrs = inferModelAttributes(selectedModel, lines);
  return (rules || [])
    .map(normalizeRule)
    .filter(rule => rule.active !== false)
    .filter(rule => ruleMatchesScope(rule, attrs))
    .reduce((acc, rule) => {
      const conditionActual = getRuleMetricValue(rule.condition_group, selectedModel, lines);
      const conditionMet = compareRuleValues(conditionActual, rule.condition_operator, rule.condition_value);
      if(!conditionMet) return acc;
      const actionActual = getRuleMetricValue(rule.action_group || rule.component_group, selectedModel, lines);
      const passes = compareRuleValues(actionActual, rule.action_operator, rule.action_value);
      if(passes) return acc;
      acc.push({
        id: `${rule.id}:${rule.action_group || rule.component_group}`,
        ruleId: rule.id,
        severity: rule.severity === 'warning' ? 'warning' : 'error',
        message: rule.message || ruleSentence(rule),
        readableRule: ruleSentence(rule),
        component_group: rule.component_group || rule.action_group || '',
        action_group: rule.action_group || rule.component_group || '',
        condition_group: rule.condition_group || '',
        selectedModel,
        actualValue: actionActual,
        expectedValue: rule.action_value,
        operator: rule.action_operator,
      });
      return acc;
    }, []);
}

function ruleSentence(r){
  if(r?.rule?.trim()) return r.rule.trim();
  return buildReadableRule(normalizeRule(r));
}


function normalizeNote(note){
  return {
    id: note?.id || `note-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    model: note?.model || "All Models",
    component_group: note?.component_group || "General",
    keywords: Array.isArray(note?.keywords) ? note.keywords : String(note?.keywords || "").split(",").map(x=>x.trim()).filter(Boolean),
    title: note?.title || "",
    content: note?.content || "",
    priority: note?.priority || "medium",
    active: note?.active !== false,
  };
}

function buildDefaultNotes(){
  return [
    normalizeNote({id:'note-1', model:'All Models', component_group:'Drives', keywords:['raid','pairing'], title:'RAID pairing', content:'When RAID is included, favor matching drive sizes and media types for clean quoting and deployment.', priority:'high'}),
    normalizeNote({id:'note-2', model:'PowerEdge R750', component_group:'Memory', keywords:['ddr4','layout'], title:'R750 memory guidance', content:'Keep DIMMs symmetrical across CPUs and channels. Use consistent capacities to avoid support questions later.', priority:'high'}),
    normalizeNote({id:'note-3', model:'All Models', component_group:'Licensing', keywords:['idrac','management'], title:'Management baseline', content:'Include iDRAC Enterprise when remote management expectations are part of the customer discussion.', priority:'medium'}),
    normalizeNote({id:'note-4', model:'PowerEdge R760', component_group:'CPU', keywords:['preferred sku','performance'], title:'R760 preferred CPU direction', content:'Lead with balanced Gold SKUs unless the opportunity explicitly calls for max core density.', priority:'medium'})
  ];
}

function filterKnowledgeNotes(notes, { model='All Models', component_group='All Groups', keyword='' } = {}){
  const k = String(keyword || '').trim().toLowerCase();
  const selectedModelKey = normalizeModelLabel(model);
  const selectedGroup = normalizeComponentGroup(component_group);
  return (notes || []).map(normalizeNote).filter(n=>{
    if(!n.active) return false;
    const noteModelKey = normalizeModelLabel(n.model);
    const noteGroup = normalizeComponentGroup(n.component_group);
    const modelOk = selectedModelKey==='all-models' || noteModelKey==='all-models' || noteModelKey===selectedModelKey;
    const groupOk = selectedGroup==='all-groups' || noteGroup==='General' || noteGroup===selectedGroup;
    const hay = `${n.model} ${n.component_group} ${n.title} ${n.content} ${(n.keywords||[]).join(' ')}`.toLowerCase();
    const keywordOk = !k || hay.includes(k);
    return modelOk && groupOk && keywordOk;
  });
}


function parseImportedRulesText(raw, formatHint='auto'){
  const text = String(raw || '').trim();
  if(!text) return [];
  const tryJson = ()=>{
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rules) ? parsed.rules : [];
    return rows.map(normalizeRule);
  };
  const tryCsv = ()=> parseCsv(text).map(row=> normalizeRule({
    id: row.id || row.ID || `rule-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    server_model: row.server_model || row.model || row.scope || 'All Models',
    component_group: row.component_group || row.group || 'CPU',
    rule_type: row.rule_type || row.type || 'quantity_compare',
    condition_group: row.condition_group || row.conditionMetric || row.condition_group_key || row.component_group || row.group || 'CPU',
    condition_operator: row.condition_operator || row.conditionOperator || '>=' ,
    condition_value: Number(row.condition_value || row.conditionValue || 1),
    action_group: row.action_group || row.actionMetric || row.component_group || row.group || 'CPU',
    action_operator: row.action_operator || row.actionOperator || '>=',
    action_value: Number(row.action_value || row.actionValue || 1),
    severity: String(row.severity || 'error').toLowerCase(),
    message: row.message || '',
    rule: row.rule || '',
    active: String(row.active ?? 'true').toLowerCase() !== 'false',
  }));
  try{
    if(formatHint==='csv') return tryCsv();
    if(formatHint==='json') return tryJson();
    return text.startsWith('[') || text.startsWith('{') ? tryJson() : tryCsv();
  }catch(err){ throw new Error(`Unable to parse rules import: ${err.message}`); }
}

function parseImportedNotesText(raw, formatHint='auto'){
  const text = String(raw || '').trim();
  if(!text) return [];
  const tryJson = ()=>{
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.notes) ? parsed.notes : [];
    return rows.map(normalizeNote);
  };
  const tryCsv = ()=> parseCsv(text).map(row=> normalizeNote({
    id: row.id || row.ID || `note-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    model: row.model || row.server_model || 'All Models',
    component_group: row.component_group || row.group || 'General',
    keywords: row.keywords || '',
    title: row.title || '',
    content: row.content || row.note || row.summary || '',
    priority: String(row.priority || 'medium').toLowerCase(),
    active: String(row.active ?? 'true').toLowerCase() !== 'false',
  }));
  try{
    if(formatHint==='csv') return tryCsv();
    if(formatHint==='json') return tryJson();
    return text.startsWith('[') || text.startsWith('{') ? tryJson() : tryCsv();
  }catch(err){ throw new Error(`Unable to parse notes import: ${err.message}`); }
}

function parseImportedLibraryText(raw, formatHint='auto'){
  const text = String(raw || '').trim();
  if(!text) return [];
  const tryJson = ()=>{
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.library) ? parsed.library : [];
    return rows.map(normalizeLibraryDoc);
  };
  const tryCsv = ()=> parseCsv(text).map(row=> normalizeLibraryDoc({
    id: row.id || `lib-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    title: row.title || '',
    category: row.category || 'General Knowledge',
    tags: row.tags || '',
    summary: row.summary || row.content || '',
    file_name: row.filename || row.file_name || '',
    active: String(row.active ?? 'true').toLowerCase() !== 'false',
  }));
  try{
    if(formatHint==='csv') return tryCsv();
    if(formatHint==='json') return tryJson();
    return text.startsWith('[') || text.startsWith('{') ? tryJson() : tryCsv();
  }catch(err){ throw new Error(`Unable to parse knowledge library import: ${err.message}`); }
}

function exportRulesCsv(rules=[]){
  const headers = ['id','server_model','component_group','rule_type','condition_group','condition_operator','condition_value','action_group','action_operator','action_value','severity','message','rule','active'];
  return [headers.join(',')].concat((rules||[]).map(rule=> headers.map(h=> csvEscape(Array.isArray(rule[h]) ? rule[h].join('|') : rule[h] ?? '')).join(','))).join('\n');
}

function exportNotesCsv(notes=[]){
  const headers = ['id','model','component_group','keywords','title','content','priority','active'];
  return [headers.join(',')].concat((notes||[]).map(note=> headers.map(h=> csvEscape(h==='keywords' ? (note.keywords||[]).join('|') : note[h] ?? '')).join(','))).join('\n');
}

function ImportExportManager({ rules, notes, libraryDocs, setRules, setNotes, setLibraryDocs }){
  const [status, setStatus] = useState('');
  const [importMode, setImportMode] = useState('notes');
  const [replaceMode, setReplaceMode] = useState(false);
  async function readFile(file){
    return await new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = ()=>resolve(String(reader.result || ''));
      reader.onerror = ()=>reject(new Error('Unable to read file'));
      reader.readAsText(file);
    });
  }
  async function handleImport(event){
    const file = event.target.files?.[0];
    if(!file) return;
    try{
      const raw = await readFile(file);
      const formatHint = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
      if(importMode==='rules'){
        const imported = parseImportedRulesText(raw, formatHint);
        setRules(prev=> replaceMode ? imported : [...imported, ...prev.filter(existing=>!imported.some(item=>item.id===existing.id))]);
        setStatus(`Imported ${imported.length} rule${imported.length===1?'':'s'} from ${file.name}.`);
      } else if(importMode==='notes'){
        const imported = parseImportedNotesText(raw, formatHint);
        setNotes(prev=> replaceMode ? imported : [...imported, ...prev.filter(existing=>!imported.some(item=>item.id===existing.id))]);
        setStatus(`Imported ${imported.length} note${imported.length===1?'':'s'} from ${file.name}.`);
      } else {
        const imported = parseImportedLibraryText(raw, formatHint);
        setLibraryDocs(prev=> replaceMode ? imported : [...imported, ...prev.filter(existing=>!imported.some(item=>item.id===existing.id))]);
        setStatus(`Imported ${imported.length} knowledge librar${imported.length===1?'y item':'y items'} from ${file.name}.`);
      }
    } catch(err){
      setStatus(err.message || 'Import failed.');
    } finally {
      event.target.value='';
    }
  }
  function exportBundle(){
    triggerDownload(`serviot-admin-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify({ exported_at: nowIso(), rules, notes, library: libraryDocs }, null, 2));
    setStatus('Exported full Admin backup JSON.');
  }
  return (
    <div className="grid" style={{gap:12}}>
      <div className="card serviotPanel">
        <div className="spread" style={{alignItems:'start', gap:12}}>
          <div>
            <div className="sectionTitleBlue" style={{fontSize:18}}>Imports & Backups</div>
            <div className="muted small">Export rules, builder notes, and knowledge library content for backup. Bulk import JSON or CSV to seed environments faster.</div>
          </div>
          <button className="btn primary" onClick={exportBundle}><Download size={16}/> Export Full Backup</button>
        </div>
      </div>
      <div className="grid grid2wide">
        <div className="card serviotPanel">
          <div style={{fontWeight:800, marginBottom:8}}>Exports</div>
          <div className="grid" style={{gap:8}}>
            <button className="btn" onClick={()=>triggerDownload('serviot-rules-backup.json', JSON.stringify(rules, null, 2))}><FileDown size={16}/> Export Rules JSON</button>
            <button className="btn" onClick={()=>triggerDownload('serviot-rules-backup.csv', exportRulesCsv(rules), 'text/csv')}><FileDown size={16}/> Export Rules CSV</button>
            <button className="btn" onClick={()=>triggerDownload('serviot-notes-backup.json', JSON.stringify(notes, null, 2))}><FileDown size={16}/> Export Notes JSON</button>
            <button className="btn" onClick={()=>triggerDownload('serviot-notes-backup.csv', exportNotesCsv(notes), 'text/csv')}><FileDown size={16}/> Export Notes CSV</button>
            <button className="btn" onClick={()=>triggerDownload('serviot-knowledge-library.json', JSON.stringify(libraryDocs, null, 2))}><FileDown size={16}/> Export Library JSON</button>
            <button className="btn" onClick={()=>triggerDownload('serviot-knowledge-library.csv', libraryCsv(libraryDocs), 'text/csv')}><FileDown size={16}/> Export Library CSV</button>
          </div>
        </div>
        <div className="card serviotPanel">
          <div style={{fontWeight:800, marginBottom:8}}>Bulk Import</div>
          <div className="grid" style={{gap:10}}>
            <select className="input" value={importMode} onChange={(e)=>setImportMode(e.target.value)}>
              <option value="notes">Builder Notes</option>
              <option value="rules">Rules</option>
              <option value="library">Knowledge Library</option>
            </select>
            <label className="row" style={{gap:8}}><input type="checkbox" checked={replaceMode} onChange={(e)=>setReplaceMode(e.target.checked)} /><span>Replace current data instead of merge</span></label>
            <label className="btn" style={{justifyContent:'center', cursor:'pointer'}}>
              <Upload size={16}/> Upload JSON or CSV
              <input type="file" accept=".json,.csv" style={{display:'none'}} onChange={handleImport} />
            </label>
            <div className="small muted">Rules CSV should include fields like <code>server_model</code>, <code>component_group</code>, <code>condition_group</code>, <code>action_group</code>, and <code>severity</code>. Notes CSV should include <code>model</code>, <code>component_group</code>, <code>title</code>, and <code>content</code>.</div>
            {status ? <div className="small" style={{fontWeight:700}}>{status}</div> : null}
          </div>
        </div>
      </div>
      <div className="card serviotPanel">
        <div className="row" style={{flexWrap:'wrap', gap:10}}>
          <span className="badge primary">Rules: {rules.length}</span>
          <span className="badge">Notes: {notes.length}</span>
          <span className="badge">Library: {libraryDocs.length}</span>
          <span className="badge warn">Prototype storage: browser/local</span>
        </div>
        <div className="muted small" style={{marginTop:8}}>Production move will still require shared backend storage and role-based permissions. This package adds backup/import workflows so you can protect and seed knowledge before that cutover.</div>
      </div>
    </div>
  );
}

function KnowledgeLibraryManager({ libraryDocs, setLibraryDocs }){
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const categories = useMemo(()=> ['All Categories', ...new Set((libraryDocs||[]).map(doc=>normalizeLibraryDoc(doc).category))], [libraryDocs]);
  const filtered = useMemo(()=> (libraryDocs||[]).map(normalizeLibraryDoc).filter(doc=>{
    if(!doc.active) return false;
    const catOk = category==='All Categories' || doc.category===category;
    const hay = `${doc.title} ${doc.summary} ${(doc.tags||[]).join(' ')} ${doc.file_name}`.toLowerCase();
    const searchOk = !search.trim() || hay.includes(search.trim().toLowerCase());
    return catOk && searchOk;
  }), [libraryDocs, category, search]);
  function saveDoc(doc){
    const clean = normalizeLibraryDoc({ ...doc, updated_at: nowIso() });
    setLibraryDocs(prev=> prev.some(item=>normalizeLibraryDoc(item).id===clean.id) ? prev.map(item=>normalizeLibraryDoc(item).id===clean.id ? clean : item) : [clean, ...prev]);
    setEditing(null);
  }
  return (
    <div className="grid" style={{gap:12}}>
      <div className="card serviotPanel">
        <div className="spread" style={{alignItems:'start', gap:12}}>
          <div>
            <div className="sectionTitleBlue" style={{fontSize:18}}>Knowledge Library</div>
            <div className="muted small">Store broader reference material outside the builder notes system. Use this for SOPs, firmware guides, matrices, playbooks, and uploaded reference files.</div>
          </div>
          <button className="btn primary" onClick={()=>setEditing(normalizeLibraryDoc({ id:`lib-${Date.now()}` }))}>Add Library Item</button>
        </div>
      </div>
      <div className="card serviotPanel">
        <div className="rulesFilters">
          <select className="input" value={category} onChange={(e)=>setCategory(e.target.value)}>{categories.map(v=><option key={v} value={v}>{v}</option>)}</select>
          <input className="input" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search title, tags, summary, or file name" />
        </div>
      </div>
      <div className="grid" style={{gap:10}}>
        {filtered.length===0 ? <div className="card muted small">No knowledge library items match the current filters.</div> : filtered.map(doc=>(
          <div key={doc.id} className="card serviotPanel">
            <div className="spread" style={{alignItems:'start', gap:12}}>
              <div style={{minWidth:0}}>
                <div className="row" style={{flexWrap:'wrap', marginBottom:6}}>
                  <span className="badge primary">{doc.category}</span>
                  {(doc.tags||[]).slice(0,6).map(tag=><span key={tag} className="badge">{tag}</span>)}
                </div>
                <div style={{fontWeight:800}}>{doc.title || 'Untitled library item'}</div>
                <div className="small muted" style={{marginTop:6, whiteSpace:'pre-wrap'}}>{doc.summary}</div>
                <div className="small muted" style={{marginTop:8}}>{doc.file_name ? `Attached file: ${doc.file_name}` : 'No file attached'} • Updated {fmtDate(doc.updated_at)}</div>
              </div>
              <div className="row" style={{flexWrap:'wrap', justifyContent:'flex-end'}}>
                {doc.file_data ? <button className="btn" onClick={()=>{ const link=document.createElement('a'); link.href=doc.file_data; link.download=doc.file_name || 'knowledge-file'; link.click(); }}><Download size={16}/> File</button> : null}
                <button className="btn" onClick={()=>setEditing(doc)}>Edit</button>
                <button className="btn" onClick={()=>setLibraryDocs(prev=> prev.filter(item=>normalizeLibraryDoc(item).id!==doc.id))}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing ? <KnowledgeLibraryModal doc={editing} onClose={()=>setEditing(null)} onSave={saveDoc} /> : null}
    </div>
  );
}

function KnowledgeLibraryModal({ doc, onClose, onSave }){
  const [draft, setDraft] = useState(normalizeLibraryDoc(doc));
  function patch(k, v){ setDraft(prev=> ({ ...prev, [k]: v })); }
  async function handleFile(event){
    const file = event.target.files?.[0];
    if(!file) return;
    const data = await new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = ()=>resolve(String(reader.result || ''));
      reader.onerror = ()=>reject(new Error('Unable to read file'));
      reader.readAsDataURL(file);
    });
    setDraft(prev=> ({ ...prev, file_name:file.name, file_type:file.type, file_data:data }));
  }
  return (
    <Modal title="Knowledge Library Item" onClose={onClose} size="lg">
      <div className="grid" style={{gap:12}}>
        <div className="grid grid2">
          <div>
            <div className="label">Title</div>
            <input className="input" value={draft.title} onChange={(e)=>patch('title', e.target.value)} placeholder="Firmware guide, SOP, compatibility matrix..." />
          </div>
          <div>
            <div className="label">Category</div>
            <input className="input" value={draft.category} onChange={(e)=>patch('category', e.target.value)} placeholder="General Knowledge, Technical Guidance, Sales Playbooks" />
          </div>
        </div>
        <div>
          <div className="label">Tags</div>
          <input className="input" value={(draft.tags||[]).join(', ')} onChange={(e)=>patch('tags', e.target.value.split(',').map(x=>x.trim()).filter(Boolean))} placeholder="firmware, support, quoting" />
        </div>
        <div>
          <div className="label">Summary</div>
          <textarea className="input rulesTextarea" value={draft.summary} onChange={(e)=>patch('summary', e.target.value)} placeholder="What should employees know about this file or reference item?" />
        </div>
        <div className="grid grid2">
          <div>
            <div className="label">Attach file (prototype)</div>
            <label className="btn" style={{justifyContent:'center', cursor:'pointer'}}>
              <Upload size={16}/> {draft.file_name ? 'Replace File' : 'Upload File'}
              <input type="file" style={{display:'none'}} onChange={handleFile} />
            </label>
            <div className="small muted" style={{marginTop:6}}>{draft.file_name || 'No file attached yet.'}</div>
          </div>
          <div>
            <div className="label">Status</div>
            <select className="input" value={draft.active ? 'active' : 'inactive'} onChange={(e)=>patch('active', e.target.value==='active')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="spread"><div className="small muted">Prototype uploads are stored locally for now. Move these to shared backend storage in production.</div><div className="row"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={()=>onSave(draft)}>Save Item</button></div></div>
      </div>
    </Modal>
  );
}

function KnowledgeLibrarySearchPage({ libraryDocs }){
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const categories = useMemo(()=> ['All Categories', ...new Set((libraryDocs||[]).map(doc=>normalizeLibraryDoc(doc).category))], [libraryDocs]);
  const filtered = useMemo(()=> (libraryDocs||[]).map(normalizeLibraryDoc).filter(doc=>{
    if(!doc.active) return false;
    const catOk = category==='All Categories' || doc.category===category;
    const hay = `${doc.title} ${doc.summary} ${(doc.tags||[]).join(' ')} ${doc.file_name}`.toLowerCase();
    const searchOk = !search.trim() || hay.includes(search.trim().toLowerCase());
    return catOk && searchOk;
  }), [libraryDocs, category, search]);
  return (
    <div className="grid" style={{gap:12}}>
      <div className="card serviotPanel">
        <div className="spread" style={{alignItems:'start', gap:12}}>
          <div>
            <div className="sectionTitleBlue">Knowledge Library Search</div>
            <div className="muted small">Search broader Serviot knowledge outside the builder flow. This is the right place for reference documents, playbooks, and uploaded files.</div>
          </div>
          <span className="badge primary">{filtered.length} result{filtered.length===1?'':'s'}</span>
        </div>
        <hr className="sep"/>
        <div className="rulesFilters">
          <select className="input" value={category} onChange={(e)=>setCategory(e.target.value)}>{categories.map(v=><option key={v} value={v}>{v}</option>)}</select>
          <input className="input" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search title, tags, summary, or file name" />
        </div>
      </div>
      <div className="grid" style={{gap:10}}>
        {filtered.map(doc=>(
          <div key={doc.id} className="card serviotPanel">
            <div className="spread" style={{alignItems:'start', gap:12}}>
              <div style={{minWidth:0}}>
                <div className="row" style={{flexWrap:'wrap', marginBottom:6}}>
                  <span className="badge primary">{doc.category}</span>
                  {(doc.tags||[]).slice(0,8).map(tag=><span key={tag} className="badge">{tag}</span>)}
                </div>
                <div style={{fontWeight:800}}>{doc.title}</div>
                <div className="small muted" style={{marginTop:6, whiteSpace:'pre-wrap'}}>{doc.summary}</div>
                {doc.file_name ? <div className="small muted" style={{marginTop:8}}>Attached file: {doc.file_name}</div> : null}
              </div>
              {doc.file_data ? <button className="btn" onClick={()=>{ const link=document.createElement('a'); link.href=doc.file_data; link.download=doc.file_name || 'knowledge-file'; link.click(); }}><Download size={16}/> Open File</button> : null}
            </div>
          </div>
        ))}
        {filtered.length===0 ? <div className="card muted small">No knowledge library items match the current filters.</div> : null}
      </div>
    </div>
  );
}

function KnowledgeNotesManager({ notes, setNotes }){
  const modelOptions = useMemo(()=>['All Models', ...getModelOptions().map(x=>x.label)], []);
  const componentOptions = useMemo(()=>['General', ...CATEGORY_ORDER], []);
  const [modelFilter,setModelFilter] = useState('All Models');
  const [groupFilter,setGroupFilter] = useState('All Groups');
  const [keyword,setKeyword] = useState('');
  const [editing,setEditing] = useState(null);

  const filtered = useMemo(()=> filterKnowledgeNotes(notes, { model:modelFilter, component_group:groupFilter, keyword }), [notes, modelFilter, groupFilter, keyword]);

  function saveNote(note){
    const clean = normalizeNote(note);
    setNotes(prev=> prev.some(n=>normalizeNote(n).id===clean.id) ? prev.map(n=>normalizeNote(n).id===clean.id ? clean : n) : [clean, ...prev]);
    setEditing(null);
  }

  function deleteNote(id){ setNotes(prev=> prev.filter(n=>normalizeNote(n).id!==id)); }

  return (
    <div className="grid" style={{gap:12}}>
      <div className="card serviotPanel">
        <div className="spread" style={{alignItems:'start', gap:12}}>
          <div>
            <div className="sectionTitleBlue" style={{fontSize:18}}>Knowledge Notes Manager</div>
            <div className="muted small">Preserve Serviot knowledge with searchable notes for models, component groups, and quoting guidance.</div>
          </div>
          <button className="btn primary" onClick={()=>setEditing(normalizeNote({id:`note-${Date.now()}`}))}>Add Note</button>
        </div>
      </div>
      <div className="card serviotPanel">
        <div className="rulesFilters">
          <select className="input" value={modelFilter} onChange={(e)=>setModelFilter(e.target.value)}>
            <option value="All Models">All Models</option>
            {modelOptions.filter(x=>x!=='All Models').map(v=><option key={v} value={v}>{v}</option>)}
          </select>
          <select className="input" value={groupFilter} onChange={(e)=>setGroupFilter(e.target.value)}>
            <option value="All Groups">All Component Groups</option>
            {componentOptions.map(v=><option key={v} value={v}>{v}</option>)}
          </select>
          <input className="input" value={keyword} onChange={(e)=>setKeyword(e.target.value)} placeholder="Search title, content, or keywords" />
        </div>
      </div>
      <div className="grid" style={{gap:10}}>
        {filtered.length===0 ? <div className="card muted small">No notes found for the current filters.</div> : filtered.map(n=>(
          <div key={n.id} className="card serviotPanel">
            <div className="spread" style={{alignItems:'start', gap:12}}>
              <div style={{minWidth:0}}>
                <div className="row" style={{marginBottom:6, flexWrap:'wrap'}}>
                  <span className="badge primary">{n.model}</span>
                  <span className="badge">{n.component_group}</span>
                  <span className={`badge ${n.priority==='high' ? 'warn' : n.priority==='low' ? '' : 'primary'}`}>{n.priority} priority</span>
                </div>
                <div style={{fontWeight:800}}>{n.title || 'Untitled note'}</div>
                <div className="small muted" style={{marginTop:6, whiteSpace:'pre-wrap'}}>{n.content}</div>
                {(n.keywords||[]).length ? <div className="row" style={{marginTop:8, flexWrap:'wrap'}}>{n.keywords.map(k=><span key={k} className="badge">{k}</span>)}</div> : null}
              </div>
              <div className="row">
                <button className="btn" onClick={()=>setEditing(n)}>Edit</button>
                <button className="btn" onClick={()=>deleteNote(n.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing ? <KnowledgeNoteModal note={editing} onClose={()=>setEditing(null)} onSave={saveNote} modelOptions={modelOptions} componentOptions={componentOptions} /> : null}
    </div>
  );
}

function KnowledgeNoteModal({ note, onClose, onSave, modelOptions, componentOptions }){
  const [draft,setDraft] = useState(normalizeNote(note));
  function patch(k,v){ setDraft(d=>({ ...d, [k]:v })); }
  return (
    <Modal title="Edit Knowledge Note" onClose={onClose} size="lg">
      <div className="grid" style={{gap:12}}>
        <div className="grid grid2">
          <div>
            <div className="label">Model</div>
            <select className="input" value={draft.model} onChange={(e)=>patch('model', e.target.value)}>{modelOptions.map(v=><option key={v} value={v}>{v}</option>)}</select>
          </div>
          <div>
            <div className="label">Component Group</div>
            <select className="input" value={draft.component_group} onChange={(e)=>patch('component_group', e.target.value)}>{componentOptions.map(v=><option key={v} value={v}>{v}</option>)}</select>
          </div>
        </div>
        <div>
          <div className="label">Title</div>
          <input className="input" value={draft.title} onChange={(e)=>patch('title', e.target.value)} placeholder="Preferred SKUs, compatibility tips, firmware guidance..." />
        </div>
        <div>
          <div className="label">Keywords</div>
          <input className="input" value={(draft.keywords||[]).join(', ')} onChange={(e)=>patch('keywords', e.target.value.split(',').map(x=>x.trim()).filter(Boolean))} placeholder="preferred SKU, firmware, quoting strategy" />
        </div>
        <div>
          <div className="label">Note</div>
          <textarea className="input rulesTextarea" value={draft.content} onChange={(e)=>patch('content', e.target.value)} placeholder="Add the Serviot guidance that should be preserved and surfaced in the builder." />
        </div>
        <div className="grid grid2">
          <div>
            <div className="label">Priority</div>
            <select className="input" value={draft.priority} onChange={(e)=>patch('priority', e.target.value)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <div className="label">Status</div>
            <select className="input" value={draft.active ? 'active' : 'inactive'} onChange={(e)=>patch('active', e.target.value==='active')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="spread"><div className="small muted">Use concise notes so builders can scan them quickly during quoting.</div><div className="row"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={()=>onSave(draft)}>Save Note</button></div></div>
      </div>
    </Modal>
  );
}

function KnowledgePanel({ notes, selectedModel, selectedGroup, onPickGroup }){
  const [keyword,setKeyword] = useState('');
  const matched = useMemo(()=> filterKnowledgeNotes(notes, { model:selectedModel || 'All Models', component_group:selectedGroup || 'All Groups', keyword }), [notes, selectedModel, selectedGroup, keyword]);
  return (
    <div className="card serviotPanel">
      <div className="spread" style={{alignItems:'start', gap:12}}>
        <div>
          <div className="sectionTitleBlue">Knowledge Search</div>
          <div className="muted small">Search preserved notes by model, component group, or keywords while building.</div>
        </div>
        <span className="badge primary">{matched.length} matches</span>
      </div>
      <hr className="sep"/>
      <input className="input" value={keyword} onChange={(e)=>setKeyword(e.target.value)} placeholder="Search knowledge notes" />
      <div className="row" style={{marginTop:8, flexWrap:'wrap'}}>
        <button className={`configTab ${!selectedGroup ? 'active' : ''}`} onClick={()=>onPickGroup?.('')}>All</button>
        {[...new Set((matched.length ? matched : (notes||[])).map(n=>normalizeNote(n).component_group))].slice(0,8).map(group=><button key={group} className={`configTab ${selectedGroup===group ? 'active' : ''}`} onClick={()=>onPickGroup?.(group)}>{group}</button>)}
      </div>
      <div className="grid" style={{gap:8, marginTop:10}}>
        {matched.slice(0,8).map(n=>(
          <div key={n.id} className="compatRow">
            <div className="row" style={{marginBottom:6, flexWrap:'wrap'}}>
              <span className="badge">{n.component_group}</span>
              <span className="badge primary">{n.model}</span>
            </div>
            <div style={{fontWeight:800}}>{n.title}</div>
            <div className="small muted" style={{marginTop:6}}>{n.content}</div>
          </div>
        ))}
        {matched.length===0 ? <div className="muted small">No notes match the current builder context.</div> : null}
      </div>
    </div>
  );
}

function SectionKnowledgeTip({ notes }){
  if(!notes?.length) return null;
  return <span className="badge" title={`${notes.length} saved knowledge note${notes.length===1?'':'s'} available for this section`}><Lightbulb size={12}/> {notes.length} note{notes.length===1?'':'s'}</span>;
}

function SectionRuleBadge({ validationIssues=[] }){
  const errors = validationIssues.filter(issue=>issue.severity==='error').length;
  const warnings = validationIssues.filter(issue=>issue.severity==='warning').length;
  if(!errors && !warnings) return null;
  return (
    <>
      {errors ? <span className="badge danger" title={`${errors} blocking rule issue${errors===1?'':'s'}`}><AlertTriangle size={12}/> {errors} error{errors===1?'':'s'}</span> : null}
      {!errors && warnings ? <span className="badge warn" title={`${warnings} warning rule issue${warnings===1?'':'s'}`}><AlertTriangle size={12}/> {warnings} warning{warnings===1?'':'s'}</span> : null}
      {errors && warnings ? <span className="badge warn" title={`${warnings} warning rule issue${warnings===1?'':'s'}`}><AlertTriangle size={12}/> {warnings} warning{warnings===1?'':'s'}</span> : null}
    </>
  );
}

function AdminWorkspace({ rules, setRules, notes, setNotes, libraryDocs, setLibraryDocs }){
  const [adminTab,setAdminTab] = useState('rules');
  return (
    <div className="grid" style={{gap:12}}>
      <div className="card serviotPanel">
        <div className="spread" style={{alignItems:'end', gap:12}}>
          <div>
            <div className="sectionTitleBlue">Admin Workspace</div>
            <div className="muted small">Manage rule logic and preserve Serviot knowledge without changing the working builder flow.</div>
          </div>
          <div className="tabs">
            <button className={`tab ${adminTab==='rules'?'active':''}`} onClick={()=>setAdminTab('rules')}>Rule Engine</button>
            <button className={`tab ${adminTab==='notes'?'active':''}`} onClick={()=>setAdminTab('notes')}>Builder Notes</button>
            <button className={`tab ${adminTab==='imports'?'active':''}`} onClick={()=>setAdminTab('imports')}>Imports & Backups</button>
            <button className={`tab ${adminTab==='library'?'active':''}`} onClick={()=>setAdminTab('library')}>Knowledge Library</button>
          </div>
        </div>
      </div>
      {adminTab==='rules' ? <AdminRulesPage rules={rules} setRules={setRules} /> : adminTab==='notes' ? <KnowledgeNotesManager notes={notes} setNotes={setNotes} /> : adminTab==='imports' ? <ImportExportManager rules={rules} notes={notes} libraryDocs={libraryDocs} setRules={setRules} setNotes={setNotes} setLibraryDocs={setLibraryDocs} /> : <KnowledgeLibraryManager libraryDocs={libraryDocs} setLibraryDocs={setLibraryDocs} />}
    </div>
  );
}


function AdminRulesPage({ rules, setRules }){
  const modelOptions = useMemo(()=>getRuleModelOptions(), []);
  const groupOptions = useMemo(()=>CATEGORY_ORDER, []);
  const typeOptions = ["all", ...RULE_TYPE_OPTIONS.map(x=>x.value)];
  const [modelFilter,setModelFilter] = useState("All Models");
  const [groupFilter,setGroupFilter] = useState("All Groups");
  const [typeFilter,setTypeFilter] = useState("all");
  const [search,setSearch] = useState("");
  const [editing,setEditing] = useState(null);
  const normalizedRules = useMemo(()=> (rules||[]).map(normalizeRule), [rules]);
  const filtered = useMemo(()=>{
    const n = search.trim().toLowerCase();
    return normalizedRules.filter(r=>{
      const modelOk = modelFilter==="All Models" || r.server_model===modelFilter;
      const groupOk = groupFilter==="All Groups" || r.component_group===groupFilter;
      const typeOk = typeFilter==="all" || r.rule_type===typeFilter;
      const text = `${r.server_model} ${r.component_group} ${ruleSentence(r)} ${r.message}`.toLowerCase();
      const searchOk = !n || text.includes(n);
      return modelOk && groupOk && typeOk && searchOk;
    });
  },[normalizedRules,modelFilter,groupFilter,typeFilter,search]);
  function openNew(){ setEditing(normalizeRule({id:`rule-${Date.now()}`})); }
  function saveRule(rule){
    const clean = normalizeRule({ ...rule, rule: rule.rule?.trim() || buildReadableRule(rule) });
    setRules(prev=>prev.some(r=>r.id===clean.id) ? prev.map(r=>r.id===clean.id ? clean : r) : [clean,...prev]);
    setEditing(null);
  }
  function deleteRule(id){ setRules(prev=>prev.filter(r=>r.id!==id)); }
  return (
    <div className="grid" style={{gap:12}}>
      <div className="card serviotPanel">
        <div className="spread" style={{alignItems:"start", gap:12}}>
          <div>
            <div className="sectionTitleBlue" style={{fontSize:18}}>Admin Rule Engine</div>
            <div className="muted small">Create readable rules with scoped model coverage, validated component groups, and separate condition/action logic.</div>
          </div>
          <button className="btn primary" onClick={openNew}>Add Rule</button>
        </div>
      </div>
      <div className="card serviotPanel">
        <div className="rulesFilters">
          <select className="input" value={modelFilter} onChange={(e)=>setModelFilter(e.target.value)}><option value="All Models">All Model Scopes</option>{modelOptions.map(v=><option key={v} value={v}>{v}</option>)}</select>
          <select className="input" value={groupFilter} onChange={(e)=>setGroupFilter(e.target.value)}><option value="All Groups">All Component Groups</option>{groupOptions.map(v=><option key={v} value={v}>{v}</option>)}</select>
          <select className="input" value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value)}>{typeOptions.map(v=><option key={v} value={v}>{v==="all" ? "All Rule Types" : ruleTypeLabel(v)}</option>)}</select>
          <input className="input" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search rules or messages" />
        </div>
      </div>
      <div className="card serviotPanel">
        <div className="rulesTableWrap">
          <table className="rulesTable">
            <thead><tr><th>Model Scope</th><th>Component Group</th><th>Formula</th><th>Severity</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {filtered.map(r=>(
                <tr key={r.id}>
                  <td><div style={{fontWeight:700}}>{ruleScopeLabel(r.server_model)}</div><div className="small muted">{isGenericModelRule(r.server_model) ? "Generic scope" : "Specific model"}</div></td>
                  <td>{r.component_group || "—"}</td>
                  <td><div style={{fontWeight:700}}>{ruleSentence(r)}</div><div className="small muted">{r.message || "No message"}</div></td>
                  <td><span className={`badge ${r.severity==="warning" ? "warn" : r.severity==="info" ? "primary" : r.severity==="success" ? "ok" : "danger"}`}>{r.severity}</span></td>
                  <td>{r.active ? "Yes" : "No"}</td>
                  <td><div className="row"><button className="btn" onClick={()=>setEditing(normalizeRule({...r}))}>Edit</button><button className="btn" onClick={()=>deleteRule(r.id)}>Delete</button></div></td>
                </tr>
              ))}
              {filtered.length===0 ? <tr><td colSpan="6" className="muted small" style={{padding:"18px"}}>No rules found for the current filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      {editing ? <RuleEditorModal rule={editing} onClose={()=>setEditing(null)} onSave={saveRule} modelOptions={modelOptions} groupOptions={groupOptions} /> : null}
    </div>
  );
}

function RuleEditorModal({ rule, onClose, onSave, modelOptions, groupOptions }){
  const [draft,setDraft] = useState(normalizeRule(rule));
  const [errors,setErrors] = useState({});
  function patch(k,v){ setDraft(d=>({ ...d, [k]:v })); setErrors(prev=>({ ...prev, [k]: undefined })); }
  const generatedRule = useMemo(()=>buildReadableRule(draft),[draft]);
  const canAutoFill = !draft.rule?.trim() || draft.rule === generatedRule;
  function save(){
    const validation = validateRule(draft);
    setErrors(validation);
    if(Object.keys(validation).length) return;
    onSave({ ...draft, rule: canAutoFill ? generatedRule : draft.rule.trim() });
  }
  return (
    <Modal title="Edit Rule" onClose={onClose} size="lg">
      <div className="grid" style={{gap:12}}>
        <div className="ruleHeaderBar">
          <div>
            <div className="small muted">Purpose</div>
            <div style={{fontWeight:800}}>Make rule creation safe and readable</div>
          </div>
          <span className="badge primary">{ruleTypeLabel(draft.rule_type)}</span>
        </div>

        <div className="rulesEditorGrid">
          <div>
            <div className="small muted">Model Scope</div>
            <select className={`input ${errors.server_model ? "inputError" : ""}`} value={draft.server_model} onChange={(e)=>patch("server_model", e.target.value)}>
              {modelOptions.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
            {errors.server_model ? <div className="fieldError">{errors.server_model}</div> : <div className="small muted">Supports generic rules like All Models, AMD Models, and Intel Models.</div>}
          </div>
          <div>
            <div className="small muted">Target Component Group</div>
            <select className={`input ${errors.component_group ? "inputError" : ""}`} value={draft.component_group} onChange={(e)=>patch("component_group", e.target.value)}>
              <option value="">Select group</option>
              {groupOptions.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
            {errors.component_group ? <div className="fieldError">{errors.component_group}</div> : <div className="small muted">Validated list only.</div>}
          </div>
          <div>
            <div className="small muted">Rule Type</div>
            <select className="input" value={draft.rule_type} onChange={(e)=>patch("rule_type", e.target.value)}>
              {RULE_TYPE_OPTIONS.map(v=><option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <div className="small muted">Severity</div>
            <select className="input" value={draft.severity} onChange={(e)=>patch("severity", e.target.value)}>
              {["error","warning","info","success"].map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="ruleSplitGrid">
          <div className="rulePane">
            <div className="rulePaneTitle">Condition</div>
            <div className="grid" style={{gap:10}}>
              <div>
                <div className="small muted">Condition Group</div>
                <select className={`input ${errors.condition_group ? "inputError" : ""}`} value={draft.condition_group} onChange={(e)=>patch("condition_group", e.target.value)}>
                  <option value="">Select group</option>
                  <option value="Model">Model</option>
                  {groupOptions.map(v=><option key={v} value={v}>{v}</option>)}
                </select>
                {errors.condition_group ? <div className="fieldError">{errors.condition_group}</div> : null}
              </div>
              <div className="ruleFormulaRow">
                <div>
                  <div className="small muted">Operator</div>
                  <select className="input" value={draft.condition_operator} onChange={(e)=>patch("condition_operator", e.target.value)}>
                    {RULE_OPERATORS.map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <div className="small muted">Value</div>
                  <input className={`input ${errors.condition_value ? "inputError" : ""}`} value={draft.condition_value} onChange={(e)=>patch("condition_value", e.target.value)} placeholder="Example: 2 or R6715" />
                  {errors.condition_value ? <div className="fieldError">{errors.condition_value}</div> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rulePane">
            <div className="rulePaneTitle">Action</div>
            <div className="grid" style={{gap:10}}>
              <div>
                <div className="small muted">Action Group</div>
                <select className={`input ${errors.action_group ? "inputError" : ""}`} value={draft.action_group} onChange={(e)=>patch("action_group", e.target.value)}>
                  <option value="">Select group</option>
                  {groupOptions.map(v=><option key={v} value={v}>{v}</option>)}
                </select>
                {errors.action_group ? <div className="fieldError">{errors.action_group}</div> : null}
              </div>
              <div className="ruleFormulaRow">
                <div>
                  <div className="small muted">Operator</div>
                  <select className="input" value={draft.action_operator} onChange={(e)=>patch("action_operator", e.target.value)}>
                    {RULE_OPERATORS.map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <div className="small muted">Value</div>
                  <input className={`input ${errors.action_value ? "inputError" : ""}`} value={draft.action_value} onChange={(e)=>patch("action_value", e.target.value)} placeholder="Example: 2 or 1" />
                  {errors.action_value ? <div className="fieldError">{errors.action_value}</div> : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rulePreviewCard">
          <div className="spread">
            <div>
              <div className="small muted">Formula Preview</div>
              <div className="rulePreviewText">{generatedRule}</div>
            </div>
            <button className="btn" onClick={()=>patch("rule", generatedRule)}>Use Preview</button>
          </div>
        </div>

        <div>
          <div className="small muted">Readable Rule</div>
          <textarea className="input rulesTextarea" value={draft.rule} onChange={(e)=>patch("rule", e.target.value)} placeholder="Leave blank to use the generated preview." />
          <div className="small muted">Admins can keep a custom sentence or use the generated readable formula.</div>
        </div>

        <div>
          <div className="small muted">Message</div>
          <textarea className={`input rulesTextarea ${errors.message ? "inputError" : ""}`} value={draft.message} onChange={(e)=>patch("message", e.target.value)} placeholder="Explain what the rule means when it triggers." />
          {errors.message ? <div className="fieldError">{errors.message}</div> : null}
        </div>

        <label className="row" style={{gap:8}}><input type="checkbox" checked={!!draft.active} onChange={(e)=>patch("active", e.target.checked)} /><span>Rule is active</span></label>
        <div className="spread"><div className="small muted">Validated dropdowns reduce mistakes and keep future rule evaluation consistent.</div><div className="row"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save Rule</button></div></div>
      </div>
    </Modal>
  );
}


export default function App(){
  const [tab,setTab]=useState("quotes");
  const [quotes,setQuotes]=useState([]);
  const [activeId,setActiveId]=useState(null);
  const [sync,setSync]=useState({ lastSuccess:null,lastFail:null,lastRun:null,rowsUpdated:0 });
  const [role, setRole] = useState("employee");
  const [feedback, setFeedback] = useState({});
  const [rules, setRules] = useState([]);
  const [notes, setNotes] = useState([]);
  const [libraryDocs, setLibraryDocs] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(()=>{
    setQuotes(safeParse(localStorage.getItem(LS_QUOTES),[]));
    setSync(safeParse(localStorage.getItem(LS_SYNC),{ lastSuccess:null,lastFail:null,lastRun:null,rowsUpdated:0 }));
    setRole(localStorage.getItem(LS_ROLE) || "employee");
    setFeedback(safeParse(localStorage.getItem(LS_FEEDBACK), {}));
    setRules(loadSavedRules());
    setNotes(loadSavedNotes());
    setLibraryDocs(loadSavedLibraryDocs());
    setHydrated(true);
  },[]);
  useEffect(()=>{ if(hydrated) localStorage.setItem(LS_QUOTES,JSON.stringify(quotes)); },[quotes, hydrated]);
  useEffect(()=>{ if(hydrated) localStorage.setItem(LS_SYNC,JSON.stringify(sync)); },[sync, hydrated]);
  useEffect(()=>{ if(hydrated) localStorage.setItem(LS_ROLE, role); },[role, hydrated]);
  useEffect(()=>{ if(hydrated) localStorage.setItem(LS_FEEDBACK, JSON.stringify(feedback)); },[feedback, hydrated]);
  useEffect(()=>{ if(hydrated) localStorage.setItem(LS_RULES, JSON.stringify(rules)); },[rules, hydrated]);
  useEffect(()=>{ if(hydrated) localStorage.setItem(LS_NOTES, JSON.stringify(notes)); },[notes, hydrated]);
  useEffect(()=>{ if(hydrated) localStorage.setItem(LS_LIBRARY, JSON.stringify(libraryDocs)); },[libraryDocs, hydrated]);

useEffect(() => {
  async function createQuote() {
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      const data = await res.json();
      console.log("CREATE QUOTE:", data);
    } catch (err) {
      console.error("CREATE QUOTE ERROR:", err);
    }
  }

  createQuote();
}, []);
  
  const activeQuote = useMemo(()=>quotes.find(q=>q.quote_id===activeId)||null,[quotes,activeId]);
  const priceHistoryMap = useMemo(()=>buildPriceHistory(quotes),[quotes]);

  function runMockSync(){
    const rows=10+Math.floor(Math.random()*30);
    const ok=Math.random()>0.1;
    setSync(s=>({...s,lastRun:nowIso(),rowsUpdated:rows,lastSuccess: ok? nowIso():s.lastSuccess,lastFail: ok? null:`Mock failure: BC timeout @ ${new Date().toLocaleTimeString()}`}));
  }

  function createQuote({ title, customerId, customerName, customerRep }){
    const qid=makeQuoteId();
    const quote={
      quote_id:qid,
      title:title||"New Quote",
      customer_id:customerId||"",
      customer_name:customerName||"",
      customer_rep:customerRep||"",
      status:"Draft",
      owner:"(Entra User)",
      created_at:nowIso(),
      updated_at:nowIso(),
      versions:[ensureConfigsOnVersion({ version:1, created_at:nowIso(), config:{ condition:"New", notes:"", chassisSku:null, _label:"Initial", activeConfigId:"cfg-1" }, lines:[], _autosave_at:null })]
    };
    setQuotes(prev=>[quote,...prev]);
    setActiveId(qid);
    setTab("builder");
  }

  function updateQuote(qid, updater){
    setQuotes(prev=>prev.map(q=>{
      if(q.quote_id!==qid) return q;
      const next = typeof updater==="function" ? updater(q) : updater;
      return { ...next, updated_at: nowIso() };
    }));
  }

  function duplicateQuote(q, overrides={}){
    const last=ensureConfigsOnVersion(q.versions[q.versions.length-1]);
    const customer_id = overrides.customer_id ?? q.customer_id;
    const customer_name = overrides.customer_name ?? q.customer_name;
    const customer_rep = overrides.customer_rep ?? q.customer_rep;
    const title = overrides.title ?? `${q.title} (Copy)`;

    const copy={
      ...q,
      quote_id: makeQuoteId(),
      title,
      customer_id: customer_id || "",
      customer_name: customer_name || "",
      customer_rep: customer_rep || "",
      created_at: nowIso(),
      updated_at: nowIso(),
      versions:[{ ...JSON.parse(JSON.stringify(last)), version:1, created_at: nowIso(), config:{ ...(last.config||{}), _label:"Initial (Copied)", activeConfigId: (last.config?.activeConfigId || last.configs?.[0]?.id || "cfg-1") }, _autosave_at:null }]
    };
    setQuotes(prev=>[copy,...prev]);
    setActiveId(copy.quote_id);
    setTab("builder");
  }

  function recordSuggestionFeedback(id, action){
    setFeedback(prev=>({ ...prev, [id]: { action, at: nowIso() } }));
  }

  return (
    <div className="container">
      <Header tab={tab} setTab={setTab} activeQuote={activeQuote} sync={sync} onSync={runMockSync} role={role} setRole={setRole} />
      <AnimatePresence mode="wait">
        {tab==="quotes" && (
          <motion.div key="quotes" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
            <QuotesDashboard quotes={quotes} onCreate={createQuote} onOpen={(id)=>{setActiveId(id);setTab("builder");}} onDuplicate={duplicateQuote} />
          </motion.div>
        )}
        {tab==="builder" && (
          <motion.div key="builder" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
            {activeQuote ? (
              <QuoteBuilder
                quote={activeQuote}
                onBack={()=>setTab("quotes")}
                onUpdate={(up)=>updateQuote(activeQuote.quote_id, up)}
                role={role}
                priceHistoryMap={priceHistoryMap}
                feedback={feedback}
                onFeedback={recordSuggestionFeedback}
                notes={notes}
                rules={rules}
              />
            ) : <div className="card"><div style={{fontWeight:800}}>No quote selected</div></div>}
          </motion.div>
        )}
        {tab==="knowledge" && (
          <motion.div key="knowledge" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
            <KnowledgeLibrarySearchPage libraryDocs={libraryDocs} />
          </motion.div>
        )}
        {tab==="admin" && (
          <motion.div key="admin" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
            <AdminWorkspace rules={rules} setRules={setRules} notes={notes} setNotes={setNotes} libraryDocs={libraryDocs} setLibraryDocs={setLibraryDocs} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Header({ tab,setTab,activeQuote,sync,onSync,role,setRole }){
  return (
    <div className="spread" style={{marginBottom:12}}>
      <div className="row" style={{alignItems:"center"}}>
        <div className="card" style={{padding:12,borderRadius:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <ShieldCheck size={18}/>
            <div>
              <div style={{fontWeight:700}}>Serviot Quoting Portal</div>
              <div className="muted small">V1 Beta (UX Prototype v0.6)</div>
            </div>
          </div>
        </div>
        <span className="badge primary">Overrides: {role==="employee" ? "enabled" : "hidden"}</span>
      </div>
      <div className="row" style={{alignItems:"center"}}>
        <div className="tabs">
          <button className={`tab ${tab==="quotes"?"active":""}`} onClick={()=>setTab("quotes")}>Quotes</button>
          <button className={`tab ${tab==="builder"?"active":""}`} onClick={()=>setTab("builder")}>Builder</button>
          <button className={`tab ${tab==="knowledge"?"active":""}`} onClick={()=>setTab("knowledge")}><BookOpen size={14}/> Knowledge</button>
          <button className={`tab ${tab==="admin"?"active":""}`} onClick={()=>setTab("admin")}><Database size={14}/> Admin</button>
        </div>
        <div className="tabs" title="Beta-only toggle">
          <button className={`tab ${role==="employee"?"active":""}`} onClick={()=>setRole("employee")}>Employee View</button>
          <button className={`tab ${role==="customer"?"active":""}`} onClick={()=>setRole("customer")}>Customer View</button>
        </div>
        <button className="btn" onClick={onSync}><RefreshCw size={16}/> Sync</button>
        {activeQuote ? <span className="badge">Active: {activeQuote.quote_id}</span> : null}
      </div>
    </div>
  );
}

function QuotesDashboard({ quotes,onCreate,onOpen,onDuplicate }){
  const [search,setSearch]=useState("");
  const [show,setShow]=useState(false);
  const [title,setTitle]=useState("");
  const [customerId,setCustomerId]=useState("");
  const customer = useMemo(()=>MOCK_CUSTOMERS.find(c=>c.id===customerId)||null,[customerId]);
  const [rep,setRep]=useState("");

  const [dupOpen, setDupOpen] = useState(false);
  const [dupSource, setDupSource] = useState(null);
  const [dupTitle, setDupTitle] = useState("");
  const [dupCustomerId, setDupCustomerId] = useState("");
  const dupCustomer = useMemo(()=>MOCK_CUSTOMERS.find(c=>c.id===dupCustomerId)||null,[dupCustomerId]);
  const [dupRep, setDupRep] = useState("");


  const filtered = useMemo(()=>{
    const n=search.trim().toLowerCase();
    return quotes.filter(q=>!n || q.quote_id.toLowerCase().includes(n) || (q.title||"").toLowerCase().includes(n) || (q.customer_name||"").toLowerCase().includes(n));
  },[quotes,search]);

  return (
    <div className="grid grid2">
      <div className="card">
        <div style={{fontWeight:900}}>Dashboard</div>
        <div className="muted small">Customer + rep are searchable (mock data now, BC API later).</div>
        <hr className="sep"/>
        <button className="btn primary" onClick={()=>setShow(true)}><Plus size={16}/> New Quote</button>
        <hr className="sep"/>
        <div className="small muted" style={{marginBottom:6}}>Search</div>
        <div style={{position:"relative"}}>
          <div style={{position:"absolute",left:12,top:10,opacity:.7}}><Search size={16}/></div>
          <input className="input" style={{paddingLeft:34}} value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Quote ID, title, customer..."/>
        </div>
      </div>

      <div className="card">
        <div style={{fontWeight:900}}>All Quotes</div>
        <div className="muted small">Reps can see all quotes.</div>
        <hr className="sep"/>
        <div className="grid">
          {filtered.map(q=>(
            <div key={q.quote_id} className="card" style={{padding:12,background:"rgba(255,255,255,.02)"}}>
              <div className="spread">
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:800}}>{q.title}</div>
                  <div className="small muted">{q.quote_id} • {q.customer_name||"(no customer)"}{q.customer_rep?` • ${q.customer_rep}`:""}</div>
                </div>
                <div className="right">
                  <button className="btn" onClick={()=>{ setDupSource(q); setDupTitle(`${q.title} (Copy)`); setDupCustomerId(q.customer_id||""); setDupRep(q.customer_rep||""); setDupOpen(true); }}><Copy size={16}/> Duplicate</button>
                  <button className="btn primary" onClick={()=>onOpen(q.quote_id)}>Open</button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length===0 ? <div className="muted small">No quotes yet.</div> : null}
        </div>
      </div>

      {show ? (
        <Modal title="New Quote" onClose={()=>setShow(false)} size="sm">
          <div className="grid">
            <div>
              <div className="small muted" style={{marginBottom:6}}>Quote title</div>
              <input className="input" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g., R760 virtualization build"/>
            </div>

            <SearchSelect
              label="Company (Customer)"
              placeholder="Type to search customers…"
              items={MOCK_CUSTOMERS}
              value={customerId}
              onChange={(id)=>{ setCustomerId(id); setRep(""); }}
              disabled={false}
              getKey={(c)=>c.id}
              getLabel={(c)=>c.name}
              getSub={(c)=>c.id}
            />

            <SearchSelect
              label="Customer contact / rep"
              placeholder={customer ? "Type to search reps…" : "Select customer first"}
              items={customer ? (customer.reps||[]).map(r=>({id:r,name:r,sub:customer.name})) : []}
              value={rep}
              onChange={(id)=>setRep(id)}
              disabled={!customer}
              getKey={(r)=>r.id}
              getLabel={(r)=>r.name}
              getSub={(r)=>r.sub}
            />

            <div className="right">
              <button className="btn" onClick={()=>setShow(false)}>Cancel</button>
              <button className="btn primary" disabled={!customerId} onClick={()=>{
                onCreate({ title, customerId, customerName: customer?.name||"", customerRep: rep });
                setTitle(""); setCustomerId(""); setRep(""); setShow(false);
              }}>Create</button>
            </div>
          </div>
        </Modal>
      ) : null}

      {dupOpen && dupSource ? (
        <Modal title="Duplicate Quote" onClose={()=>{setDupOpen(false); setDupSource(null);}} size="sm">
          <div className="muted small">Duplicate this quote into a new SRVQ######### and optionally switch the customer/rep.</div>
          <hr className="sep"/>
          <div className="grid" style={{gap:12}}>
            <div className="card" style={{background:"rgba(255,255,255,.02)"}}>
              <div style={{fontWeight:900}}>{dupSource.title}</div>
              <div className="small muted">{dupSource.quote_id} • {dupSource.customer_name||"(no customer)"}{dupSource.customer_rep?` • ${dupSource.customer_rep}`:""}</div>
              <div className="small muted" style={{marginTop:6}}>Configs: {(dupSource.versions?.[dupSource.versions.length-1]?.configs||[]).length || 1}</div>
            </div>

            <div>
              <div className="small muted" style={{marginBottom:6}}>New quote title</div>
              <input className="input" value={dupTitle} onChange={(e)=>setDupTitle(e.target.value)} placeholder="e.g., R760 build (Copy)"/>
            </div>

            <SearchSelect
              label="Company (Customer)"
              placeholder="Type to search customers…"
              items={MOCK_CUSTOMERS}
              value={dupCustomerId}
              onChange={(id)=>{ setDupCustomerId(id); setDupRep(""); }}
              disabled={false}
              getKey={(c)=>c.id}
              getLabel={(c)=>c.name}
              getSub={(c)=>c.id}
            />

            <SearchSelect
              label="Customer contact / rep"
              placeholder={dupCustomer ? "Type to search reps…" : "Select customer first"}
              items={dupCustomer ? (dupCustomer.reps||[]).map(r=>({id:r,name:r,sub:dupCustomer.name})) : []}
              value={dupRep}
              onChange={(id)=>setDupRep(id)}
              disabled={!dupCustomer}
              getKey={(r)=>r.id}
              getLabel={(r)=>r.name}
              getSub={(r)=>r.sub}
            />

            <div className="right">
              <button className="btn" onClick={()=>{setDupOpen(false); setDupSource(null);}}>Cancel</button>
              <button className="btn primary" disabled={!dupCustomerId} onClick={()=>{
                onDuplicate(dupSource, { title: dupTitle, customer_id: dupCustomerId, customer_name: dupCustomer?.name||"", customer_rep: dupRep });
                setDupOpen(false); setDupSource(null);
              }}>Duplicate</button>
            </div>
          </div>
        </Modal>
      ) : null}

    </div>
  );
}


const CONFIG_TEMPLATES = [
  { id:"tmpl-vmware", name:"VMware Host", modelSku:"379-BCQY", notes:"Balanced virtualization node", items:[["CPU","338-CPBR",2],["Memory","370-AGZR",4],["RAID Controller","405-AAXT",1],["Drives","400-AXTV",2],["Power Supplies","450-AIQX",2],["Rail Kit","770-BDMW",1]] },
  { id:"tmpl-sql", name:"SQL Server Node", modelSku:"379-BCQY", notes:"Higher memory and storage focused", items:[["CPU","338-CPBR",2],["Memory","370-AGZR",8],["RAID Controller","405-AAXT",1],["Drives","400-BGMMM",4],["Power Supplies","450-AIQX",2],["Rail Kit","770-BDMW",1]] },
  { id:"tmpl-edge", name:"Edge Server", modelSku:"379-BGAA", notes:"Compact general-purpose edge build", items:[["CPU","338-BPQR",1],["Memory","370-AFQX",2],["Drives","400-AXTV",2],["Power Supplies","450-AIQX",2],["Rail Kit","770-BDMW",1]] }
];

function buildConfigComparison(version){
  const v = ensureConfigsOnVersion(version);
  return (v.configs||[]).map(cfg=>{
    const lines = sortLines(cfg.lines || []);
    const subtotal = lines.reduce((a,l)=>a + ((((l.override_unit_price ?? l.catalog_unit_price) ?? 0) * (l.qty||1))), 0);
    const leadMax = lines.reduce((m,l)=>Math.max(m, l.lead_time_days || 0), 0);
    return { id: cfg.id, name: cfg.name, qty: cfg.qty || 1, subtotal, extended: subtotal * (cfg.qty || 1), leadMax, lines };
  });
}

function applyTemplateToActiveConfig(last, template){
  last = ensureConfigsOnVersion(last);
  const activeId = last?.config?.activeConfigId || last?.configs?.[0]?.id;
  const idx = (last.configs||[]).findIndex(c=>c.id===activeId);
  if(idx < 0) return;
  const cfg = JSON.parse(JSON.stringify(last.configs[idx]));
  cfg.lines = [];
  const bySku = new Map((MOCK_ITEMS||[]).map(i=>[i.sku,i]));
  const modelItem = bySku.get(template.modelSku);
  if(modelItem){
    cfg.lines.push({
      line_order: 1, portal_category: "Server Chassis", sku: modelItem.sku, description: modelItem.desc, qty: 1,
      catalog_unit_price: modelItem.price, override_unit_price: null, override_reason: "", override_user: "(Entra User)", override_at: null, lead_time_days: modelItem.lead
    });
    cfg.config = { ...(cfg.config||{}), chassisSku: modelItem.sku, templateId: template.id, templateName: template.name };
  }
  for(const [cat, sku, qty] of (template.items||[])){
    const item = bySku.get(sku);
    if(!item) continue;
    cfg.lines.push({
      line_order: cfg.lines.length + 1, portal_category: cat, sku: item.sku, description: item.desc, qty: qty || 1,
      catalog_unit_price: item.price, override_unit_price: null, override_reason: "", override_user: "(Entra User)", override_at: null, lead_time_days: item.lead
    });
  }
  const next = last.configs.slice();
  next[idx] = cfg;
  last.configs = next;
}

function buildExportRows(quote, config){
  return (config?.lines||[]).map(l=>{
    const unit = l.override_unit_price ?? l.catalog_unit_price;
    return {
      quote_number: quote.quote_id,
      version: quote.versions?.length || 1,
      customer_number: quote.customer_id || "",
      customer_name: quote.customer_name || "",
      rep: quote.customer_rep || "",
      config_name: config?.name || "",
      item_number: l.sku,
      description: l.description,
      quantity: l.qty,
      unit_price: unit ?? "",
      line_extended: unit!=null ? unit * l.qty : "",
      category: l.portal_category
    };
  });
}

function buildExportText(kind, quote, config, rows){
  if(!rows.length) return "";
  if(kind==="csv"){
    const headers = Object.keys(rows[0]);
    return [headers.join(","), ...rows.map(r=>headers.map(h=>JSON.stringify(r[h] ?? "")).join(","))].join("\\n");
  }
  if(kind==="bc"){
    const headers = ["Quote Number","Version","Customer Number","Salesperson","Config Name","Item Number","Description","Quantity","Unit Price"];
    const body = rows.map(r=>[r.quote_number,r.version,r.customer_number,r.rep,r.config_name,r.item_number,r.description,r.quantity,r.unit_price]);
    return [headers.join(","), ...body.map(r=>r.map(v=>JSON.stringify(v ?? "")).join(","))].join("\\n");
  }
  if(kind==="bom"){
    return ["Part Number\\tDescription\\tQTY\\tPrice", ...rows.map(r=>`${r.item_number}\\t${r.description}\\t${r.quantity}\\t${r.unit_price}`)].join("\\n");
  }
  if(kind==="customer"){
    return [`Quote: ${quote.quote_id}`, `Customer: ${quote.customer_name || ""}`, `Config: ${config?.name || ""}`, "", ...rows.map(r=>`${r.quantity} x ${r.description} (${r.item_number})`)].join("\\n");
  }
  return JSON.stringify(rows, null, 2);
}

function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
function toEpochDays(iso){ try{ return new Date(iso).getTime() / (1000*60*60*24); }catch{ return 0; } }
function variance(nums){
  if(!nums?.length) return 0;
  const mean = nums.reduce((a,b)=>a+b,0)/nums.length;
  return nums.reduce((a,b)=>a+((b-mean)**2),0)/nums.length;
}
function weightedLinearRegression(rows){
  if(!rows?.length || rows.length < 2) return null;
  const pts = rows.map(r=>({ x: toEpochDays(r.date), y:Number(r.price), w:Number(r.w ?? 1) })).filter(p=>Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.w));
  if(pts.length < 2) return null;
  const minX = Math.min(...pts.map(p=>p.x));
  pts.forEach(p=>p.x = p.x - minX);
  const sw = pts.reduce((a,p)=>a+p.w,0);
  const xbar = pts.reduce((a,p)=>a+p.x*p.w,0)/sw;
  const ybar = pts.reduce((a,p)=>a+p.y*p.w,0)/sw;
  const num = pts.reduce((a,p)=>a + p.w*(p.x-xbar)*(p.y-ybar),0);
  const den = pts.reduce((a,p)=>a + p.w*((p.x-xbar)**2),0);
  const slope = den===0 ? 0 : num/den;
  const intercept = ybar - slope*xbar;
  const sst = pts.reduce((a,p)=>a + p.w*((p.y-ybar)**2),0);
  const ssr = pts.reduce((a,p)=>{ const yhat = intercept + slope*p.x; return a + p.w*((p.y-yhat)**2); },0);
  const r2 = sst===0 ? 0 : clamp(1 - (ssr/sst), 0, 1);
  return { slope, intercept, r2, minX, pts };
}
function buildPricingIntelligence(rows, customerName){
  const all = (rows||[]).filter(r=>r.price!=null);
  const cust = all.filter(r=>r.customer===customerName);
  const useCust = cust.length >= 4;
  const baseRows = useCust ? cust : all;
  if(!baseRows.length) return null;
  const now = nowIso();
  const weightedRows = baseRows.map(r=>{
    const ageDays = Math.abs((new Date(now) - new Date(r.date)) / (1000*60*60*24));
    const recencyW = Math.exp(-(Math.log(2)/30) * ageDays);
    const qtyW = 1 + Math.min(2, Math.log2((r.qty || 1) + 1) / 2);
    return { ...r, w: recencyW * qtyW };
  });
  const reg = weightedLinearRegression(weightedRows);
  const avg = weightedAvgPrice(weightedRows, now);
  const projected = reg ? Math.max(0, reg.intercept + reg.slope * (toEpochDays(now) - reg.minX)) : avg;
  const suggested = avg!=null && projected!=null ? ((avg*0.55) + (projected*0.45)) : (projected ?? avg);
  const prices = baseRows.map(r=>Number(r.price)).filter(Number.isFinite);
  const v = variance(prices);
  const mean = prices.length ? prices.reduce((a,b)=>a+b,0)/prices.length : 0;
  const coeffVar = mean ? Math.sqrt(v)/mean : 1;
  const recent90 = baseRows.filter(r=>Math.abs((new Date(now) - new Date(r.date)) / (1000*60*60*24)) <= 90).length;
  const volumeScore = clamp(baseRows.length/20, 0, 1);
  const recencyScore = clamp(recent90/8, 0, 1);
  const fitScore = reg ? reg.r2 : 0.25;
  const varianceScore = clamp(1 - coeffVar, 0, 1);
  const customerBoost = useCust ? 0.12 : 0;
  const confidence = Math.round(clamp((volumeScore*0.35 + recencyScore*0.25 + fitScore*0.2 + varianceScore*0.2 + customerBoost) * 100, 0, 100));
  const direction = reg ? (reg.slope > 0.02 ? "up" : reg.slope < -0.02 ? "down" : "flat") : "flat";
  const band = confidence >= 75 ? "High" : confidence >= 50 ? "Medium" : "Low";
  return { rows: baseRows, usingCustomer: useCust, suggested, weightedAvg: avg, projected, confidence, band, direction, recent90, totalQuotes: baseRows.length, customerQuotes: cust.length, allQuotes: all.length };
}

function TemplatesModal({ templates, onApply, onClose }){
  return (
    <Modal title="Templates" onClose={onClose} size="lg">
      <div className="muted small">Start from a recommended configuration template.</div>
      <hr className="sep"/>
      <div className="templateGrid">
        {templates.map(t=>(
          <div key={t.id} className="card templateCard">
            <div className="spread">
              <div style={{fontWeight:900}}>{t.name}</div>
              <span className="badge">{t.items.length} items</span>
            </div>
            <div className="small muted" style={{marginTop:6}}>{t.notes}</div>
            <div className="small muted" style={{marginTop:10}}>Model: {t.modelSku}</div>
            <button className="btn primary" style={{marginTop:12}} onClick={()=>onApply(t)}>Apply Template</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ExportCenterModal({ quote, config, onClose }){
  const rows = buildExportRows(quote, config);
  const [kind, setKind] = useState("csv");
  const text = buildExportText(kind, quote, config, rows);
  async function copyOut(){ try{ await navigator.clipboard.writeText(text); }catch{} }
  return (
    <Modal title="Export Center" onClose={onClose} size="lg">
      <div className="muted small">Export the active configuration in multiple formats, including Business Central upload format.</div>
      <hr className="sep"/>
      <div className="exportTabs">
        {[["csv","CSV"],["bom","Excel BOM"],["customer","Customer Quote"],["bc","Business Central Upload"],["json","JSON"]].map(([id,label])=>(
          <button key={id} className={`configTab ${kind===id?"active":""}`} onClick={()=>setKind(id)}>{label}</button>
        ))}
      </div>
      <div className="card" style={{marginTop:12, background:"rgba(255,255,255,.02)"}}>
        <div className="spread">
          <div>
            <div style={{fontWeight:900}}>{kind==="bc" ? "Business Central Upload Format" : kind.toUpperCase()}</div>
            <div className="small muted">Active config: {config?.name || ""}</div>
          </div>
          <div className="right">
            <button className="btn" onClick={copyOut}><Copy size={16}/> Copy</button>
            <a className="btn primary" href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`} download={`${quote.quote_id}-${config?.name || "config"}-${kind}.txt`}><Download size={16}/> Download</a>
          </div>
        </div>
        <hr className="sep"/>
        <textarea className="input exportTextArea" value={text} readOnly />
      </div>
    </Modal>
  );
}



function BuilderDiagnosticsCard({ selectedModel, notes=[], rules=[], matchedNotes=[], issues=[] }){
  const totalNotes = Array.isArray(notes) ? notes.length : 0;
  const totalRules = Array.isArray(rules) ? rules.length : 0;
  const matchedNoteCount = Array.isArray(matchedNotes) ? matchedNotes.length : 0;
  const issueCount = Array.isArray(issues) ? issues.length : 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">Builder Debug Context</div>
      <div className="mt-3 space-y-1 text-xs text-slate-600">
        <div><span className="font-medium text-slate-700">Selected model:</span> {selectedModel || 'None'}</div>
        <div><span className="font-medium text-slate-700">Loaded notes:</span> {totalNotes}</div>
        <div><span className="font-medium text-slate-700">Loaded rules:</span> {totalRules}</div>
        <div><span className="font-medium text-slate-700">Matched notes:</span> {matchedNoteCount}</div>
        <div><span className="font-medium text-slate-700">Triggered issues:</span> {issueCount}</div>
      </div>
    </div>
  );
}

function QuoteBuilder({ quote,onBack,onUpdate,role,priceHistoryMap, feedback, onFeedback, notes, rules }){
  const [viewVersion, setViewVersion] = useState(quote.versions.length);
  const dirtyRef = useRef(false);

  useEffect(()=>{ setViewVersion(quote.versions.length); }, [quote.quote_id, quote.versions.length]);

  const viewingLatest = viewVersion === quote.versions.length;
  const current = ensureConfigsOnVersion(quote.versions[viewVersion-1]);

  const activeConfig = useMemo(()=>getActiveConfig(current), [current]);
  const configs = current.configs || [];
  const quoteTotals = useMemo(()=>computeQuoteTotals(configs), [configs]);

  const chassisLine = (activeConfig?.lines||[]).find(l=>l.portal_category==="Server Chassis") || null;
  const chassis = chassisLine ? MOCK_ITEMS.find(x=>x.sku===chassisLine.sku) : null;
  const modelOptions = useMemo(()=>getModelOptions(), []);
  const selectedModel = activeConfig?.config?.genericModel || extractGenericModel(chassis) || "";
  const chassisOptions = useMemo(()=>MOCK_ITEMS.filter(i=>i.cat==="Server Chassis").filter(i=>!selectedModel || extractGenericModel(i)===selectedModel), [selectedModel]);
  const modelProfile = useMemo(()=>({ tags: [selectedModel.includes("R760") || selectedModel.includes("R660") ? "DDR5" : selectedModel ? "DDR4" : ""].filter(Boolean), desc:selectedModel }), [selectedModel]);

  const totals = useMemo(()=>computeTotals(activeConfig?.lines||[]),[activeConfig]);
  const ready = useMemo(()=>readinessScore(activeConfig?.lines||[]),[activeConfig]);
  const hasUnknownLead = (activeConfig?.lines||[]).some(l=>l.lead_time_days==null || l.lead_time_days<=0);
  const hasUnknownPrice = (activeConfig?.lines||[]).some(l=>(l.override_unit_price ?? l.catalog_unit_price) == null);

  const [historySku, setHistorySku] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(null);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [knowledgeGroup, setKnowledgeGroup] = useState('');
  const contextualNotes = useMemo(()=> filterKnowledgeNotes(notes, { model:selectedModel || 'All Models', component_group: knowledgeGroup || 'All Groups' }), [notes, selectedModel, knowledgeGroup]);
  const ruleIssues = useMemo(()=>evaluateBuilderRules(rules, selectedModel, activeConfig?.lines||[]), [rules, selectedModel, activeConfig]);
  const blockingErrors = useMemo(()=>ruleIssues.filter(issue=>issue.severity==='error'), [ruleIssues]);
  const validationByGroup = useMemo(()=>ruleIssues.reduce((acc, issue)=>{
    const keys = [issue.action_group, issue.component_group].filter(Boolean);
    keys.forEach(key=>{
      if(!acc[key]) acc[key] = [];
      acc[key].push(issue);
    });
    return acc;
  }, {}), [ruleIssues]);
  function notesForGroup(group){ return filterKnowledgeNotes(notes, { model:selectedModel || 'All Models', component_group:group }); }

  const historyRows = historySku ? lastNHistory(priceHistoryMap, historySku, 3) : [];
  const detailsHistoryRows = detailsOpen ? lastNHistory(priceHistoryMap, detailsOpen.item?.sku, 3) : [];
  function jumpToSection(id){ const el = document.getElementById(id); if(el) el.scrollIntoView({behavior:"smooth", block:"start"}); }
  function setGenericModel(modelLabel){
    if(!viewingLatest) return;
    markDirty();
    onUpdate(q=>updateLastVersion(q,(last)=>{
      mutateActiveConfig(last,(cfg)=>{
        cfg.config = { ...(cfg.config||{}), genericModel: modelLabel };
        cfg.lines = (cfg.lines||[]).filter(l=>l.portal_category!=="Server Chassis");
        cfg.config = { ...(cfg.config||{}), chassisSku:null };
      });
    }));
  }

  useEffect(()=>{
    if(!viewingLatest) return;
    const interval = setInterval(()=>{
      if(!dirtyRef.current) return;

      onUpdate(q=>{
        const last = q.versions[q.versions.length-1];
        const lastAuto = last?._autosave_at || last.created_at;
        const mins = daysBetween(lastAuto, nowIso())*24*60;
        if(mins < AUTO_SNAPSHOT_MINUTES) return q;

        const clone = JSON.parse(JSON.stringify(last));
        clone.version = q.versions.length+1;
        clone.created_at = nowIso();
        clone.config = { ...(clone.config||{}), _label: "Auto-save" };
        clone._autosave_at = nowIso();

        let nextVersions = [...q.versions, clone];
        if(nextVersions.length > MAX_VERSIONS_PER_QUOTE){
          nextVersions = nextVersions.slice(nextVersions.length - MAX_VERSIONS_PER_QUOTE);
          nextVersions = nextVersions.map((v, idx)=>({ ...v, version: idx+1 }));
        }
        return { ...q, versions: nextVersions };
      });

      dirtyRef.current = false;
    }, 20_000);
    return ()=>clearInterval(interval);
  }, [viewingLatest, onUpdate]);

  function markDirty(){ dirtyRef.current = true; }

  function mutateActiveConfig(last, fn){
    const activeId = last?.config?.activeConfigId || last?.configs?.[0]?.id;
    const idx = (last.configs||[]).findIndex(c=>c.id===activeId);
    if(idx<0) return;
    const cfg = last.configs[idx];
    const nextCfg = JSON.parse(JSON.stringify(cfg));
    fn(nextCfg, last);
    const nextConfigs = last.configs.slice();
    nextConfigs[idx] = nextCfg;
    last.configs = nextConfigs;
  }

  function addOrSelect(item, portal_category=item.cat){
    if(!viewingLatest) return;
    markDirty();
    onUpdate(q=>updateLastVersion(q,(last)=>{
      mutateActiveConfig(last,(cfg)=>{
        if(portal_category==="Server Chassis"){
          cfg.lines = (cfg.lines||[]).filter(l=>l.portal_category!=="Server Chassis");
          cfg.config = { ...(cfg.config||{}), chassisSku:item.sku };
        }
        const exists = (cfg.lines||[]).find(l=>l.sku===item.sku && l.portal_category===portal_category);
        if(exists) return;
        cfg.lines = cfg.lines || [];
        cfg.lines.push({
        line_order: (cfg.lines?.length || 0) + 1,
        portal_category,
        sku:item.sku,
        description:item.desc,
        qty:1,
        catalog_unit_price:item.price,
        override_unit_price:null,
        override_reason:"",
        override_user:"(Entra User)",
        override_at:null,
          lead_time_days:item.lead
        });
      });
    }));
  }

  function removeLine(sku, portal_category){
    if(!viewingLatest) return;
    markDirty();
    onUpdate(q=>updateLastVersion(q,(last)=>{
      mutateActiveConfig(last,(cfg)=>{
        cfg.lines = (cfg.lines||[]).filter(l=>!(l.sku===sku && l.portal_category===portal_category));
        if(portal_category==="Server Chassis") cfg.config = { ...(cfg.config||{}), chassisSku:null };
      });
    }));
  }

  function setQty(sku, portal_category, qty){
    if(!viewingLatest) return;
    markDirty();
    onUpdate(q=>updateLastVersion(q,(last)=>{
      mutateActiveConfig(last,(cfg)=>{
        const line = (cfg.lines||[]).find(l=>l.sku===sku && l.portal_category===portal_category);
        if(!line) return;
        line.qty = Math.max(1, qty);
      });
    }));
  }

  function bumpQty(sku, portal_category, delta){
    const line = (activeConfig?.lines||[]).find(l=>l.sku===sku && l.portal_category===portal_category);
    if(!line) return;
    setQty(sku, portal_category, line.qty + delta);
  }

  function applyOverride(sku, portal_category, override_unit_price, override_reason){
    if(!viewingLatest) return;
    markDirty();
    onUpdate(q=>updateLastVersion(q,(last)=>{
      mutateActiveConfig(last,(cfg)=>{
        const line = (cfg.lines||[]).find(l=>l.sku===sku && l.portal_category===portal_category);
        if(!line) return;
        line.override_unit_price = override_unit_price;
        line.override_reason = override_reason || "";
        line.override_at = nowIso();
      });
    }));
  }

  function clearOverride(sku, portal_category){
    if(!viewingLatest) return;
    markDirty();
    onUpdate(q=>updateLastVersion(q,(last)=>{
      mutateActiveConfig(last,(cfg)=>{
        const line = (cfg.lines||[]).find(l=>l.sku===sku && l.portal_category===portal_category);
        if(!line) return;
        line.override_unit_price = null;
        line.override_reason = "";
        line.override_at = null;
      });
    }));
  }

  function manualSnapshot(label="Manual Snapshot"){
    if(!viewingLatest) return;
    onUpdate(q=>{
      const last=ensureConfigsOnVersion(q.versions[q.versions.length-1]);
      const clone=JSON.parse(JSON.stringify(last));
      clone.version = q.versions.length+1;
      clone.created_at = nowIso();
      clone.config = { ...(clone.config||{}), _label: label };
      clone._autosave_at = nowIso();
      let versions=[...q.versions, clone];
      if(versions.length > MAX_VERSIONS_PER_QUOTE){
        versions = versions.slice(versions.length - MAX_VERSIONS_PER_QUOTE).map((v, idx)=>({ ...v, version: idx+1 }));
      }
      dirtyRef.current = false;
      return { ...q, versions };
    });
  }

  function restoreViewedAsNewVersion(){
    if(viewingLatest) return;
    onUpdate(q=>{
      const viewed = q.versions[viewVersion-1];
      const clone = JSON.parse(JSON.stringify(viewed));
      clone.version = q.versions.length+1;
      clone.created_at = nowIso();
      clone.config = { ...(clone.config||{}), _label: `Restored from v${viewVersion}` };
      clone._autosave_at = nowIso();
      let versions=[...q.versions, clone];
      if(versions.length > MAX_VERSIONS_PER_QUOTE){
        versions = versions.slice(versions.length - MAX_VERSIONS_PER_QUOTE).map((v, idx)=>({ ...v, version: idx+1 }));
      }
      return { ...q, versions };
    });
  }

  const pricingInsights = useMemo(()=>{
    const now = nowIso();
    const cust = quote.customer_name || "(unknown)";
    const insights = [];
    for(const l of (activeConfig?.lines||[])){
      const unit = l.override_unit_price ?? l.catalog_unit_price;
      const allRows = (priceHistoryMap.get(l.sku) || []).filter(r=>r.price!=null);
      const custRows = allRows.filter(r=>r.customer===cust);
      const baseCust = weightedAvgPrice(custRows, now);
      const baseAll = weightedAvgPrice(allRows, now);
      const baseline = baseCust ?? baseAll;
      if(baseline == null) continue;
      const diff = (unit - baseline) / baseline;
      if(diff > OVERPRICE_THRESHOLD){
        insights.push({
          id: `pricing:${quote.quote_id}:${l.portal_category}:${l.sku}:high`,
          sku: l.sku,
          category: l.portal_category,
          unit,
          baseline,
          diff,
          scope: baseCust!=null ? "customer" : "global",
          direction: "high"
        });
      } else if(diff < UNDERPRICE_THRESHOLD){
        insights.push({
          id: `pricing:${quote.quote_id}:${l.portal_category}:${l.sku}:low`,
          sku: l.sku,
          category: l.portal_category,
          unit,
          baseline,
          diff,
          scope: baseCust!=null ? "customer" : "global",
          direction: "low"
        });
      }
    }
    return insights.sort((a,b)=>b.diff-a.diff);
  }, [activeConfig, priceHistoryMap, quote.quote_id, quote.customer_name]);

  const improvementSuggestions = useMemo(()=>{
    const present = new Set((activeConfig?.lines||[]).map(l=>l.portal_category));
    const missingRequired = ["Server Chassis","CPU","Memory"].filter(c=>!present.has(c));
    const hasDrives = present.has("Drives");
    const hasRAID = present.has("RAID Controller");
    const hasPSU = present.has("Power Supplies");
    const hasRails = present.has("Rail Kit");

    const suggestions = [];
    for(const cat of missingRequired){
      suggestions.push({
        id: `missing:${quote.quote_id}:${cat}`,
        type:"missing",
        title:`Add ${cat}`,
        detail:`This is required for a complete configuration.`,
        severity:"danger"
      });
    }
    if(hasDrives && !hasRAID){
      suggestions.push({
        id:`compat:${quote.quote_id}:drives_without_raid`,
        type:"compat",
        title:"Add a RAID Controller",
        detail:"Drives are selected, but no RAID controller is included.",
        severity:"warn"
      });
    }
    if(!hasDrives){
      suggestions.push({
        id:`missing:${quote.quote_id}:drives`,
        type:"missing",
        title:"Add Drives",
        detail:"No storage is selected yet.",
        severity:"warn"
      });
    }
    if(!hasPSU){
      suggestions.push({
        id:`missing:${quote.quote_id}:psu`,
        type:"missing",
        title:"Add Power Supplies",
        detail:"Consider redundant PSUs for most builds.",
        severity:"warn"
      });
    }
    if(!hasRails){
      suggestions.push({
        id:`missing:${quote.quote_id}:rails`,
        type:"missing",
        title:"Add Rail Kit",
        detail:"Rails are often required for rack installs.",
        severity:"info"
      });
    }
    for(const pi of pricingInsights){
      suggestions.push({
        id: pi.id,
        type:"pricing",
        title:`Price looks ${pi.direction === "low" ? "low" : "high"} for ${pi.sku}`,
        detail:`Current unit ${money(pi.unit)} is ${Math.abs(pi.diff*100).toFixed(1)}% ${pi.direction === "low" ? "below" : "above"} recent ${pi.scope==="customer"?"customer":"overall"} avg (${money(pi.baseline)}), time-decayed.`,
        severity:"warn"
      });
    }
    return suggestions;
  }, [activeConfig, pricingInsights, quote.quote_id]);

  return (
    <div className="grid" style={{gap:12}}>
      <div className="spread">
        <div className="row" style={{alignItems:"center"}}>
          <button className="btn" onClick={onBack}><ChevronLeft size={16}/> Back</button>
          <div>
            <div style={{fontWeight:900,fontSize:18}}>{quote.title}</div>
            <div className="small muted">{quote.quote_id} • {quote.customer_name||"(no customer)"}{quote.customer_rep?` • ${quote.customer_rep}`:""}</div>
          </div>
        </div>
        <div className="right">
          {viewingLatest ? (
            <>
              <span className="badge ok">Auto-save: on</span>
              <button className="btn" onClick={()=>manualSnapshot("Manual Snapshot")}><ShieldCheck size={16}/> Snapshot</button>
              <button className="btn" onClick={()=>setTemplatesOpen(true)}><Copy size={16}/> Templates</button>
              <button className="btn" onClick={()=>setCompareOpen(true)}><Columns size={16}/> Compare</button>
              <button className="btn primary" disabled={blockingErrors.length>0} title={blockingErrors.length ? "Resolve rule errors before exporting." : "Export active config"} onClick={()=>{ if(blockingErrors.length===0) setExportOpen(true); }}><FileDown size={16}/> Export</button>
            </>
          ) : (
            <>
              <span className="badge warn">Viewing v{viewVersion} (read-only)</span>
              <button className="btn" onClick={()=>setViewVersion(quote.versions.length)}>Return to latest</button>
              <button className="btn primary" onClick={restoreViewedAsNewVersion}>Restore as new version</button>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{background:"rgba(255,255,255,.02)"}}>
        <div className="spread">
          <div className="row" style={{alignItems:"center"}}>
            <span className="badge ok">{hasUnknownPrice ? "Config Subtotal: Request Pricing" : `Config Subtotal: ${money(totals.subtotal)}`}</span>
            <span className="badge">Overrides: {totals.overriddenLines}</span>
            {activeConfig?.config?.templateName ? <span className="badge ok">Template: {activeConfig.config.templateName}</span> : null}
            <span className="badge">Lead max: {totals.leadTimeMax}d{hasUnknownLead ? " • Request a quote to verify lead time" : ""}</span>
          </div>
          <div className="row" style={{alignItems:"center", gap:8, flexWrap:"wrap", justifyContent:"flex-end"}}>
            {ruleIssues.length ? <span className={`badge ${blockingErrors.length ? "danger" : "warn"}`}>{blockingErrors.length ? `${blockingErrors.length} blocking error${blockingErrors.length===1?"":"s"}` : `${ruleIssues.length} active warning${ruleIssues.length===1?"":"s"}`}</span> : null}
            <div className="badge" style={{borderColor:scoreColor(ready.score), color:"#fff", background:`rgba(0,0,0,.15)`}}>
              Readiness: {ready.score}/100 ({ready.band})
            </div>
          </div>
        </div>
      </div>

      <div className="grid builderShell" style={{gridTemplateColumns:"minmax(0,0.85fr) 450px",gap:12}}>
        <div className="card" style={{opacity: viewingLatest ? 1 : 0.55, pointerEvents: viewingLatest ? "auto" : "none"}}>
          <div className="sectionTitleBlue">Builder</div>
          <div className="muted small">Select a model first, then choose compatible components using checkboxes.</div>
          <hr className="sep"/>

          <div id="model-selector" className="card modelSelectorCard serviotHero">
            <div className="sectionTitleBlue">Model Selector</div>
            <div className="muted small">Choose the generic PowerEdge model first. This controls all compatible options below.</div>
            <hr className="sep"/>
            <select className="input" value={selectedModel} onChange={(e)=>setGenericModel(e.target.value)}>
              <option value="">Select model</option>
              {modelOptions.map(opt=>(
                <option key={opt.id} value={opt.label}>{opt.label}</option>
              ))}
            </select>
          </div>

          <Section title="Chassis" portalCategory="Server Chassis" blocked={!selectedModel}
            help={selectedModel ? `Choose a compatible chassis SKU for ${selectedModel}.` : "Select a generic model first to view chassis SKUs."}
            items={chassisOptions}
            selectedLines={chassisLine ? [chassisLine] : []}
            onSelect={(it)=>addOrSelect(it,"Server Chassis")}
            onRemove={(it)=>removeLine(it.sku,"Server Chassis")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            onOpenDetails={(item, category)=>setDetailsOpen({item, category})}
            customerName={quote.customer_name}
            notes={notesForGroup("Server Chassis")}
            validationIssues={validationByGroup["Server Chassis"] || validationByGroup["Chassis"] || []}
            singleSelect
          />

          <Section title="CPU" portalCategory="CPU" blocked={!selectedModel}
            items={MOCK_ITEMS.filter(i=>i.cat==="CPU").filter(i=>selectedModel ? allowedByChassis(modelProfile,i) : false)}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="CPU")}
            onSelect={(it)=>addOrSelect(it,"CPU")}
            onRemove={(it)=>removeLine(it.sku,"CPU")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            onOpenDetails={(item, category)=>setDetailsOpen({item, category})}
            customerName={quote.customer_name}
            notes={notesForGroup("CPU")}
            validationIssues={validationByGroup["CPU"] || []}
          />

          <Section title="Memory" portalCategory="Memory" blocked={!selectedModel}
            items={MOCK_ITEMS.filter(i=>i.cat==="Memory").filter(i=>selectedModel ? allowedByChassis(modelProfile,i) : false)}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="Memory")}
            onSelect={(it)=>addOrSelect(it,"Memory")}
            onRemove={(it)=>removeLine(it.sku,"Memory")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            onOpenDetails={(item, category)=>setDetailsOpen({item, category})}
            customerName={quote.customer_name}
            notes={notesForGroup("Memory")}
            validationIssues={validationByGroup["Memory"] || []}
          />

          <Section title="RAID Controller" portalCategory="RAID Controller" blocked={!selectedModel}
            items={MOCK_ITEMS.filter(i=>i.cat==="RAID Controller")}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="RAID Controller")}
            onSelect={(it)=>addOrSelect(it,"RAID Controller")}
            onRemove={(it)=>removeLine(it.sku,"RAID Controller")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            onOpenDetails={(item, category)=>setDetailsOpen({item, category})}
            customerName={quote.customer_name}
            notes={notesForGroup("RAID Controller")}
            validationIssues={validationByGroup["RAID Controller"] || []}
          />

          <Section title="Drives" portalCategory="Drives" blocked={!selectedModel}
            items={MOCK_ITEMS.filter(i=>i.cat==="Drives")}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="Drives")}
            onSelect={(it)=>addOrSelect(it,"Drives")}
            onRemove={(it)=>removeLine(it.sku,"Drives")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            onOpenDetails={(item, category)=>setDetailsOpen({item, category})}
            customerName={quote.customer_name}
            notes={notesForGroup("Drives")}
            validationIssues={validationByGroup["Drives"] || []}
          />

          <Section title="Power Supplies" portalCategory="Power Supplies" blocked={!selectedModel}
            items={MOCK_ITEMS.filter(i=>i.cat==="Power Supplies")}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="Power Supplies")}
            onSelect={(it)=>addOrSelect(it,"Power Supplies")}
            onRemove={(it)=>removeLine(it.sku,"Power Supplies")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            onOpenDetails={(item, category)=>setDetailsOpen({item, category})}
            customerName={quote.customer_name}
            notes={notesForGroup("Power Supplies")}
            validationIssues={validationByGroup["Power Supplies"] || []}
          />

          <Section title="Rail Kit" portalCategory="Rail Kit" blocked={!selectedModel}
            items={MOCK_ITEMS.filter(i=>i.cat==="Rail Kit").filter(i=>selectedModel ? allowedByChassis(modelProfile,i) : false)}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="Rail Kit")}
            onSelect={(it)=>addOrSelect(it,"Rail Kit")}
            onRemove={(it)=>removeLine(it.sku,"Rail Kit")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            onOpenDetails={(item, category)=>setDetailsOpen({item, category})}
            customerName={quote.customer_name}
            notes={notesForGroup("Rail Kit")}
            validationIssues={validationByGroup["Rail Kit"] || []}
          />

          <div style={{fontWeight:900, marginTop:14}}>Networking</div>
          <hr className="sep"/>
          {NETWORKING_CATS.map(cat=>(
            <Section key={cat} title={cat} portalCategory={cat} blocked={!selectedModel}
              items={MOCK_ITEMS.filter(i=>i.cat===cat).filter(i=>selectedModel ? allowedByChassis(modelProfile,i) : false)}
              selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category===cat)}
              onSelect={(it)=>addOrSelect(it,cat)}
              onRemove={(it)=>removeLine(it.sku,cat)}
              onQty={(sku,cat2,delta)=>bumpQty(sku,cat2,delta)}
              role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
              onOpenDetails={(item, category)=>setDetailsOpen({item, category})}
              customerName={quote.customer_name}
              notes={notesForGroup(cat)}
              validationIssues={validationByGroup[cat] || []}
            />
          ))}

          <div style={{fontWeight:900, marginTop:14}}>Other</div>
          <hr className="sep"/>
          {OTHER_CATS.map(cat=>(
            <Section key={cat} title={cat} portalCategory={cat} blocked={!selectedModel}
              items={MOCK_ITEMS.filter(i=>i.cat===cat).filter(i=>selectedModel ? allowedByChassis(modelProfile,i) : false)}
              selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category===cat)}
              onSelect={(it)=>addOrSelect(it,cat)}
              onRemove={(it)=>removeLine(it.sku,cat)}
              onQty={(sku,cat2,delta)=>bumpQty(sku,cat2,delta)}
              role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
              onOpenDetails={(item, category)=>setDetailsOpen({item, category})}
              customerName={quote.customer_name}
              notes={notesForGroup(cat)}
              validationIssues={validationByGroup[cat] || []}
            />
          ))}
        </div>

        <div className="grid rightRailFix" style={{gap:12}}>
          <BuilderDiagnosticsCard selectedModel={selectedModel} notes={notes} rules={rules} matchedNotes={contextualNotes} issues={ruleIssues} />
          <KnowledgePanel notes={notes} selectedModel={selectedModel} selectedGroup={knowledgeGroup} onPickGroup={setKnowledgeGroup} />
          <RuleValidationCard issues={ruleIssues} />
          {contextualNotes.length ? (
            <div className="card serviotPanel">
              <div className="sectionTitleBlue">Contextual Notes</div>
              <div className="muted small">Guidance matched to the current builder context.</div>
              <hr className="sep"/>
              <div className="grid" style={{gap:8}}>
                {contextualNotes.slice(0,4).map(n=>(<div key={n.id} className="compatRow"><div className="row" style={{marginBottom:6, flexWrap:'wrap'}}><span className="badge">{n.component_group}</span><span className="badge primary">{n.model}</span></div><div style={{fontWeight:800}}>{n.title}</div><div className="small muted" style={{marginTop:6}}>{n.content}</div></div>))}
              </div>
            </div>
          ) : null}
          <Cart
            config={activeConfig}
            configs={configs}
            quoteTotals={quoteTotals}
            totals={totals}
            role={role}
            onRemove={removeLine}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            onOpenHistory={(sku)=>setHistorySku(sku)}
            onOpenOverride={(sku,cat)=>setOverrideTarget({sku,cat})}
            pricingInsights={pricingInsights}
            onSetConfigQty={(id, qty)=>{
              if(!viewingLatest) return;
              markDirty();
              onUpdate(q=>updateLastVersion(q,(last)=>{
                last = ensureConfigsOnVersion(last);
                const idx = (last.configs||[]).findIndex(c=>c.id===id);
                if(idx<0) return;
                const cfg = JSON.parse(JSON.stringify(last.configs[idx]));
                cfg.qty = Math.max(1, qty);
                const next = last.configs.slice();
                next[idx]=cfg;
                last.configs = next;
              }));
            }}
            onAddConfig={(opts)=>{
              if(!viewingLatest) return;
              markDirty();
              const preset = opts?.preset || "Config";
              const copy = !!opts?.copy;
              onUpdate(q=>updateLastVersion(q,(last)=>{
                addConfigPresetToVersion(last, preset==="Config" ? `Config ${(last.configs||[]).length+1}` : preset, copy);
              }));
            }}
            onRenameConfig={(id, name)=>{
              if(!viewingLatest) return;
              markDirty();
              onUpdate(q=>updateLastVersion(q,(last)=>{
                last = ensureConfigsOnVersion(last);
                const idx = (last.configs||[]).findIndex(c=>c.id===id);
                if(idx<0) return;
                const cfg = JSON.parse(JSON.stringify(last.configs[idx]));
                cfg.name = name;
                const next = last.configs.slice();
                next[idx]=cfg;
                last.configs = next;
              }));
            }}
            onDuplicateConfig={(id)=>{
              if(!viewingLatest) return;
              markDirty();
              onUpdate(q=>updateLastVersion(q,(last)=>{
                duplicateConfigInVersion(last, id);
              }));
            }}
            onSetActiveConfig={(id)=>{
              if(!viewingLatest) return;
              onUpdate(q=>updateLastVersion(q,(last)=>{
                last = ensureConfigsOnVersion(last);
                last.config = { ...(last.config||{}), activeConfigId: id };
              }));
            }}
          />
          <ReadinessCard readiness={ready} />
          <InsightsCard
            suggestions={improvementSuggestions}
            feedback={feedback}
            onFeedback={onFeedback}
          />
          <VersionsCard quote={quote} viewVersion={viewVersion} onView={setViewVersion} />
        </div>
      </div>

      
      {templatesOpen ? (
        <TemplatesModal templates={CONFIG_TEMPLATES} onClose={()=>setTemplatesOpen(false)} onApply={(t)=>{
          if(!viewingLatest) return;
          markDirty();
          onUpdate(q=>updateLastVersion(q,(last)=>{ applyTemplateToActiveConfig(last, t); }));
          setTemplatesOpen(false);
        }} />
      ) : null}

      {exportOpen ? (
        <ExportCenterModal quote={quote} config={activeConfig} onClose={()=>setExportOpen(false)} />
      ) : null}

      {compareOpen ? (
        <Modal title="Compare Configs" onClose={()=>setCompareOpen(false)} size="lg">
          <div className="muted small">Side-by-side view of config totals and top lines (beta).</div>
          <hr className="sep"/>
          <CompareConfigsView version={current} />
        </Modal>
      ) : null}

{detailsOpen ? (
        <ItemDetailsDrawer item={detailsOpen.item} category={detailsOpen.category} onClose={()=>setDetailsOpen(null)} historyRows={detailsHistoryRows} allHistoryRows={(priceHistoryMap.get(detailsOpen.item?.sku) || [])} currentUnitPrice={(activeConfig?.lines||[]).find(l=>l.sku===detailsOpen.item?.sku && l.portal_category===detailsOpen.category)?.override_unit_price ?? (activeConfig?.lines||[]).find(l=>l.sku===detailsOpen.item?.sku && l.portal_category===detailsOpen.category)?.catalog_unit_price} customerName={quote.customer_name} />
      ) : null}

{historySku ? (
        <Modal title={`Price History • ${historySku}`} onClose={()=>setHistorySku(null)} size="sm">
          <div className="muted small">Last 3 quoted prices (beta data). Customer-specific history will matter more once BC is wired in.</div>
          <hr className="sep"/>
          {historyRows.length===0 ? (
            <div className="card" style={{background:"rgba(255,255,255,.02)"}}>
              <div style={{fontWeight:800}}>No history yet</div>
              <div className="small muted">Create quotes containing this SKU to see history populate.</div>
            </div>
          ) : (
            <table style={{width:"100%",borderCollapse:"separate",borderSpacing:0,border:"1px solid var(--border)",borderRadius:16,overflow:"hidden"}}>
              <thead>
                <tr>
                  <th style={{padding:10,textAlign:"left",fontSize:12,color:"var(--muted)"}}>Date</th>
                  <th style={{padding:10,textAlign:"left",fontSize:12,color:"var(--muted)"}}>Price</th>
                  <th style={{padding:10,textAlign:"left",fontSize:12,color:"var(--muted)"}}>Customer</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((r, idx)=>(
                  <tr key={idx}>
                    <td style={{padding:10,borderTop:"1px solid var(--border)"}}>{fmtDate(r.date)}</td>
                    <td style={{padding:10,borderTop:"1px solid var(--border)",fontWeight:900}}>{money(r.price)}</td>
                    <td style={{padding:10,borderTop:"1px solid var(--border)"}}>{r.customer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      ) : null}

      {overrideTarget && role==="employee" && viewingLatest ? (
        <OverrideModal
          sku={overrideTarget.sku}
          cat={overrideTarget.cat}
          line={(activeConfig?.lines||[]).find(l=>l.sku===overrideTarget.sku && l.portal_category===overrideTarget.cat)}
          onClose={()=>setOverrideTarget(null)}
          onApply={(p,reason)=>{ applyOverride(overrideTarget.sku, overrideTarget.cat, p, reason); setOverrideTarget(null); }}
          onClear={()=>{ clearOverride(overrideTarget.sku, overrideTarget.cat); setOverrideTarget(null); }}
        />
      ) : null}
    </div>
  );
}

function Section({ title, portalCategory, help, items, selectedLines, onSelect, onRemove, onQty, blocked, role, priceHistoryMap, onOpenHistory, customerName, onOpenDetails, notes, validationIssues=[], singleSelect=false }){
  const [expanded, setExpanded] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const selectedCount = (selectedLines||[]).length;
  const selectedSummary = summarizeSelected(selectedLines||[]);
  const selectedBySku = useMemo(()=>{
    const m=new Map();
    (selectedLines||[]).forEach(l=>m.set(l.sku,l));
    return m;
  },[selectedLines]);

  const filtered = items || [];
  const canShowDeltas = (selectedLines||[]).length === 1;
  const baselineLine = canShowDeltas ? (selectedLines||[])[0] : null;
  const baselineUnit = baselineLine ? (baselineLine.override_unit_price ?? baselineLine.catalog_unit_price) : null;
  const errorCount = validationIssues.filter(issue=>issue.severity==='error').length;
  const warningCount = validationIssues.filter(issue=>issue.severity==='warning').length;
  const hasMeta = !!(notes?.length || validationIssues.length);

  function priceDelta(unit){
    if(!canShowDeltas || baselineUnit==null || unit==null) return null;
    const diff = unit - baselineUnit;
    if(diff===0) return "$0";
    return `${diff>0 ? "+" : "-"}${money(Math.abs(diff))}`;
  }

  return (
    <div id={`section-${(portalCategory||title).replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}`} className="card sectionFlat" style={{background:"rgba(255,255,255,.02)",opacity:blocked?0.45:1,pointerEvents:blocked?"none":"auto"}}>
      <div className="sectionFlatHeader">
        <div style={{minWidth:0, flex:1}}>
          <div className="row" style={{justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap"}}>
            <div className="row" style={{alignItems:"center", gap:8, flexWrap:"wrap"}}>
              <div className="sectionTitleBlue">{title}</div>
              <span className="badge">{selectedCount} selected</span>
              {(notes?.length || validationIssues.length) ? (
                <button
                  className="btn"
                  type="button"
                  onClick={()=>setShowMeta(v=>!v)}
                  title="Show notes and rule details for this section"
                >
                  {notes?.length ? <Lightbulb size={14} color="#f4c430" fill="#f4c430" /> : null}
                  {validationIssues.length ? <AlertTriangle size={14} color="#dc2626" /> : null}
                  {errorCount ? `${errorCount} error${errorCount===1?'':'s'}` : null}
                  {!errorCount && warningCount ? `${warningCount} warning${warningCount===1?'':'s'}` : null}
                  {notes?.length ? `${notes.length} note${notes.length===1?'':'s'}` : null}
                  {showMeta ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>
              ) : null}
              {selectedCount ? <span className="small muted">{selectedSummary}</span> : null}
            </div>
            <div className="row" style={{alignItems:"center", gap:8, flexWrap:"wrap"}}>
              <button className="btn" type="button" onClick={()=>setExpanded(v=>!v)}>
                {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                {expanded ? "Collapse" : "Expand"}
              </button>
            </div>
          </div>
          {help ? <div className="small muted">{help}</div> : null}
          {blocked ? <div className="small" style={{color:"var(--warn)"}}>Select a model first.</div> : null}
        </div>
      </div>

      {hasMeta && showMeta ? (
        <div className="grid" style={{marginTop:12, gap:10}}>
          {validationIssues.length ? (
            <div className={`ruleAlertCard ${validationIssues.some(issue=>issue.severity==="error") ? "error" : "warning"}`}>
              <div className="row" style={{alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap'}}>
                <AlertTriangle size={14} color="#dc2626" />
                <div style={{fontWeight:800}}>Section rule details</div>
              </div>
              {validationIssues.map(issue=><div key={issue.id} className="ruleAlertLine"><span className={`badge ${issue.severity==='error' ? 'danger' : 'warn'}`}>{issue.severity==='error' ? 'Error' : 'Warning'}</span><div className="small">{issue.message}</div></div>)}
            </div>
          ) : null}
          {notes?.length ? (
            <div className="compatRow" style={{background:"rgba(255,248,220,.18)"}}>
              <div className="row" style={{alignItems:"center", gap:8, marginBottom:6, flexWrap:'wrap'}}>
                <Lightbulb size={14} color="#f4c430" fill="#f4c430" />
                <div style={{fontWeight:800}}>Section notes</div>
                <span className="badge">{notes.length} note{notes.length===1?'':'s'}</span>
              </div>
              <div className="grid" style={{gap:8}}>
                {notes.map(note=>(
                  <div key={note.id || `${note.title}-${note.content}`} className="small muted">
                    <span style={{fontWeight:800, color:'var(--text)'}}>{note.title ? `${note.title}: ` : ''}</span>{note.content}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {expanded ? <div className="grid" style={{marginTop:12, gap:8}}>
        {filtered.length===0 ? <div className="muted small">No compatible items.</div> : null}
        {filtered.map(it=>{
          const line = selectedBySku.get(it.sku) || null;
          const isSelected = !!line;
          const leadLabel = (it.lead==null || it.lead<=0) ? "Lead TBD" : `Lead ${it.lead}d`;
          const unit = isSelected ? (line.override_unit_price ?? line.catalog_unit_price) : it.price;
          const delta = !isSelected ? priceDelta(it.price) : null;

          return (
            <div key={it.sku} className={`compatRow ${isSelected ? "selected" : ""}`}>
              <div className="compatTop">
                <label className="compatCheck">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e)=>{
                      if(e.target.checked) onSelect(it);
                      else onRemove(it);
                    }}
                  />
                </label>
                <div className="compatSku">{it.sku}</div>
                <div className="compatDesc" title={it.desc}>{it.desc}</div>
                <div className="compatLead">{leadLabel}</div>
                <div className="compatPriceWrap">
                  <div className="compatPrice">{unit!=null ? money(unit) : "Request Pricing"}</div>
                  {delta ? <div className={`compatDelta ${delta.startsWith("+") ? "up" : "down"}`}>{delta}</div> : null}
                </div>
                <button className="textBtnGhost compact" onClick={()=>onOpenDetails?.(it, portalCategory || title)}>Details</button>
              </div>

              {isSelected && !singleSelect ? (
                <div className="compatBottom">
                  <div className="qtyInlineSlim" title="Quantity">
                    <button onClick={()=>onQty(it.sku, portalCategory || title, -1)} aria-label="Decrease"><Minus size={13}/></button>
                    <div className="n">{line.qty}</div>
                    <button onClick={()=>onQty(it.sku, portalCategory || title, +1)} aria-label="Increase"><Plus size={13}/></button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div> : <div className="small muted" style={{marginTop:12}}>Expand to view available SKUs{selectedCount ? ` • ${selectedSummary}` : ""}.</div>}
    </div>
  );
}

function RuleValidationCard({ issues=[] }){
  const errors = issues.filter(issue=>issue.severity==='error');
  const warnings = issues.filter(issue=>issue.severity==='warning');
  return (
    <div className="card serviotPanel">
      <div className="spread">
        <div>
          <div className="sectionTitleBlue">Rule Validation</div>
          <div className="muted small">Compatibility rules are evaluated automatically as the config changes.</div>
        </div>
        <div className="row" style={{gap:8, flexWrap:'wrap', justifyContent:'flex-end'}}>
          <span className={`badge ${errors.length ? 'danger' : 'ok'}`}>{errors.length} error{errors.length===1?'':'s'}</span>
          <span className={`badge ${warnings.length ? 'warn' : ''}`}>{warnings.length} warning{warnings.length===1?'':'s'}</span>
        </div>
      </div>
      <hr className="sep"/>
      {issues.length===0 ? <div className="small muted">No active rule violations. This configuration currently passes the saved rule set.</div> : (
        <div className="grid" style={{gap:8}}>
          {issues.map(issue=>(
            <div key={issue.id} className={`ruleAlertCard ${issue.severity==='error' ? 'error' : 'warning'}`}>
              <div className="row" style={{justifyContent:'space-between', gap:8, flexWrap:'wrap', marginBottom:6}}>
                <span className={`badge ${issue.severity==='error' ? 'danger' : 'warn'}`}>{issue.severity==='error' ? 'Blocking error' : 'Warning'}</span>
                <span className="small muted">{issue.action_group || issue.component_group}</span>
              </div>
              <div style={{fontWeight:800}}>{issue.message}</div>
              <div className="small muted" style={{marginTop:6}}>{issue.readableRule}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Cart({config, configs, quoteTotals, totals, role, onRemove, onQty, onOpenHistory, onOpenOverride, pricingInsights, onSetConfigQty, onAddConfig, onSetActiveConfig , onDuplicateConfig}){
  const lines = config?.lines || [];
  const sorted = useMemo(()=>sortLines(lines),[lines]);
  const activeId = config?.id;
  const hasUnknownPrice = (lines||[]).some(l => (l.override_unit_price ?? l.catalog_unit_price) == null);

  return (
    <div className="card cartCompact">
      <div className="spread">
        <div>
          <div className="cartTitle">Cart Preview</div>
          <div className="muted small">Compact line layout for full config visibility.</div>
        </div>
      </div>

      <hr className="sep"/>

      <div className="configTabs">
        {(configs||[]).map(c=>(
          <button key={c.id} className={`configTab ${c.id===activeId?"active":""}`} onClick={()=>onSetActiveConfig?.(c.id)}>
            {c.name} • Qty {c.qty||1}
          </button>
        ))}
      </div>

      <hr className="sep"/>

      {sorted.length===0 ? <div className="muted small">No items selected in this config yet.</div> : (
        <div className="cartList">
          {sorted.map(l=>{
            const unit = l.override_unit_price ?? l.catalog_unit_price;
            const ext = (unit ?? 0) * l.qty;

            return (
              <div key={`${l.portal_category}:${l.sku}`} className="cartLineSlim">
                <div className="cartLineTop">
                  <div className="cartSkuSlim">{l.sku}</div>
                  <div className="cartDescSlim" title={l.description}>{l.description}</div>
                  <button className="iconBtnGhost danger" title="Remove" onClick={()=>onRemove(l.sku, l.portal_category)}>
                    <Trash2 size={15}/>
                  </button>
                </div>

                <div className="cartLineBottom">
                  <div className="qtyInlineSlim" title="Quantity">
                    <button onClick={()=>onQty(l.sku, l.portal_category, -1)} aria-label="Decrease"><Minus size={13}/></button>
                    <div className="n">{l.qty}</div>
                    <button onClick={()=>onQty(l.sku, l.portal_category, +1)} aria-label="Increase"><Plus size={13}/></button>
                  </div>

                  <div className="cartMetric">
                    <span className="label">Unit</span>
                    <span className="value">{unit!=null ? money(unit) : "Request Pricing"}</span>
                    {role==="employee" ? (
                      <button className="iconBtnGhost" title="Edit unit price" onClick={()=>onOpenOverride?.(l.sku, l.portal_category)}>
                        <Pencil size={14}/>
                      </button>
                    ) : null}
                  </div>

                  <div className="cartMetric">
                    <span className="label">Extended</span>
                    <span className="value">{unit!=null ? money(ext) : "Request Pricing"}</span>
                  </div>

                  {role==="employee" ? (
                    <button className="textBtnGhost" title="Price history" onClick={()=>onOpenHistory?.(l.sku)}>
                      <History size={14}/> History
                    </button>
                  ) : <div />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <hr className="sep"/>

      <div className="cartSummaryWrap">
        <div className="cartSummaryStack">
          <div className="summaryRowRight">
            <div className="muted small">Config subtotal</div>
            <div className="summaryValue">{hasUnknownPrice ? "Request Pricing" : money(totals.subtotal)}</div>
          </div>

          <div className="summaryRowRight">
            <div className="summaryLabel">Config Quantity</div>
            <div className="qtyInlineSlim qtyInlineConfig">
              <button onClick={()=>onSetConfigQty?.(activeId, Math.max(1,(config.qty||1)-1))} aria-label="Decrease config quantity"><Minus size={13}/></button>
              <div className="n">{config?.qty||1}</div>
              <button onClick={()=>onSetConfigQty?.(activeId, (config.qty||1)+1)} aria-label="Increase config quantity"><Plus size={13}/></button>
            </div>
          </div>

          <div className="summaryRowRight">
            <div className="muted small">Extended total</div>
            <div className="summaryValue">{money(quoteTotals.quoteExtended ?? quoteTotals.grandExtended ?? 0)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadinessCard({ readiness }){
  const col = scoreColor(readiness.score);
  const width=`${readiness.score}%`;
  return (
    <div className="card">
      <div className="spread">
        <div>
          <div style={{fontWeight:900}}>Readiness Score</div>
          <div className="muted small">Color trends greener as readiness improves.</div>
        </div>
        <span className="badge" style={{borderColor:col, color:"#fff"}}>{readiness.band}</span>
      </div>
      <hr className="sep"/>
      <div className="spread">
        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
          <div style={{fontWeight:900,fontSize:34, color:col}}>{readiness.score}</div>
          <div className="muted">/ 100</div>
        </div>
        <div style={{flex:1, minWidth:240}}>
          <div className="progress">
            <div style={{width, background: `linear-gradient(90deg, rgba(255,107,107,.85), rgba(255,209,102,.85), rgba(51,214,159,.95))`}}/>
          </div>
          <div className="small muted" style={{marginTop:8}}>Heuristic placeholder (missing items, lead time, overrides).</div>
        </div>
      </div>
    </div>
  );
}

function InsightsCard({ suggestions, feedback, onFeedback }){
  const visible = (suggestions||[]).filter(s=>{
    const f = feedback?.[s.id];
    return !f || f.action!=="ignore";
  });

  return (
    <div className="card">
      <div className="spread">
        <div>
          <div style={{fontWeight:900, display:"flex", alignItems:"center", gap:8}}><Sparkles size={18}/> Suggestions & Insights</div>
          <div className="muted small">Pricing suggestions are customer-aware and decay over time.</div>
        </div>
        <span className="badge">{visible.length} active</span>
      </div>
      <hr className="sep"/>
      {visible.length===0 ? (
        <div className="muted small">No suggestions right now.</div>
      ) : (
        <div className="grid" style={{gap:10}}>
          {visible.slice(0,8).map(s=>{
            const sev = s.severity==="danger" ? "danger" : s.severity==="warn" ? "warn" : "primary";
            return (
              <div key={s.id} className="card" style={{padding:12, background:"rgba(255,255,255,.02)"}}>
                <div className="spread">
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:800}}>{s.title}</div>
                    <div className="small muted">{s.detail}</div>
                  </div>
                  <div className="right">
                    <span className={`badge ${sev}`}>{s.type}</span>
                    {feedback?.[s.id]?.action === "confirm" ? <span className="badge ok">Confirmed</span> : null}
                    <button className="btn" title="Confirm" disabled={feedback?.[s.id]?.action === "confirm"} onClick={()=>onFeedback?.(s.id, "confirm")}><ThumbsUp size={16}/></button>
                    <button className="btn" title="Ignore" onClick={()=>onFeedback?.(s.id, "ignore")}><ThumbsDown size={16}/></button>
                  </div>
                </div>
              </div>
            )
          })}
          {visible.length>8 ? <div className="small muted">Showing first 8 (more will appear as you resolve items).</div> : null}
        </div>
      )}
      <div className="small muted" style={{marginTop:10}}>
        Over time: we can learn from “confirm/ignore” feedback + actual won deals to tune these recommendations.
      </div>
    </div>
  );
}

function VersionsCard({ quote, viewVersion, onView }){
  return (
    <div className="card">
      <div style={{fontWeight:900}}>Quote Versions</div>
      <div className="muted small">Auto-save creates periodic snapshots when changes happen.</div>
      <hr className="sep"/>
      <div className="grid">
        {quote.versions.slice().reverse().map(v=>{
          const active = v.version === viewVersion;
          const latest = v.version === quote.versions.length;
          return (
            <div key={v.version} className="card" style={{
              padding:10,
              background:"rgba(255,255,255,.02)",
              borderColor: active ? "rgba(110,168,255,.45)" : "var(--border)",
              cursor:"pointer"
            }} onClick={()=>onView(v.version)}>
              <div className="spread">
                <div>
                  <div style={{fontWeight:800}}>v{v.version} <span className="muted small">{v.config?._label ? `• ${v.config._label}` : ""}</span></div>
                  <div className="small muted">{new Date(v.created_at).toLocaleString()}</div>
                </div>
                <div className="row" style={{gap:8, alignItems:"center"}}>
                  {latest ? <span className="badge ok">Latest</span> : null}
                  {active ? <span className="badge primary">Viewing</span> : null}
                  <span className="badge">Lines: {(v.configs||[]).reduce((a,c)=>a+(c.lines?.length||0),0)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}




function ItemDetailsDrawer({ item, category, onClose, historyRows, allHistoryRows, currentUnitPrice, customerName }){
  const compatibleModels = (MOCK_ITEMS||[]).filter(i=>i.cat==="Server Chassis").filter(ch=>allowedByChassis(ch, item)).map(ch=>ch.desc);
  const intel = buildPricingIntelligence(allHistoryRows||historyRows||[], customerName || "(unknown)");
  const trendRows = (intel?.rows || []).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  const current = currentUnitPrice ?? item?.price ?? null;
  const minPrice = trendRows.length ? Math.min(...trendRows.map(r=>Number(r.price))) : 0;
  const maxPrice = trendRows.length ? Math.max(...trendRows.map(r=>Number(r.price))) : 1;
  const span = Math.max(1, maxPrice - minPrice);
  function pointX(i, n){ return n<=1 ? 20 : 20 + (i * (260/(n-1))); }
  function pointY(price){ return 120 - (((price - minPrice) / span) * 100); }
  const points = trendRows.map((r,i)=>`${pointX(i, trendRows.length)},${pointY(Number(r.price))}`).join(" ");
  const avgLineY = intel?.weightedAvg!=null ? pointY(intel.weightedAvg) : null;

  return (
    <Modal title={`Part Details • ${item?.sku||""}`} onClose={onClose} size="lg">
      <div className="grid" style={{gap:12}}>
        <div className="card" style={{background:"rgba(255,255,255,.02)"}}>
          <div className="small muted">SKU</div>
          <div style={{fontWeight:900}}>{item?.sku}</div>
          <div className="small muted" style={{marginTop:8}}>Description</div>
          <div>{item?.desc}</div>
        </div>
        <div className="detailsGrid">
          <div className="card detailsMini"><div className="small muted">Category</div><div style={{fontWeight:800}}>{category}</div></div>
          <div className="card detailsMini"><div className="small muted">Lead Time</div><div style={{fontWeight:800}}>{item?.lead ? `${item.lead} days` : "Request to verify"}</div></div>
          <div className="card detailsMini"><div className="small muted">Unit Price</div><div style={{fontWeight:800}}>{item?.price!=null ? money(item.price) : "Request Pricing"}</div></div>
        </div>
        <div className="card" style={{background:"rgba(255,255,255,.02)"}}>
          <div style={{fontWeight:900, marginBottom:6}}>Pricing Intelligence</div>
          {intel ? (
            <>
              <div className="detailsGrid">
                <div className="card detailsMini"><div className="small muted">Suggested Price</div><div style={{fontWeight:900}}>{intel.suggested!=null ? money(intel.suggested) : "N/A"}</div></div>
                <div className="card detailsMini"><div className="small muted">Current Selection</div><div style={{fontWeight:900}}>{current!=null ? money(current) : "N/A"}</div></div>
                <div className="card detailsMini"><div className="small muted">Confidence</div><div style={{fontWeight:900}}>{intel.confidence}/100 ({intel.band})</div></div>
              </div>
              <div className="detailsGrid" style={{marginTop:10}}>
                <div className="card detailsMini"><div className="small muted">Quote Volume Used</div><div style={{fontWeight:800}}>{intel.totalQuotes} quotes</div></div>
                <div className="card detailsMini"><div className="small muted">Recent 90 Days</div><div style={{fontWeight:800}}>{intel.recent90}</div></div>
                <div className="card detailsMini"><div className="small muted">Trend</div><div style={{fontWeight:800, textTransform:"capitalize"}}>{intel.direction}</div></div>
              </div>
              <div className="card" style={{marginTop:12, background:"rgba(255,255,255,.015)"}}>
                <div className="spread">
                  <div style={{fontWeight:900}}>Pricing Trend</div>
                  <div className="small muted">{intel.usingCustomer ? "Customer-specific history prioritized" : "Using overall quote history"}</div>
                </div>
                <div className="chartWrap">
                  {trendRows.length >= 2 ? (
                    <svg viewBox="0 0 300 140" className="trendChart">
                      <line x1="20" y1="120" x2="280" y2="120" className="axisLine"/>
                      <line x1="20" y1="20" x2="20" y2="120" className="axisLine"/>
                      {avgLineY!=null ? <line x1="20" y1={avgLineY} x2="280" y2={avgLineY} className="avgLine"/> : null}
                      <polyline fill="none" points={points} className="trendLine"/>
                      {trendRows.map((r,i)=><circle key={i} cx={pointX(i, trendRows.length)} cy={pointY(Number(r.price))} r="3.5" className="trendPoint" />)}
                    </svg>
                  ) : <div className="small muted">Need at least 2 quotes to draw a trend.</div>}
                </div>
                <div className="small muted">Suggested price blends a weighted average with a time-based regression. Confidence increases with more recent quote volume and more stable pricing.</div>
              </div>
            </>
          ) : <div className="small muted">No history yet to suggest pricing.</div>}
        </div>
        <div className="card" style={{background:"rgba(255,255,255,.02)"}}>
          <div style={{fontWeight:900, marginBottom:6}}>Compatible Models</div>
          <div className="small muted">{compatibleModels.length ? compatibleModels.join(" • ") : "No model data yet."}</div>
        </div>
        <div className="card" style={{background:"rgba(255,255,255,.02)"}}>
          <div style={{fontWeight:900, marginBottom:6}}>Recent Quote History</div>
          {(allHistoryRows||[]).length ? (
            <div className="grid" style={{gap:6}}>
              {(allHistoryRows||[]).slice(0,8).map((r,idx)=>(
                <div key={idx} className="compareItem">
                  <div>{fmtDate(r.date)} • {r.customer} {r.qty ? `• qty ${r.qty}` : ""}</div>
                  <div>{money(r.price)}</div>
                </div>
              ))}
            </div>
          ) : <div className="small muted">No quote history yet.</div>}
        </div>
      </div>
    </Modal>
  );
}

function CompareConfigsView({ version }){
  const v = ensureConfigsOnVersion(version);
  const configs = buildConfigComparison(v);
  const top3 = configs.slice(0,3);
  const cols = Math.max(1, top3.length);

  return (
    <div className="grid" style={{gap:12}}>
      <div className="compareGrid" style={{gridTemplateColumns:`repeat(${cols}, 1fr)`}}>
        {top3.map(c=>(
          <div key={c.id} className="compareCol">
            <div className="spread">
              <h4>{c.name}</h4>
              <span className="badge">{c.qty}x</span>
            </div>
            <div className="small muted">Subtotal: {money(c.subtotal)} • Extended: {money(c.extended)} • Lead max: {c.leadMax}d</div>
            <hr className="sep"/>
            <div className="small muted" style={{marginBottom:6}}>Lines (top 20)</div>
            <div className="grid" style={{gap:0}}>
              {(c.lines||[]).slice(0,20).map(l=>{
                const unit = l.override_unit_price ?? l.catalog_unit_price ?? 0;
                return (
                  <div key={l.sku+l.portal_category} className="compareItem">
                    <div style={{minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{l.portal_category}: {l.sku}</div>
                    <div style={{whiteSpace:"nowrap"}}>{l.qty} × {money(unit)}</div>
                  </div>
                );
              })}
              {(c.lines||[]).length>20 ? <div className="muted small" style={{paddingTop:8}}>…and {(c.lines||[]).length-20} more</div> : null}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{fontWeight:900}}>Compare Notes</div>
        <div className="muted small">Next iteration: true diff (added/removed/changed), plus per-config suggestions in one view.</div>
      </div>
    </div>
  );
}

function OverrideModal({ sku, cat, line, onClose, onApply, onClear }){
  const [price, setPrice] = useState(line?.override_unit_price ?? "");
  const [reason, setReason] = useState(line?.override_reason || "");
  const reasons = ["Competitive match","Deal registration","Manager approved discount","Bundle pricing","Correction","Other"];
  const canApply = reason && Number.isFinite(Number(price));

  return (
    <Modal title={`Override • ${sku}`} onClose={onClose} size="sm">
      <div className="card" style={{background:"rgba(255,255,255,.02)"}}>
        <div className="small muted">Category</div>
        <div style={{fontWeight:900}}>{cat}</div>
        <div className="small muted" style={{marginTop:8}}>Catalog price</div>
        <div style={{fontWeight:900, fontSize:18}}>{money(line?.catalog_unit_price ?? 0)}</div>
      </div>

      <div className="grid" style={{gap:12, marginTop:12}}>
        <div>
          <div className="small muted" style={{marginBottom:6}}>Override unit price (USD)</div>
          <input className="input" value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="e.g., 149.00"/>
        </div>
        <div>
          <div className="small muted" style={{marginBottom:6}}>Reason (required)</div>
          <select className="select" value={reason} onChange={(e)=>setReason(e.target.value)}>
            <option value="">Select…</option>
            {reasons.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {!reason ? <div className="small" style={{color:"var(--danger)"}}>Reason is required.</div> : null}
      </div>

      <div className="right" style={{marginTop:12}}>
        {line?.override_unit_price != null ? <button className="btn" onClick={onClear}>Clear Override</button> : null}
        <button className="btn" onClick={onClose}><X size={16}/> Cancel</button>
        <button className="btn primary" disabled={!canApply} onClick={()=>onApply(Number(price), reason)}><Pencil size={16}/> Apply</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose, size }){
  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className={`modal ${size==="sm" ? "sm" : ""}`} onMouseDown={(e)=>e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <div style={{fontWeight:900,fontSize:16}}>{title}</div>
            <div className="small muted">Press <span className="kbd">Esc</span> or click outside to close.</div>
          </div>
          <button className="btn" onClick={onClose}><X size={16}/> Close</button>
        </div>
        <hr className="sep"/>
        {children}
      </div>
      <EscToClose onClose={onClose}/>
    </div>
  );
}

function EscToClose({ onClose }){
  useEffect(()=>{
    function onKey(e){ if(e.key==="Escape") onClose?.(); }
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[onClose]);
  return null;
}

export { ErrorBoundary };
