const PRICE_HALF_LIFE_DAYS = 30;

export function money(n){
  return (typeof n==="number" && !Number.isNaN(n))
    ? n.toLocaleString(undefined,{style:"currency",currency:"USD"})
    : "$0.00";
}

export function fmtDate(iso){
  try{ return new Date(iso).toLocaleDateString() }catch{ return "" }
}

function daysBetween(isoA, isoB){
  try{
    const a=new Date(isoA).getTime();
    const b=new Date(isoB).getTime();
    return Math.abs(b-a)/(1000*60*60*24);
  }catch{ return 9999; }
}

export function buildPriceHistory(quotes){
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

export function lastNHistory(historyMap, sku, n=3){
  const arr = historyMap.get(sku) || [];
  return arr.slice(0,n);
}

export function weightedAvgPrice(rows, nowIsoStr){
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
