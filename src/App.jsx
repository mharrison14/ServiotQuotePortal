
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {Plus, Search, Copy, FileDown, RefreshCw, X, ChevronLeft, ShieldCheck, History, Pencil, ChevronDown, ChevronUp, Minus, Sparkles, ThumbsUp, ThumbsDown, Download, Columns, Trash2} from "lucide-react";


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
  { sku: "379-BDTF", desc: 'PowerEdge R750 - 8 x 3.5" Chassis', cat: "Server Chassis", tags: ["R750","2U","DDR4"], price: 1750, lead: 10 },
  { sku: "379-BGAA", desc: 'PowerEdge R650 - 10 x 2.5" Chassis', cat: "Server Chassis", tags: ["R650","1U","DDR4"], price: 1550, lead: 12 },

  { sku: "338-CPBR", desc: "Intel Xeon Gold 6542Y - 2.9GHz - 24 Core CPU", cat: "CPU", tags: ["DDR5"], price: 2450, lead: 7 },
  { sku: "338-BPQR", desc: "Intel Xeon Gold 6354 - 3.0GHz - 18 Core CPU", cat: "CPU", tags: ["DDR4"], price: 1650, lead: 8 },

  { sku: "370-AGZR", desc: "64GB DDR5 4800MHz ECC RDIMM", cat: "Memory", tags: ["DDR5"], price: 310, lead: 5 },
  { sku: "370-AFQX", desc: "64GB DDR4 3200MHz ECC RDIMM", cat: "Memory", tags: ["DDR4"], price: 225, lead: 5 },

  { sku: "405-AAXT", desc: "PERC H755 RAID Controller - Front Load", cat: "RAID Controller", tags: ["SAS","SATA"], price: 640, lead: 9 },

  { sku: "400-AXTV", desc: '480GB SATA Read Intensive SSD 6Gbps - 2.5"', cat: "Drives", tags: ["SATA","RI"], price: 195, lead: 6 },
  { sku: "400-BGMMM", desc: '1.92TB SAS Mix Use SSD 12Gbps - 2.5"', cat: "Drives", tags: ["SAS","MU"], price: 515, lead: 8 },

  { sku: "450-AIQX", desc: "1100W Power Supply - 14th Gen", cat: "Power Supplies", tags: ["PSU"], price: 285, lead: 5 },
  { sku: "770-BDMW", desc: "2U - ReadyRails Sliding Rail Kit", cat: "Rail Kit", tags: ["2U"], price: 130, lead: 5 },

  { sku: "540-BBBB", desc: "Broadcom 5720 Dual Port 1Gb LOM", cat: "Onboard Networking", tags: ["1Gb"], price: 0, lead: 0 },
  { sku: "540-BCCC", desc: "Broadcom 5720 QP 1Gb Network Daughter Card", cat: "Network Daughter Card", tags: ["1Gb"], price: 145, lead: 7 },
  { sku: "540-BCOC", desc: "Broadcom 57414 Dual Port 10GbE SFP+ OCP NIC 3.0", cat: "OCP Networking", tags: ["10Gb","SFP+"], price: 285, lead: 7 },

  { sku: "BOSS-S2", desc: "BOSS-S2 Controller Card", cat: "BOSS Controller", tags: ["BOSS"], price: 110, lead: 6 },
  { sku: "470-AFMF", desc: "480GB SATA M.2", cat: "M.2 Drives", tags: ["M.2"], price: 125, lead: 5 },
  { sku: "528-CTIE", desc: "iDRAC9 Enterprise 16G", cat: "Licensing", tags: ["iDRAC"], price: 295, lead: 0 },
  { sku: "325-BEZL", desc: "PowerEdge 2U Standard Bezel", cat: "Bezel", tags: ["2U"], price: 45, lead: 0 },
  { sku: "450-CORD", desc: "C13 to C14 PDU Style Power Cord - 2 Meter", cat: "Power Cords", tags: ["Cord"], price: 12, lead: 0 },
];

function safeParse(s, fallback){ try{ const v=JSON.parse(s); return v ?? fallback }catch{ return fallback } }
function nowIso(){ return new Date().toISOString() }
function money(n){ return (typeof n==="number" && !Number.isNaN(n)) ? n.toLocaleString(undefined,{style:"currency",currency:"USD"}) : "$0.00" }
function fmtDate(iso){ try{ return new Date(iso).toLocaleDateString() }catch{ return "" } }

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
  if(!chassis) return item.cat === "Server Chassis";
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

export default function App(){
  const [tab,setTab]=useState("quotes");
  const [quotes,setQuotes]=useState([]);
  const [activeId,setActiveId]=useState(null);
  const [sync,setSync]=useState({ lastSuccess:null,lastFail:null,lastRun:null,rowsUpdated:0 });
  const [role, setRole] = useState("employee");
  const [feedback, setFeedback] = useState({});

  useEffect(()=>{
    setQuotes(safeParse(localStorage.getItem(LS_QUOTES),[]));
    setSync(safeParse(localStorage.getItem(LS_SYNC),{ lastSuccess:null,lastFail:null,lastRun:null,rowsUpdated:0 }));
    setRole(localStorage.getItem(LS_ROLE) || "employee");
    setFeedback(safeParse(localStorage.getItem(LS_FEEDBACK), {}));
  },[]);
  useEffect(()=>localStorage.setItem(LS_QUOTES,JSON.stringify(quotes)),[quotes]);
  useEffect(()=>localStorage.setItem(LS_SYNC,JSON.stringify(sync)),[sync]);
  useEffect(()=>localStorage.setItem(LS_ROLE, role),[role]);
  useEffect(()=>localStorage.setItem(LS_FEEDBACK, JSON.stringify(feedback)),[feedback]);

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
              />
            ) : <div className="card"><div style={{fontWeight:800}}>No quote selected</div></div>}
          </motion.div>
        )}
        {tab==="admin" && (
          <motion.div key="admin" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
            <div className="card"><div style={{fontWeight:800}}>Admin</div><div className="muted small">Mock only.</div></div>
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
          <button className={`tab ${tab==="admin"?"active":""}`} onClick={()=>setTab("admin")}>Admin</button>
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

function QuoteBuilder({ quote,onBack,onUpdate,role,priceHistoryMap, feedback, onFeedback }){
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

  const totals = useMemo(()=>computeTotals(activeConfig?.lines||[]),[activeConfig]);
  const ready = useMemo(()=>readinessScore(activeConfig?.lines||[]),[activeConfig]);

  const [historySku, setHistorySku] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState(null);

  const historyRows = historySku ? lastNHistory(priceHistoryMap, historySku, 3) : [];

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
              <button className="btn primary" onClick={()=>manualSnapshot("Export Snapshot")}><FileDown size={16}/> Export</button>
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
            <span className="badge ok">Subtotal: {money(totals.subtotal)}</span>
            <span className="badge">Overrides: {totals.overriddenLines}</span>
            <span className="badge">Lead max: {totals.leadTimeMax}d</span>
          </div>
          <div className="badge" style={{borderColor:scoreColor(ready.score), color:"#fff", background:`rgba(0,0,0,.15)`}}>
            Readiness: {ready.score}/100 ({ready.band})
          </div>
        </div>
      </div>

      <div className="grid" style={{gridTemplateColumns:"minmax(0,1fr) 400px",gap:12}}>
        <div className="card" style={{opacity: viewingLatest ? 1 : 0.55, pointerEvents: viewingLatest ? "auto" : "none"}}>
          <div style={{fontWeight:900}}>Builder (Click SKU to select)</div>
          <div className="muted small">Multiple sections can be open. Selection adds immediately; qty defaults to 1.</div>
          <hr className="sep"/>

          <Section title="Server Chassis" portalCategory="Server Chassis" help="Pick a chassis first."
            items={MOCK_ITEMS.filter(i=>i.cat==="Server Chassis")}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="Server Chassis")}
            onSelect={(it)=>addOrSelect(it,"Server Chassis")}
            onRemove={(it)=>removeLine(it.sku,"Server Chassis")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            defaultOpen={true}
            customerName={quote.customer_name}
          />

          <Section title="CPU" portalCategory="CPU" blocked={!chassis}
            items={MOCK_ITEMS.filter(i=>i.cat==="CPU").filter(i=>allowedByChassis(chassis,i))}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="CPU")}
            onSelect={(it)=>addOrSelect(it,"CPU")}
            onRemove={(it)=>removeLine(it.sku,"CPU")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            customerName={quote.customer_name}
          />

          <Section title="Memory" portalCategory="Memory" blocked={!chassis}
            items={MOCK_ITEMS.filter(i=>i.cat==="Memory").filter(i=>allowedByChassis(chassis,i))}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="Memory")}
            onSelect={(it)=>addOrSelect(it,"Memory")}
            onRemove={(it)=>removeLine(it.sku,"Memory")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            customerName={quote.customer_name}
          />

          <Section title="RAID Controller" portalCategory="RAID Controller" blocked={!chassis}
            items={MOCK_ITEMS.filter(i=>i.cat==="RAID Controller")}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="RAID Controller")}
            onSelect={(it)=>addOrSelect(it,"RAID Controller")}
            onRemove={(it)=>removeLine(it.sku,"RAID Controller")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            customerName={quote.customer_name}
          />

          <Section title="Drives" portalCategory="Drives" blocked={!chassis}
            items={MOCK_ITEMS.filter(i=>i.cat==="Drives")}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="Drives")}
            onSelect={(it)=>addOrSelect(it,"Drives")}
            onRemove={(it)=>removeLine(it.sku,"Drives")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            customerName={quote.customer_name}
          />

          <Section title="Power Supplies" portalCategory="Power Supplies" blocked={!chassis}
            items={MOCK_ITEMS.filter(i=>i.cat==="Power Supplies")}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="Power Supplies")}
            onSelect={(it)=>addOrSelect(it,"Power Supplies")}
            onRemove={(it)=>removeLine(it.sku,"Power Supplies")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            customerName={quote.customer_name}
          />

          <Section title="Rail Kit" portalCategory="Rail Kit" blocked={!chassis}
            items={MOCK_ITEMS.filter(i=>i.cat==="Rail Kit").filter(i=>allowedByChassis(chassis,i))}
            selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category==="Rail Kit")}
            onSelect={(it)=>addOrSelect(it,"Rail Kit")}
            onRemove={(it)=>removeLine(it.sku,"Rail Kit")}
            onQty={(sku,cat,delta)=>bumpQty(sku,cat,delta)}
            role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
            customerName={quote.customer_name}
          />

          <div style={{fontWeight:900, marginTop:14}}>Networking</div>
          <hr className="sep"/>
          {NETWORKING_CATS.map(cat=>(
            <Section key={cat} title={cat} portalCategory={cat} blocked={!chassis}
              items={MOCK_ITEMS.filter(i=>i.cat===cat).filter(i=>allowedByChassis(chassis,i))}
              selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category===cat)}
              onSelect={(it)=>addOrSelect(it,cat)}
              onRemove={(it)=>removeLine(it.sku,cat)}
              onQty={(sku,cat2,delta)=>bumpQty(sku,cat2,delta)}
              role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
              customerName={quote.customer_name}
            />
          ))}

          <div style={{fontWeight:900, marginTop:14}}>Other</div>
          <hr className="sep"/>
          {OTHER_CATS.map(cat=>(
            <Section key={cat} title={cat} portalCategory={cat} blocked={!chassis}
              items={MOCK_ITEMS.filter(i=>i.cat===cat).filter(i=>allowedByChassis(chassis,i))}
              selectedLines={(activeConfig?.lines||[]).filter(l=>l.portal_category===cat)}
              onSelect={(it)=>addOrSelect(it,cat)}
              onRemove={(it)=>removeLine(it.sku,cat)}
              onQty={(sku,cat2,delta)=>bumpQty(sku,cat2,delta)}
              role={role} priceHistoryMap={priceHistoryMap} onOpenHistory={setHistorySku}
              customerName={quote.customer_name}
            />
          ))}
        </div>

        <div className="grid" style={{gap:12}}>
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

      
      {compareOpen ? (
        <Modal title="Compare Configs" onClose={()=>setCompareOpen(false)} size="lg">
          <div className="muted small">Side-by-side view of config totals and top lines (beta).</div>
          <hr className="sep"/>
          <CompareConfigsView version={current} />
        </Modal>
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

function Section({ title, portalCategory, help, items, selectedLines, onSelect, onRemove, onQty, blocked, role, priceHistoryMap, onOpenHistory, defaultOpen, customerName }){
  const [open, setOpen] = useState(!!defaultOpen);
  const [search,setSearch]=useState("");

  const selectedBySku = useMemo(()=>{
    const m=new Map();
    (selectedLines||[]).forEach(l=>m.set(l.sku,l));
    return m;
  },[selectedLines]);

  const summary = useMemo(()=> summarizeSelected(selectedLines), [selectedLines]);

  const filtered = useMemo(()=>{
    const n=search.trim().toLowerCase();
    return items.filter(x=>!n || x.sku.toLowerCase().includes(n) || x.desc.toLowerCase().includes(n) || (x.tags||[]).join(" ").toLowerCase().includes(n));
  },[items,search]);

  return (
    <div className="card" style={{background:"rgba(255,255,255,.02)",opacity:blocked?0.45:1,pointerEvents:blocked?"none":"auto"}}>
      <div className="accHeader" onClick={()=>setOpen(o=>!o)}>
        <div style={{minWidth:0}}>
          <div style={{fontWeight:900, display:"flex", alignItems:"center", gap:8}}>
            {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
            {title}
          </div>
          <div className="accSummary">{summary}</div>
          {help ? <div className="small muted">{help}</div> : null}
          {blocked ? <div className="small" style={{color:"var(--warn)"}}>Select a chassis first.</div> : null}
        </div>
        <span className="badge">{open ? "Hide" : "Show"}</span>
      </div>

      {open ? (
        <>
          <hr className="sep"/>
          <div style={{position:"relative",width:420,maxWidth:"100%"}}>
            <div style={{position:"absolute",left:12,top:10,opacity:.7}}><Search size={16}/></div>
            <input className="input" style={{paddingLeft:34}} value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search SKU, description, tags..."/>
          </div>

          <div className="grid" style={{marginTop:12}}>
            {filtered.length===0 ? <div className="muted small">No items match.</div> : null}
            {filtered.map(it=>{
              const line = selectedBySku.get(it.sku) || null;
              const isSelected = !!line;
              const histAll = role==="employee" ? (priceHistoryMap.get(it.sku) || []) : [];
              const hist = role==="employee" ? histAll.slice(0,3) : [];
              const cust = customerName || "(unknown)";
              const custRows = histAll.filter(r=>r.customer===cust);
              const baseline = role==="employee" ? (weightedAvgPrice(custRows, nowIso()) ?? weightedAvgPrice(histAll, nowIso())) : null;
              const unit = isSelected ? (line.override_unit_price ?? line.catalog_unit_price) : it.price;
              const diff = (baseline!=null) ? ((unit-baseline)/baseline) : null;

              return (
                <div key={it.sku} className="card" style={{padding:12, cursor: isSelected ? "default" : "pointer", borderColor: isSelected ? "rgba(51,214,159,.35)" : "var(--border)"}} onClick={()=>{
                  if(!isSelected) onSelect(it);
                }}>
                  <div className="spread">
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.desc}</div>
                      <div className="small muted">{it.sku} • Lead {it.lead}d • Tags: {(it.tags||[]).join(", ")||"—"}</div>

                      {isSelected ? (
                        <div className="row" style={{marginTop:10, alignItems:"center"}}>
                          <div className="qtyCtrl" onClick={(e)=>e.stopPropagation()}>
                            <button className="qtyBtn" onClick={()=>onQty(it.sku, portalCategory || title, -1)} title="Decrease"><Minus size={16}/></button>
                            <div style={{minWidth:18, textAlign:"center", fontWeight:900}}>{line.qty}</div>
                            <button className="qtyBtn" onClick={()=>onQty(it.sku, portalCategory || title, +1)} title="Increase"><Plus size={16}/></button>
                          </div>
                          <button className="btn danger" onClick={(e)=>{e.stopPropagation(); onRemove(it)}}><X size={16}/> Remove</button>
                        </div>
                      ) : (
                        <div className="small muted" style={{marginTop:10}}>Click to select (qty defaults to 1)</div>
                      )}

                      {role==="employee" ? (
                        <div className="row" style={{marginTop:10, gap:8}} onClick={(e)=>e.stopPropagation()}>
                          <span className="badge">Last quotes: {hist.length ? hist.map(h=>`${money(h.price)} (${fmtDate(h.date)})`).join(" • ") : "—"}</span>
                          <button className="btn" onClick={()=>onOpenHistory?.(it.sku)}><History size={16}/> Price history</button>
                          {baseline!=null && diff!=null && (diff>OVERPRICE_THRESHOLD || diff<UNDERPRICE_THRESHOLD) ? <span className={`badge ${diff<0?"primary":"warn"}`}>{diff<0?"Below avg":"Above avg"}</span> : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="right" onClick={(e)=>e.stopPropagation()}>
                      <span className="badge">{money(it.price)}</span>
                      {isSelected ? <span className="badge ok">Selected</span> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}


function Cart({config, configs, quoteTotals, totals, role, onRemove, onQty, onOpenHistory, onOpenOverride, pricingInsights, onSetConfigQty, onAddConfig, onSetActiveConfig , onDuplicateConfig}){
  const lines = config?.lines || [];
  const sorted = useMemo(()=>sortLines(lines),[lines]);
  const activeId = config?.id;

  return (
    <div className="card cartCompact">
      <div className="spread">
        <div>
          <div style={{fontWeight:900}}>Cart Preview</div>
          <div className="muted small">SKU • description • unit • qty • extended.</div>
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
            const ext = unit * l.qty;

            return (
              <div key={`${l.portal_category}:${l.sku}`} className="cartLine">
                <div className="cartLineRow">
                  <div style={{minWidth:0}}>
                    <div className="cartSku">{l.sku}</div>
                    <div className="cartDesc" title={l.description}>{l.description}</div>

                    <div className="cartControls">
                      <div className="cartUnit">
                        <span className="cartTiny">Unit</span>
                        <span className="cartMoney">{money(unit)}</span>
                        {role==="employee" ? (
                          <button className="iconBtn" title="Edit price override" onClick={()=>onOpenOverride?.(l.sku, l.portal_category)}>
                            <Pencil size={16}/>
                          </button>
                        ) : null}
                      </div>

                      <div className="qtyInline" title="Quantity">
                        <button onClick={()=>onQty(l.sku, l.portal_category, -1)} aria-label="Decrease"><Minus size={14}/></button>
                        <div className="n">{l.qty}</div>
                        <button onClick={()=>onQty(l.sku, l.portal_category, +1)} aria-label="Increase"><Plus size={14}/></button>
                      </div>

                      {role==="employee" ? (
                        <button className="iconBtn" title="Price history" onClick={()=>onOpenHistory?.(l.sku)}>
                          <History size={16}/>
                        </button>
                      ) : null}

                      <div style={{flex:1}} />

                      <button className="iconBtn danger" title="Remove" onClick={()=>onRemove(l.sku, l.portal_category)}>
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </div>

                  <div className="cartRight">
                    <div className="cartExt cartMoney">{money(ext)}</div>
                    <div className="cartTiny">Extended</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <hr className="sep"/>

      <div className="grid" style={{gap:10}}>
        <div className="spread">
          <div className="muted small">Config subtotal</div>
          <div style={{fontWeight:900}}>{money(totals.subtotal)}</div>
        </div>
        <div className="spread">
          <div className="muted small">Quote extended total</div>
          <div style={{fontWeight:900}}>{money(quoteTotals.grandExtended)}</div>
        </div>

        <div className="spread">
          <div>
            <div style={{fontWeight:900}}>Config Qty</div>
            <div className="muted small">How many of this configuration.</div>
          </div>
          <div className="qtyWrap">
            <button className="qtyBtn" onClick={()=>onSetConfigQty?.(activeId, Math.max(1,(config.qty||1)-1))} title="Decrease"><Minus size={16}/></button>
            <div className="qtyNum">{config.qty||1}</div>
            <button className="qtyBtn" onClick={()=>onSetConfigQty?.(activeId, (config.qty||1)+1)} title="Increase"><Plus size={16}/></button>
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
