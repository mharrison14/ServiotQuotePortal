import React from "react";
import { money, fmtDate } from "../logic/pricingEngine.js";

export default function PriceHistoryModal({ historySku, historyRows, onClose, Modal }){
  return (
    <Modal title={`Price History • ${historySku}`} onClose={onClose} size="sm">
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
  );
}
