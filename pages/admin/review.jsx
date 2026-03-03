import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase";


function ScoreBar({ value, color }) {
  return (
    <div style={{flex:1,height:3,background:"#141414",borderRadius:2,overflow:"hidden"}}>
      <div style={{width:`${value}%`,height:"100%",background:color,borderRadius:2,transition:"width .5s ease"}}/>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:      { label:"PENDING", color:"#888" },
    pending_review: { label:"PENDING", color:"#888" },
    approved:     { label:"APPROVED", color:"#4ADE80" },
    rejected:     { label:"REJECTED", color:"#F87171" },
    needs_edit:   { label:"NEEDS EDIT", color:"#FACC15" },
  };
  const s = map[status] || map.pending;
  return <span style={{fontSize:9,padding:"2px 7px",border:`1px solid ${s.color}44`,borderRadius:2,color:s.color,letterSpacing:1.5,whiteSpace:"nowrap"}}>{s.label}</span>;
}

function DetailPanel({ bp, onAction, onClose, actioning }) {
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState({
    title: bp.title,
    description: bp.description,
    category: bp.category,
    tags: Array.isArray(bp.tags) ? bp.tags.join(", ") : bp.tags || "",
  });
  const CATEGORIES = ["VST","App","UI","Game","Script","Other"];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"stretch",justifyContent:"flex-end",zIndex:200}}>
      <div style={{width:"100%",maxWidth:600,background:"#0b0b0b",borderLeft:"1px solid #1a1a1a",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        <div style={{padding:"14px 20px",borderBottom:"1px solid #141414",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontSize:9,color:"#E8845A",letterSpacing:2,marginBottom:2}}>BLUEPRINT REVIEW</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:"#eee",letterSpacing:1}}>{bp.title}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <StatusBadge status={bp.status}/>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:16}}>✕</button>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:16}}>

          {/* Source info */}
          {bp.source_repo && (
            <div style={{background:"#080808",border:"1px solid #141414",borderRadius:4,padding:"12px 14px"}}>
              <div style={{fontSize:9,color:"#333",letterSpacing:2,marginBottom:8}}>SOURCE</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {[
                  ["Repo", bp.source_repo],
                  ["License", bp.source_license],
                  ["File", bp.source_url?.split("/").pop()],
                  ["Attribution", bp.attribution],
                ].filter(([,v])=>v).map(([k,v])=>(
                  <div key={k} style={{display:"flex",gap:12,fontSize:11}}>
                    <span style={{color:"#2a2a2a",minWidth:70}}>{k}</span>
                    <span style={{color:"#666"}}>{v}</span>
                  </div>
                ))}
                {bp.source_url && (
                  <a href={bp.source_url} target="_blank" rel="noreferrer"
                    style={{fontSize:10,color:"#E8845A44",marginTop:2,cursor:"pointer",textDecoration:"none"}}
                    onMouseEnter={e=>e.target.style.color="#E8845A"}
                    onMouseLeave={e=>e.target.style.color="#E8845A44"}>
                    → View source ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Scores */}
          <div style={{background:"#080808",border:"1px solid #141414",borderRadius:4,padding:"12px 14px"}}>
            <div style={{fontSize:9,color:"#333",letterSpacing:2,marginBottom:10}}>QUALITY SCORES</div>
            {[
              ["Completeness", bp.completeness || 0, (bp.completeness||0)>70?"#4ADE80":(bp.completeness||0)>40?"#FACC15":"#F87171"],
            ].map(([label,val,color])=>(
              <div key={label} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:10,color:"#444"}}>{label}</span>
                  <span style={{fontSize:10,color}}>{val}%</span>
                </div>
                <ScoreBar value={val} color={color}/>
              </div>
            ))}
          </div>

          {/* Editable metadata */}
          <div style={{background:"#080808",border:"1px solid #141414",borderRadius:4,padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:9,color:"#333",letterSpacing:2}}>METADATA</div>
              <button onClick={()=>setEditing(!editing)} style={{background:"none",border:"1px solid #1a1a1a",borderRadius:2,color:"#444",cursor:"pointer",fontSize:9,padding:"2px 8px",fontFamily:"'Share Tech Mono',monospace",letterSpacing:1}}>
                {editing?"DONE":"EDIT"}
              </button>
            </div>
            {editing ? (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <input value={edits.title} onChange={e=>setEdits({...edits,title:e.target.value})} placeholder="Title"
                  style={{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:3,padding:"8px 10px",color:"#aaa",fontSize:12,outline:"none"}}/>
                <select value={edits.category} onChange={e=>setEdits({...edits,category:e.target.value})}
                  style={{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:3,padding:"8px 10px",color:"#aaa",fontSize:12,outline:"none"}}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
                <textarea value={edits.description} onChange={e=>setEdits({...edits,description:e.target.value})} rows={3}
                  style={{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:3,padding:"8px 10px",color:"#aaa",fontSize:12,outline:"none",resize:"vertical"}}/>
                <input value={edits.tags} onChange={e=>setEdits({...edits,tags:e.target.value})} placeholder="tags, comma, separated"
                  style={{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:3,padding:"8px 10px",color:"#aaa",fontSize:12,outline:"none"}}/>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[["Title",edits.title],["Category",edits.category],["Description",edits.description],["Tags",edits.tags]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",gap:12,fontSize:11}}>
                    <span style={{color:"#2a2a2a",minWidth:70,flexShrink:0}}>{k}</span>
                    <span style={{color:"#666",lineHeight:1.5}}>{v}</span>
                  </div>
                ))}
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <span style={{color:"#2a2a2a",fontSize:11,minWidth:70}}>Author</span>
                  <span style={{color:"#666",fontSize:11}}>{bp.profiles?.username || "anonymous"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Raw .md content */}
          <div style={{background:"#080808",border:"1px solid #141414",borderRadius:4,padding:"12px 14px"}}>
            <div style={{fontSize:9,color:"#333",letterSpacing:2,marginBottom:8}}>RAW CONTENT</div>
            <pre style={{fontSize:10,color:"#444",lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:200,overflowY:"auto"}}>
              {bp.content}
            </pre>
          </div>

          {bp.attribution&&(
            <div style={{fontSize:10,color:"#1e1e1e",padding:"8px 10px",border:"1px solid #111",borderRadius:3}}>
              📌 {bp.attribution}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div style={{padding:"14px 20px",borderTop:"1px solid #141414",display:"flex",gap:8,flexShrink:0}}>
          <button onClick={()=>onAction(bp.id,"rejected",edits)} disabled={actioning}
            style={{flex:1,padding:"10px",border:"1px solid #F8717133",borderRadius:3,background:"transparent",color:actioning?"#333":"#F87171",cursor:actioning?"not-allowed":"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:11,letterSpacing:1,transition:"all .15s"}}
            onMouseEnter={e=>{if(!actioning)e.currentTarget.style.background="#F8717111"}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>
            ✗ REJECT
          </button>
          <button onClick={()=>onAction(bp.id,"needs_edit",edits)} disabled={actioning}
            style={{flex:1,padding:"10px",border:"1px solid #FACC1533",borderRadius:3,background:"transparent",color:actioning?"#333":"#FACC15",cursor:actioning?"not-allowed":"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:11,letterSpacing:1,transition:"all .15s"}}
            onMouseEnter={e=>{if(!actioning)e.currentTarget.style.background="#FACC1511"}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>
            ✎ NEEDS EDIT
          </button>
          <button onClick={()=>onAction(bp.id,"approved",edits)} disabled={actioning}
            style={{flex:2,padding:"10px",border:"1px solid #4ADE8033",borderRadius:3,background:actioning?"#141414":"#4ADE8022",color:actioning?"#333":"#4ADE80",cursor:actioning?"not-allowed":"pointer",fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:2,transition:"all .15s"}}
            onMouseEnter={e=>{if(!actioning)e.currentTarget.style.background="#4ADE8033"}}
            onMouseLeave={e=>{e.currentTarget.style.background=actioning?"#141414":"#4ADE8022"}}>
            {actioning?"SAVING...":"✓ APPROVE"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminReview() {
  const { user: authUser, profile, loading: authLoading } = useAuth();
  const [bps, setBps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState(null);

  // Guard: admin only
  const isAdmin = profile?.tier === "admin";

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) return;
    loadPending();
  }, [authLoading, isAdmin]);

  async function loadPending() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Fetch all statuses for admin view — but for simplicity fetch pending + needs_edit
      const res = await fetch("/api/admin/list", {
        headers: session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setBps(data);
    } catch {
      // Fallback: load directly via supabase admin client isn't possible client-side
      // The admin list API route handles this
      setError("Could not load blueprints. Make sure /api/admin/list exists.");
    }
    setLoading(false);
  }

  const handleAction = async (id, action, edits) => {
    setActioning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ blueprintId: id, action, edits }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update local state optimistically
      setBps(prev => prev.map(b => b.id !== id ? b : {
        ...b, status: action,
        title: edits.title,
        description: edits.description,
        category: edits.category,
        tags: typeof edits.tags === "string" ? edits.tags.split(",").map(t=>t.trim()).filter(Boolean) : edits.tags,
      }));
      setSelected(null);
    } catch (e) {
      setError(e.message);
    }
    setActioning(false);
  };

  const counts = {
    all: bps.length,
    pending: bps.filter(b=>b.status==="pending").length,
    approved: bps.filter(b=>b.status==="approved").length,
    rejected: bps.filter(b=>b.status==="rejected").length,
    needs_edit: bps.filter(b=>b.status==="needs_edit").length,
  };

  const visible = filter === "all" ? bps : bps.filter(b => b.status === filter);
  const selectedBp = bps.find(b=>b.id===selected);

  const FILTERS = [
    { key:"all", label:"ALL" },
    { key:"pending", label:"PENDING" },
    { key:"approved", label:"APPROVED" },
    { key:"needs_edit", label:"NEEDS EDIT" },
    { key:"rejected", label:"REJECTED" },
  ];

  if (authLoading) {
    return (
      <div style={{minHeight:"100vh",background:"#080808",display:"flex",alignItems:"center",justifyContent:"center"}}>

        <div style={{fontSize:11,color:"#333",letterSpacing:2}}>LOADING...</div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div style={{minHeight:"100vh",background:"#080808",display:"flex",alignItems:"center",justifyContent:"center"}}>

        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#333",letterSpacing:2,marginBottom:10}}>SIGN IN REQUIRED</div>
          <a href="/" style={{color:"#E8845A",fontSize:11,textDecoration:"none"}}>← Back to marketplace</a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{minHeight:"100vh",background:"#080808",display:"flex",alignItems:"center",justifyContent:"center"}}>

        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#F87171",letterSpacing:2,marginBottom:10}}>ACCESS DENIED</div>
          <div style={{fontSize:11,color:"#333",marginBottom:16}}>Admin access required.</div>
          <a href="/" style={{color:"#E8845A",fontSize:11,textDecoration:"none"}}>← Back to marketplace</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",position:"relative"}}>
      <div className="gridbg"/>

      {/* HEADER */}
      <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,8,.96)",backdropFilter:"blur(8px)",borderBottom:"1px solid rgba(255,255,255,.05)",padding:"0 24px",display:"flex",alignItems:"center",height:50,gap:14}}>
        <a href="/" style={{textDecoration:"none"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:3,color:"#eee"}}>
            BLUE<span style={{color:"#E8845A"}}>PRINT</span><span style={{color:"#222"}}>.MD</span>
          </div>
        </a>
        <div style={{width:1,height:16,background:"#1a1a1a"}}/>
        <div style={{fontSize:9,color:"#333",letterSpacing:2}}>IMPORT REVIEW</div>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:14}}>
          {[["pending","#888"],["approved","#4ADE80"],["needs_edit","#FACC15"],["rejected","#F87171"]].map(([k,c])=>(
            counts[k] > 0 && <div key={k} style={{fontSize:10,color:c}}>{counts[k]} {k.replace("_"," ")}</div>
          ))}
        </div>
      </header>

      <div style={{position:"relative",zIndex:1,padding:"20px 24px"}}>
        {error && (
          <div style={{marginBottom:16,padding:"10px 14px",background:"#F8717111",border:"1px solid #F8717133",borderRadius:3,fontSize:11,color:"#F87171"}}>
            {error}
          </div>
        )}

        {/* Stats bar */}
        <div style={{display:"flex",gap:8,marginBottom:20,padding:"12px 16px",background:"rgba(255,255,255,.015)",border:"1px solid rgba(255,255,255,.05)",borderRadius:4,flexWrap:"wrap"}}>
          <div style={{fontSize:9,color:"#333",letterSpacing:2,marginRight:8,alignSelf:"center"}}>PIPELINE</div>
          {[
            {label:`${counts.pending} PENDING`,color:"#888"},
            {label:"→",color:"#1a1a1a"},
            {label:`${counts.approved} APPROVED`,color:"#4ADE80"},
            {label:"+",color:"#1a1a1a"},
            {label:`${counts.needs_edit} NEEDS EDIT`,color:"#FACC15"},
            {label:"+",color:"#1a1a1a"},
            {label:`${counts.rejected} REJECTED`,color:"#F87171"},
          ].map((item,i)=>(
            <span key={i} style={{fontSize:11,color:item.color,letterSpacing:1}}>{item.label}</span>
          ))}
          <div style={{flex:1}}/>
          <button onClick={loadPending} style={{padding:"5px 12px",border:"1px solid #1a1a1a",borderRadius:3,background:"transparent",color:"#333",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:1}}>
            ↻ REFRESH
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{display:"flex",gap:4,marginBottom:14}}>
          {FILTERS.map(f=>(
            <button key={f.key} onClick={()=>setFilter(f.key)}
              style={{padding:"6px 12px",borderRadius:3,border:`1px solid ${filter===f.key?"#E8845A44":"rgba(255,255,255,.04)"}`,fontSize:9,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",letterSpacing:1.5,background:filter===f.key?"#E8845A0a":"transparent",color:filter===f.key?"#E8845A":"#333",transition:"all .15s"}}>
              {f.label} {counts[f.key]>0&&`(${counts[f.key]})`}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{border:"1px solid rgba(255,255,255,.05)",borderRadius:4,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 80px 80px 120px 100px",gap:0,padding:"8px 16px",borderBottom:"1px solid rgba(255,255,255,.04)",background:"rgba(255,255,255,.015)"}}>
            {["BLUEPRINT","CATEGORY","COMPLETE","AUTHOR","STATUS"].map(h=>(
              <div key={h} style={{fontSize:9,color:"#2a2a2a",letterSpacing:1.5}}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{padding:"40px",textAlign:"center",color:"#1e1e1e",fontSize:12}}>Loading blueprints...</div>
          ) : visible.length === 0 ? (
            <div style={{padding:"40px",textAlign:"center",color:"#1e1e1e",fontSize:12}}>No blueprints in this category.</div>
          ) : (
            visible.map(bp=>(
              <div key={bp.id} className="row" onClick={()=>setSelected(bp.id)}
                style={{display:"grid",gridTemplateColumns:"2fr 80px 80px 120px 100px",gap:0,padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,.03)",cursor:"pointer",transition:"background .15s",background:"transparent"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(232,132,90,.03)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

                <div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,color:"#ccc",letterSpacing:.5,marginBottom:2}}>{bp.title}</div>
                  <div style={{fontSize:10,color:"#333",lineHeight:1.4}}>{bp.description?.slice(0,70)}...</div>
                  <div style={{display:"flex",gap:5,marginTop:5}}>
                    {(bp.tags||[]).slice(0,3).map(t=><span key={t} style={{fontSize:9,color:"#222"}}>#{t}</span>)}
                  </div>
                </div>

                <div style={{display:"flex",alignItems:"center"}}>
                  <span style={{fontSize:10,color:"#444",letterSpacing:1}}>{bp.category}</span>
                </div>

                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <ScoreBar value={bp.completeness||0} color={(bp.completeness||0)>70?"#4ADE80":(bp.completeness||0)>40?"#FACC15":"#F87171"}/>
                  <span style={{fontSize:9,color:"#444",minWidth:24}}>{bp.completeness||0}</span>
                </div>

                <div style={{display:"flex",alignItems:"center"}}>
                  <span style={{fontSize:10,color:"#333"}}>{bp.profiles?.username||"anonymous"}</span>
                </div>

                <div style={{display:"flex",alignItems:"center"}}>
                  <StatusBadge status={bp.status}/>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{marginTop:12,fontSize:10,color:"#1e1e1e"}}>
          Click any row to review details, edit metadata, and approve or reject.
        </div>
      </div>

      {selectedBp && (
        <DetailPanel
          bp={selectedBp}
          onAction={handleAction}
          onClose={()=>setSelected(null)}
          actioning={actioning}
        />
      )}
    </div>
  );
}
