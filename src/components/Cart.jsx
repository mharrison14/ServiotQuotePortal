import React, { useMemo } from "react";
import { Pencil, Minus, Plus, History, Trash2 } from "lucide-react";

function money(n){
  return (typeof n==="number" && !Number.isNaN(n))
    ? n.toLocaleString(undefined,{style:"currency",currency:"USD"})
    : "$0.00";
}

const CATEGORY_ORDER = [
  "Server Chassis","CPU","Memory","RAID Controller","Drives","Power Supplies","Rail Kit",
  "Onboard Networking","Network Daughter Card","OCP Networking","Other Networking Adapters",
  "BOSS Controller","M.2 Drives","Licensing","Bezel","Power Cords",
];

function sortLines(lines){
  return [...(lines||[])].sort((a,b)=>
    (CATEGORY_ORDER.indexOf(a.portal_category)-CATEGORY_ORDER.indexOf(b.portal_category)) ||
    ((a.line_order??0)-(b.line_order??0))
  );
}

export default function Cart({
  config,
  configs,
  quoteTotals,
  totals,
  role,
  onRemove,
  onQty,
  onOpenHistory,
  onOpenOverride,
  onSetConfigQty,
  onSetActiveConfig
}){
  const lines = config?.lines || [];
  const sorted = useMemo(()=>sortLines(lines),[lines]);
  const activeId = config?.id;

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
            const ext = unit * l.qty;

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
                    <span className="value">{money(unit)}</span>
                    {role==="employee" ? (
                      <button className="iconBtnGhost" title="Edit unit price" onClick={()=>onOpenOverride?.(l.sku, l.portal_category)}>
                        <Pencil size={14}/>
                      </button>
                    ) : null}
                  </div>

                  <div className="cartMetric">
                    <span className="label">Extended</span>
                    <span className="value">{money(ext)}</span>
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

      <div className="cartSummaryGrid">
        <div className="summaryBlock">
          <div className="muted small">Config subtotal</div>
          <div className="summaryValue">{money(totals.subtotal)}</div>
        </div>

        <div className="summaryBlock summaryQtyBlock">
          <div>
            <div className="summaryLabel">Config Qty</div>
            <div className="muted small">How many of this configuration.</div>
          </div>
          <div className="qtyInlineSlim qtyInlineConfig">
            <button onClick={()=>onSetConfigQty?.(activeId, Math.max(1,(config.qty||1)-1))} aria-label="Decrease config quantity"><Minus size={13}/></button>
            <div className="n">{config?.qty||1}</div>
            <button onClick={()=>onSetConfigQty?.(activeId, (config.qty||1)+1)} aria-label="Increase config quantity"><Plus size={13}/></button>
          </div>
        </div>

        <div className="summaryBlock">
          <div className="muted small">Quote extended total</div>
          <div className="summaryValue">{money(quoteTotals.quoteExtended ?? quoteTotals.grandExtended ?? 0)}</div>
        </div>
      </div>
    </div>
  );
}
