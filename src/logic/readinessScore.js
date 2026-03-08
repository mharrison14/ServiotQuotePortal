export function computeTotals(lines){
  const subtotal = (lines||[]).reduce((a,l)=>a+((l.override_unit_price ?? l.catalog_unit_price)*l.qty),0);
  const overriddenLines = (lines||[]).filter(l=>l.override_unit_price!=null).length;
  const leadTimeMax = (lines||[]).reduce((m,l)=>Math.max(m,l.lead_time_days||0),0);
  return { subtotal, overriddenLines, leadTimeMax };
}

export function readinessScore(lines){
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

export function scoreColor(score){
  const hue = Math.round((score/100)*120);
  return `hsl(${hue} 75% 45%)`;
}
