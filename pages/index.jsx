import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { useLang } from "@/context/lang";
import { blueprints as bpHelpers } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

// Music-only for now: VST (plugins/synths/effects), App (music apps), UI (plugin UIs)
const CATEGORIES = ["All", "VST", "App", "UI"];
const LLMS = [
  { id:"claude", label:"Claude", sub:"Sonnet 4.6", color:"#E8845A" },
  { id:"gemini", label:"Gemini", sub:"2.0 Flash", color:"#4A9EFF" },
  { id:"chatgpt", label:"ChatGPT", sub:"GPT-4o", color:"#19C37D" },
];

function KarmaDots({ level }) {
  const col = ["#1a1a1a","#333","#666","#999","#E8845A","#FFD700"][Math.min(level,5)];
  return <div style={{display:"flex",gap:3}}>{[1,2,3,4,5].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:i<=level?col:"#111",border:`1px solid ${i<=level?col+"99":"#1a1a1a"}`}}/>)}</div>;
}

function TierBadge({ tier }) {
  const { t } = useLang();
  const map={
    lurker:      { l: t("tierLurker"),      c:"#444" },
    contributor: { l: t("tierContributor"), c:"#E8845A" },
    donor:       { l: t("tierSupporter"),   c:"#FFD700" },
    admin:       { l: t("tierAdmin"),       c:"#c084fc" },
  };
  const td = map[tier] || map.lurker;
  return <span style={{fontSize:9,padding:"2px 7px",borderRadius:2,border:`1px solid ${td.c}44`,color:td.c,letterSpacing:1.5}}>{td.l}</span>;
}

function BlueprintCard({ bp, onBuild }) {
  const { t } = useLang();
  const [h, setH] = useState(false);
  return (
    <div className="card" onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{background:h?"rgba(232,132,90,.04)":"rgba(255,255,255,.015)",border:`1px solid ${h?"rgba(232,132,90,.18)":"rgba(255,255,255,.06)"}`,borderRadius:4,padding:"18px 20px",display:"flex",flexDirection:"column",gap:11,transition:"all .2s",position:"relative",overflow:"hidden"}}>
      {h&&<div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,#E8845A44,transparent)"}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:9,padding:"2px 8px",border:"1px solid rgba(255,255,255,.07)",borderRadius:2,color:"#444",letterSpacing:2}}>{bp.category}</span>
        <KarmaDots level={bp.karma}/>
      </div>
      <div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:19,color:"#eee",letterSpacing:1,marginBottom:2}}>{bp.title}</div>
        <div style={{fontSize:10,color:"#333"}}>{t("cardBy")} {bp.author}</div>
      </div>
      <div style={{fontSize:12,color:"#555",lineHeight:1.6}}>{bp.description}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
        {(bp.tags||[]).map(tag=><span key={tag} style={{fontSize:10,color:"#2a2a2a"}}>#{tag}</span>)}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8,borderTop:"1px solid rgba(255,255,255,.05)"}}>
        <div style={{display:"flex",gap:12}}>
          <span style={{fontSize:10,color:"#333"}}>↓ {bp.downloads}</span>
          <span style={{fontSize:10,color:"#333"}}>⚡ {bp.builds}</span>
        </div>
        <button className="btn-ghost" onClick={()=>onBuild(bp)}
          style={{padding:"5px 14px",border:"1px solid rgba(255,255,255,.07)",borderRadius:3,color:h?"#E8845A":"#444",fontSize:11,letterSpacing:1,borderColor:h?"#E8845A44":"rgba(255,255,255,.07)"}}>
          {t("buildBtn")}
        </button>
      </div>
    </div>
  );
}

function BuildModal({ bp, user, onClose }) {
  const { t } = useLang();
  const [mode, setMode] = useState(null);
  const [llm, setLlm] = useState(LLMS[0]);
  const [apiKey, setApiKey] = useState("");
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState(null);
  const [buildError, setBuildError] = useState(null);

  const modes = [
    { id:"key",     icon:"🔑", label:t("buildModeOwnKey"),     sub:t("buildModeOwnKeySub"),                                      avail:true },
    { id:"credits", icon:"⚡", label:t("buildModeCredits"),    sub:user?`${user.builds_left} ${t("buildModeCreditsRemaining")}`:"Sign in to use credits", avail:!!user&&(user.tier==="contributor"||user.tier==="donor"||user.tier==="admin") },
    { id:"payg",    icon:"☕", label:t("buildModePayg"),       sub:t("buildModePaygSub"),                                        avail:false },
  ];

  const ready = mode && (mode!=="key" || apiKey.length>10) && !building;

  const handleBuild = async () => {
    setBuilding(true); setBuildError(null);
    try {
      const session = supabase ? (await supabase.auth.getSession()).data?.session : null;
      const headers = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const res = await fetch("/api/build", {
        method: "POST", headers,
        body: JSON.stringify({ blueprintId: bp.id, llm: llm.id, accessMode: mode==="key"?"own_key":"credits", userApiKey: mode==="key"?apiKey:undefined }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) { setBuildError(e.message); }
    setBuilding(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20,overflowY:"auto"}}>
      <div style={{background:"#0b0b0b",border:"1px solid #1e1e1e",borderRadius:5,width:"100%",maxWidth:result?720:480,overflow:"hidden",margin:"auto",transition:"max-width .3s"}}>
        <div style={{padding:"15px 20px",borderBottom:"1px solid #141414",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:9,color:"#E8845A",letterSpacing:2,marginBottom:3}}>{t("buildModalTitle")}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#eee",letterSpacing:1}}>{bp.title}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:16}}>✕</button>
        </div>

        {result ? (
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:9,color:"#4ADE80",letterSpacing:2}}>{t("buildComplete")}</div>
              <div style={{fontSize:10,color:"#333"}}>{result.tokens?.toLocaleString()} tokens · ${result.cost_usd}</div>
            </div>
            <pre style={{background:"#080808",border:"1px solid #141414",borderRadius:3,padding:14,fontSize:11,color:"#888",lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:500,overflowY:"auto"}}>
              {result.content}
            </pre>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>navigator.clipboard.writeText(result.content)}
                style={{flex:1,padding:"10px",border:"1px solid #333",borderRadius:3,background:"transparent",color:"#888",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:11,letterSpacing:1}}>
                {t("buildCopy")}
              </button>
              <button onClick={()=>{setResult(null);setMode(null);setBuildError(null);}}
                style={{flex:1,padding:"10px",border:"1px solid #E8845A44",borderRadius:3,background:"transparent",color:"#E8845A",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:11,letterSpacing:1}}>
                {t("buildAgain")}
              </button>
            </div>
          </div>
        ) : (
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:18}}>
            <div>
              <div style={{fontSize:9,color:"#333",letterSpacing:2,marginBottom:9}}>{t("buildStep1")}</div>
              <div style={{display:"flex",gap:7}}>
                {LLMS.map(l=>(
                  <button key={l.id} onClick={()=>setLlm(l)} style={{flex:1,padding:"9px 6px",borderRadius:3,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",border:`1px solid ${llm.id===l.id?l.color+"55":"#161616"}`,background:llm.id===l.id?l.color+"0d":"transparent",color:llm.id===l.id?l.color:"#333",transition:"all .15s"}}>
                    <div style={{fontSize:12}}>{l.label}</div>
                    <div style={{fontSize:9,opacity:.5,marginTop:2}}>{l.sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:9,color:"#333",letterSpacing:2,marginBottom:9}}>{t("buildStep2")}</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {modes.map(m=>(
                  <button key={m.id} onClick={()=>m.avail&&setMode(m.id)}
                    style={{padding:"11px 14px",borderRadius:3,border:`1px solid ${mode===m.id?"#E8845A33":"#141414"}`,background:mode===m.id?"#E8845A08":"transparent",color:!m.avail?"#1e1e1e":mode===m.id?"#E8845A":"#444",display:"flex",alignItems:"center",gap:12,textAlign:"left",cursor:m.avail?"pointer":"not-allowed",fontFamily:"'Share Tech Mono',monospace",transition:"all .15s"}}>
                    <span style={{fontSize:14}}>{m.icon}</span>
                    <div>
                      <div style={{fontSize:11}}>{m.label}</div>
                      <div style={{fontSize:9,opacity:.4,marginTop:2}}>{m.avail?m.sub:t("buildModeUnlockHint")}</div>
                    </div>
                    {mode===m.id&&<span style={{marginLeft:"auto",fontSize:8,color:"#E8845A"}}>●</span>}
                  </button>
                ))}
              </div>
            </div>
            {mode==="key"&&(
              <div>
                <div style={{fontSize:9,color:"#333",letterSpacing:2,marginBottom:8}}>03 — {llm.label.toUpperCase()} API KEY</div>
                <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={t("buildApiKeyPlaceholder")} type="password"
                  style={{width:"100%",background:"#080808",border:"1px solid #141414",borderRadius:3,padding:"9px 12px",color:"#888",fontSize:12,outline:"none"}}/>
                <div style={{fontSize:9,color:"#1e1e1e",marginTop:5}}>{t("validationNotice")}</div>
              </div>
            )}
            {buildError&&<div style={{fontSize:10,color:"#F87171",padding:"8px 12px",border:"1px solid #F8717133",borderRadius:3}}>{buildError}</div>}
            <button onClick={handleBuild} disabled={!ready}
              style={{padding:"13px",borderRadius:3,border:"none",fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,cursor:ready?"pointer":"not-allowed",background:ready?"#E8845A":"#141414",color:ready?"#fff":"#2a2a2a",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              {building?<><span className="spinner"/><span>{t("buildBuilding")}</span></>:!mode?t("buildSelectMode"):`${t("buildStartBtn")} ${llm.label.toUpperCase()}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

async function validateBlueprint(mdContent) {
  const res = await fetch("/api/validate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({content:mdContent}) });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

function ScoreBar({ score, pass }) {
  const color = pass?"#4ADE80":score>40?"#FACC15":"#F87171";
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:3,background:"#141414",borderRadius:2,overflow:"hidden"}}>
        <div style={{width:`${score}%`,height:"100%",background:color,borderRadius:2,transition:"width .6s ease"}}/>
      </div>
      <span style={{fontSize:10,color,minWidth:28,textAlign:"right"}}>{score}</span>
    </div>
  );
}

function ValidationReport({ result }) {
  const { t } = useLang();
  return (
    <div style={{background:"#080808",border:`1px solid ${result.overall?"#4ADE8022":"#F8717122"}`,borderRadius:4,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid #0f0f0f",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:9,letterSpacing:2,color:"#333"}}>{t("validationTitle")}</span>
        <span style={{fontSize:10,color:result.overall?"#4ADE80":"#F87171",letterSpacing:1}}>
          {result.overall?t("validationPassed"):t("validationFailed")}
        </span>
      </div>
      <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:12}}>
        {[{label:t("validationSecurity"),data:result.security},{label:t("validationQuality"),data:result.quality}].map(({label,data})=>(
          <div key={label}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:9,color:"#444",letterSpacing:2}}>{label}</span>
              <span style={{fontSize:9,color:data.pass?"#4ADE80":"#F87171"}}>{data.pass?t("validationPass"):t("validationFail")}</span>
            </div>
            <ScoreBar score={data.score} pass={data.pass}/>
            {data.issues?.length>0&&<div style={{marginTop:6,display:"flex",flexDirection:"column",gap:3}}>{data.issues.map((iss,i)=><div key={i} style={{fontSize:10,color:"#F87171",paddingLeft:10,borderLeft:"1px solid #F8717133"}}>⚠ {iss}</div>)}</div>}
            {data.suggestions?.length>0&&<div style={{marginTop:4,display:"flex",flexDirection:"column",gap:3}}>{data.suggestions.map((s,i)=><div key={i} style={{fontSize:10,color:"#888",paddingLeft:10,borderLeft:"1px solid #333"}}>→ {s}</div>)}</div>}
          </div>
        ))}
        <div style={{paddingTop:8,borderTop:"1px solid #0f0f0f",fontSize:10,color:"#555",fontStyle:"italic"}}>{result.summary}</div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onSubmit }) {
  const { t } = useLang();
  const [form, setForm] = useState({title:"",category:"VST",description:"",tags:"",file:null,content:""});
  const [validation, setValidation] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const inp = (f,rows) => ({
    value:form[f], onChange:e=>setForm({...form,[f]:e.target.value}), rows,
    style:{width:"100%",background:"#080808",border:"1px solid #141414",borderRadius:3,padding:"9px 12px",color:"#888",fontSize:12,outline:"none",resize:rows?"vertical":undefined}
  });

  const handleFile = (file) => {
    if (!file) return;
    setValidation(null); setScanError(null);
    const reader = new FileReader();
    reader.onload = e => setForm(f=>({...f,file,content:e.target.result}));
    reader.readAsText(file);
  };

  const runScan = async () => {
    if (!form.content) return;
    setValidation("scanning"); setScanError(null);
    try { setValidation(await validateBlueprint(form.content)); }
    catch(e) { setScanError(t("uploadScanError")); setValidation(null); }
  };

  const canPublish = form.title && form.file && validation && validation!=="scanning" && validation.overall;

  const handleSubmit = async () => {
    if (!canPublish || submitting) return;
    setSubmitting(true);
    try { await onSubmit({...form,completeness:validation?.quality?.score}); }
    finally { setSubmitting(false); }
  };

  const publishLabel = submitting ? t("uploadSubmitting")
    : !form.file ? t("uploadFileFirst")
    : !validation || validation==="scanning" ? t("uploadScanRequired")
    : !validation.overall ? t("uploadFixIssues")
    : t("uploadPublish");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20,overflowY:"auto"}}>
      <div style={{background:"#0b0b0b",border:"1px solid #1e1e1e",borderRadius:5,width:"100%",maxWidth:480,overflow:"hidden",margin:"auto"}}>
        <div style={{padding:"15px 20px",borderBottom:"1px solid #141414",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:9,color:"#E8845A",letterSpacing:2,marginBottom:2}}>{t("uploadTitle")}</div>
            <div style={{fontSize:10,color:"#333"}}>{t("uploadSubtitle")}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>
          <input placeholder={t("uploadTitlePlaceholder")} {...inp("title")}/>
          <select {...inp("category")} style={{...inp("category").style,background:"#0a0a0a"}}>
            {CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}
          </select>
          <textarea placeholder={t("uploadDescPlaceholder")} {...inp("description",3)}/>
          <input placeholder={t("uploadTagsPlaceholder")} {...inp("tags")}/>

          <div onClick={()=>document.getElementById("mdfile").click()}
            style={{border:`2px dashed ${form.file?"#E8845A44":"#141414"}`,borderRadius:3,padding:"20px",textAlign:"center",cursor:"pointer",transition:"all .2s"}}>
            {form.file
              ?<div><div style={{color:"#E8845A",fontSize:12}}>📄 {form.file.name}</div><div style={{color:"#333",fontSize:10,marginTop:3}}>{t("uploadClickChange")}</div></div>
              :<div><div style={{color:"#2a2a2a",fontSize:12,marginBottom:3}}>{t("uploadDropzone")}</div><div style={{color:"#1a1a1a",fontSize:10}}>{t("uploadOnly")}</div></div>}
            <input id="mdfile" type="file" accept=".md" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          </div>

          {form.file&&validation===null&&(
            <button onClick={runScan} style={{padding:"10px",border:"1px solid #E8845A44",borderRadius:3,background:"#E8845A0a",color:"#E8845A",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:11,letterSpacing:1}}>
              {t("uploadScan")}
            </button>
          )}
          {validation==="scanning"&&(
            <div style={{background:"#080808",border:"1px solid #141414",borderRadius:4,padding:"16px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"#E8845A",letterSpacing:2,marginBottom:6}}>{t("uploadScanning")}</div>
              <div style={{display:"flex",justifyContent:"center",gap:4}}>{[0,1,2,3,4].map(i=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:"#E8845A",animation:`pulse 1.2s ${i*0.2}s ease-in-out infinite`}}/>)}</div>
              <div style={{fontSize:10,color:"#333",marginTop:8}}>{t("uploadScanningMsg")}</div>
            </div>
          )}
          {validation&&validation!=="scanning"&&(
            <>
              <ValidationReport result={validation}/>
              {!validation.overall&&(
                <button onClick={runScan} style={{padding:"8px",border:"1px solid #333",borderRadius:3,background:"transparent",color:"#555",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:1}}>
                  {t("uploadRescan")}
                </button>
              )}
            </>
          )}
          {scanError&&<div style={{fontSize:10,color:"#F87171",padding:"8px 12px",border:"1px solid #F8717133",borderRadius:3}}>{scanError}</div>}

          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={onClose} style={{flex:1,padding:"10px",border:"1px solid #141414",borderRadius:3,background:"transparent",color:"#333",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:11}}>{t("uploadCancel")}</button>
            <button onClick={handleSubmit}
              style={{flex:2,padding:"10px",border:"none",borderRadius:3,background:canPublish?"#E8845A":"#141414",color:canPublish?"#fff":"#2a2a2a",cursor:canPublish&&!submitting?"pointer":"not-allowed",fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:2,transition:"all .2s"}}>
              {publishLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ onClose }) {
  const { t } = useLang();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { signIn, signUp, signInWithGitHub } = useAuth();

  const inp = (val,set,ph,type="text") => ({
    value:val, onChange:e=>set(e.target.value), placeholder:ph, type,
    style:{width:"100%",background:"#080808",border:"1px solid #141414",borderRadius:3,padding:"9px 12px",color:"#888",fontSize:12,outline:"none",marginBottom:8}
  });

  const handleSubmit = async () => {
    setLoading(true); setError(null);
    try {
      if (mode==="signin") await signIn(email,password);
      else await signUp(email,password,username);
      onClose();
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
      <div style={{background:"#0b0b0b",border:"1px solid #1e1e1e",borderRadius:5,width:"100%",maxWidth:360,padding:28}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#eee",marginBottom:4}}>
          {mode==="signin"?t("authSignIn"):t("authCreateAccount")}
        </div>
        <div style={{fontSize:9,color:"#333",letterSpacing:1,marginBottom:20}}>
          {mode==="signin"?t("authWelcome"):t("authSubtitle")}
        </div>
        {mode==="signup"&&<input {...inp(username,setUsername,t("authUsername"))}/>}
        <input {...inp(email,setEmail,t("authEmail"),"email")}/>
        <input {...inp(password,setPassword,t("authPassword"),"password")}/>
        {error&&<div style={{fontSize:10,color:"#F87171",padding:"8px 10px",border:"1px solid #F8717133",borderRadius:3,marginBottom:10}}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading}
          style={{width:"100%",padding:"11px",borderRadius:3,border:"none",background:loading?"#141414":"#E8845A",color:loading?"#333":"#fff",fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:2,cursor:loading?"not-allowed":"pointer",marginBottom:10}}>
          {loading?"...":(mode==="signin"?t("authSignIn"):t("authCreateAccount"))}
        </button>
        <button onClick={signInWithGitHub}
          style={{width:"100%",padding:"10px",borderRadius:3,border:"1px solid #222",background:"transparent",color:"#555",fontFamily:"'Share Tech Mono',monospace",fontSize:11,letterSpacing:1,cursor:"pointer",marginBottom:16}}>
          {t("authGitHub")}
        </button>
        <div style={{textAlign:"center",fontSize:10,color:"#333"}}>
          {mode==="signin"?t("authNoAccount"):t("authHaveAccount")}
          <span style={{color:"#E8845A",cursor:"pointer"}} onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError(null);}}>
            {mode==="signin"?t("authSignUpLink"):t("authSignInLink")}
          </span>
        </div>
        <button onClick={onClose} style={{display:"block",margin:"12px auto 0",background:"none",border:"none",color:"#222",cursor:"pointer",fontSize:10,fontFamily:"'Share Tech Mono',monospace"}}>
          {t("authCancel")}
        </button>
      </div>
    </div>
  );
}

function CoffeeModal({ onClose }) {
  const { t } = useLang();
  const tiers = [
    [t("coffeeTier1"),"$3"],
    [t("coffeeTier2"),"$6"],
    [t("coffeeTier3"),"$10"],
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
      <div style={{background:"#0b0b0b",border:"1px solid #1e1e1e",borderRadius:5,width:"100%",maxWidth:360,padding:28,textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:14}}>☕</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:3,color:"#eee",marginBottom:8}}>{t("coffeeTitle")}</div>
        <div style={{fontSize:11,color:"#444",lineHeight:1.8,marginBottom:20}}>
          {t("coffeeDesc1")}<br/>{t("coffeeDesc2")}<br/>
          <span style={{color:"#333"}}>{t("coffeeDesc3")}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
          {tiers.map(([label,price])=>(
            <button key={price} className="btn-ghost" style={{padding:"10px 14px",border:"1px solid #1a1a1a",borderRadius:3,color:"#555",fontSize:11,display:"flex",justifyContent:"space-between"}}>
              <span>{label}</span><span>{price}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#222",cursor:"pointer",fontSize:10,fontFamily:"'Share Tech Mono',monospace"}}>{t("coffeeDecline")}</button>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { user: authUser, profile, signOut, loading: authLoading } = useAuth();
  const { t, lang, switchLang, SUPPORTED_LANGS } = useLang();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showCoffee, setShowCoffee] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [buildTarget, setBuildTarget] = useState(null);
  const [bpList, setBpList] = useState([]);
  const [bpLoading, setBpLoading] = useState(true);
  const [uploadMsg, setUploadMsg] = useState(null);

  const user = profile ? {
    name: profile.username,
    karma: Math.min(profile.karma,5),
    tier: profile.tier,
    builds_left: profile.build_credits,
  } : null;

  useEffect(()=>{
    if (!supabase) { setBpLoading(false); return; }
    bpHelpers.list({limit:100})
      .then(data=>setBpList(data.map(bp=>({
        id:bp.id, title:bp.title, category:bp.category,
        author:bp.profiles?.username||"anonymous",
        description:bp.description, tags:bp.tags||[],
        downloads:bp.download_count||0, builds:bp.build_count||0,
        karma:Math.min(bp.karma||0,5),
      }))))
      .catch(()=>{})
      .finally(()=>setBpLoading(false));
  },[]);

  const filtered = bpList.filter(bp=>
    (category==="All"||bp.category===category)&&
    (bp.title.toLowerCase().includes(search.toLowerCase())||
     bp.description.toLowerCase().includes(search.toLowerCase())||
     bp.tags.some(tag=>tag.toLowerCase().includes(search.toLowerCase())))
  );

  const handleUpload = async (form) => {
    if (!authUser) { setShowUpload(false); setShowAuth(true); return; }
    try {
      await bpHelpers.create({ title:form.title, description:form.description, content:form.content, category:form.category, tags:form.tags, tech_stack:[], completeness:form.completeness||70, authorId:authUser.id });
      setShowUpload(false);
      setUploadMsg(t("uploadSuccess"));
      setTimeout(()=>setUploadMsg(null),6000);
    } catch(e) { console.error("Upload failed:",e); }
  };

  // Translated category labels (only "All" changes; others stay as-is)
  const categoryLabels = { All: t("filterAll") };

  return (
    <div style={{minHeight:"100vh",position:"relative"}}>
      <div className="scanline"/>
      <div className="gridbg"/>

      {/* HEADER */}
      <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,8,.96)",backdropFilter:"blur(8px)",borderBottom:"1px solid rgba(255,255,255,.05)",padding:"0 22px",display:"flex",alignItems:"center",height:50,gap:14}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:3,color:"#eee",flexShrink:0}}>
          BLUE<span style={{color:"#E8845A"}}>PRINT</span><span style={{color:"#2a2a2a"}}>.MD</span>
        </div>
        <div style={{width:1,height:16,background:"#1a1a1a"}}/>
        <div style={{flex:1}}/>

        {/* Language switcher */}
        <div style={{display:"flex",gap:2}}>
          {SUPPORTED_LANGS.map(l=>(
            <button key={l.code} onClick={()=>switchLang(l.code)}
              style={{padding:"3px 7px",border:`1px solid ${lang===l.code?"#E8845A44":"#1a1a1a"}`,borderRadius:2,background:lang===l.code?"#E8845A0d":"transparent",color:lang===l.code?"#E8845A":"#333",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:1,transition:"all .15s"}}>
              {l.label}
            </button>
          ))}
        </div>

        {!authLoading&&(user?(
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 10px",border:"1px solid rgba(255,255,255,.05)",borderRadius:3}}>
              <KarmaDots level={user.karma}/>
              <span style={{fontSize:10,color:"#444"}}>{user.name}</span>
              <TierBadge tier={user.tier}/>
            </div>
            <button onClick={signOut} className="btn-ghost" style={{padding:"5px 9px",border:"1px solid #1a1a1a",borderRadius:3,color:"#222",fontSize:10,letterSpacing:1}}>{t("headerSignOut")}</button>
          </div>
        ):(
          <button onClick={()=>setShowAuth(true)} className="btn-ghost" style={{padding:"5px 14px",border:"1px solid #333",borderRadius:3,color:"#444",fontSize:10,letterSpacing:1}}>{t("headerSignIn")}</button>
        ))}
        <button onClick={()=>setShowCoffee(true)} className="btn-ghost" style={{padding:"5px 11px",border:"1px solid #1a1a1a",borderRadius:3,color:"#333",fontSize:11,letterSpacing:1}}>☕</button>
        <button onClick={()=>authUser?setShowUpload(true):setShowAuth(true)}
          style={{padding:"5px 14px",borderRadius:3,border:"1px solid #E8845A55",background:"#E8845A0d",color:"#E8845A",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:1,transition:"all .15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="#E8845A1a"}
          onMouseLeave={e=>e.currentTarget.style.background="#E8845A0d"}>
          {t("headerUpload")}
        </button>
      </header>

      <div style={{position:"relative",zIndex:1}}>
        {uploadMsg&&(
          <div style={{background:"#4ADE8011",borderBottom:"1px solid #4ADE8022",padding:"10px 24px",fontSize:11,color:"#4ADE80"}}>
            ✓ {uploadMsg}
          </div>
        )}

        {/* HERO */}
        <div style={{padding:"44px 24px 32px",borderBottom:"1px solid rgba(255,255,255,.04)",maxWidth:800}}>
          <div style={{fontSize:9,color:"#E8845A",letterSpacing:3,marginBottom:10}}>{t("heroTag")}</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,lineHeight:1,color:"#eee",letterSpacing:3,marginBottom:14}}>
            {t("heroHeading1")}<br/>{t("heroHeading2")}
          </div>
          <div style={{fontSize:12,color:"#444",lineHeight:1.9,maxWidth:480}}>
            {t("heroDesc1")}<br/>{t("heroDesc2")}
          </div>
          <div style={{display:"flex",gap:18,marginTop:18}}>
            <div style={{fontSize:10,color:"#2a2a2a"}}>📄 {bpList.length} {t("heroStatBlueprints")}</div>
            <div style={{fontSize:10,color:"#2a2a2a"}}>⚡ {t("heroStatBuilds")}</div>
            <div style={{fontSize:10,color:"#2a2a2a"}}>👥 {t("heroStatContributors")}</div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div style={{padding:"16px 24px",borderBottom:"1px solid rgba(255,255,255,.04)",display:"flex",alignItems:"center",gap:0,flexWrap:"wrap"}}>
          {[
            ["01", t("browseTitle"),     t("browseDesc")],
            ["02", t("buildTitle"),      t("buildDesc")],
            ["03", t("contributeTitle"), t("contributeDesc")],
          ].map(([n,title,desc],i,arr)=>(
            <div key={n} style={{display:"flex",alignItems:"center"}}>
              <div style={{padding:"10px 18px"}}>
                <div style={{fontSize:9,color:"#E8845A33",letterSpacing:1}}>{n}</div>
                <div style={{fontSize:11,color:"#555",letterSpacing:2}}>{title}</div>
                <div style={{fontSize:10,color:"#2a2a2a",marginTop:2,maxWidth:140}}>{desc}</div>
              </div>
              {i<arr.length-1&&<div style={{color:"#1a1a1a",fontSize:12,flexShrink:0}}>→</div>}
            </div>
          ))}
          <div style={{flex:1}}/>
          <div style={{display:"flex",gap:5,flexShrink:0}}>
            {[t("badgeHttps"),t("badgeGdpr"),t("badgeKeys")].map(badge=>(
              <span key={badge} style={{fontSize:9,color:"#1e1e1e",padding:"3px 8px",border:"1px solid #141414",borderRadius:2,letterSpacing:1,whiteSpace:"nowrap"}}>{badge}</span>
            ))}
          </div>
        </div>

        {/* FILTERS */}
        <div style={{padding:"14px 24px",borderBottom:"1px solid rgba(255,255,255,.04)",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("searchPlaceholder")}
            style={{flex:1,minWidth:160,background:"transparent",border:"1px solid rgba(255,255,255,.05)",borderRadius:3,padding:"7px 12px",color:"#888",fontSize:11,outline:"none"}}/>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {CATEGORIES.map(c=>(
              <button key={c} onClick={()=>setCategory(c)} style={{padding:"6px 11px",borderRadius:3,border:`1px solid ${category===c?"#E8845A44":"rgba(255,255,255,.04)"}`,fontSize:10,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",letterSpacing:1,background:category===c?"#E8845A0a":"transparent",color:category===c?"#E8845A":"#333",transition:"all .15s"}}>
                {categoryLabels[c] || c}
              </button>
            ))}
          </div>
          <span style={{fontSize:9,color:"#1e1e1e",marginLeft:"auto"}}>{filtered.length} {t("results")}</span>
        </div>

        {/* GRID */}
        <div style={{padding:"20px 24px",display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(270px, 1fr))",gap:10}}>
          {bpLoading?(
            <div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px 0",color:"#1e1e1e",fontSize:12}}>{t("loading")}</div>
          ):filtered.length>0?(
            filtered.map(bp=><BlueprintCard key={bp.id} bp={bp} onBuild={bp=>setBuildTarget(bp)}/>)
          ):(
            <div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px 0",color:"#1e1e1e",fontSize:12}}>
              {!supabase?(
                <>Add <code style={{background:"#111",padding:"2px 6px",borderRadius:2}}>NEXT_PUBLIC_SUPABASE_URL</code> and <code style={{background:"#111",padding:"2px 6px",borderRadius:2}}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to .env.local</>
              ):(
                <>{t("nothingFound")} <span style={{color:"#E8845A",cursor:"pointer"}} onClick={()=>setShowUpload(true)}>{t("beFirstUpload")}</span></>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{padding:"18px 24px",borderTop:"1px solid rgba(255,255,255,.04)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:3,color:"#1a1a1a"}}>BLUEPRINT.MD</div>
          <div style={{fontSize:9,color:"#1a1a1a",letterSpacing:1}}>{t("footerTagline")}</div>
          <div style={{display:"flex",gap:12}}>
            {[t("footerPrivacy"),t("footerTerms"),t("footerGitHub")].map(l=><span key={l} style={{fontSize:9,color:"#1e1e1e",cursor:"pointer"}}>{l}</span>)}
          </div>
        </div>
      </div>

      {buildTarget&&<BuildModal bp={buildTarget} user={user} onClose={()=>setBuildTarget(null)}/>}
      {showUpload&&<UploadModal onClose={()=>setShowUpload(false)} onSubmit={handleUpload}/>}
      {showCoffee&&<CoffeeModal onClose={()=>setShowCoffee(false)}/>}
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)}/>}
    </div>
  );
}
