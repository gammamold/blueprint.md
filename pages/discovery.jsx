import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth";


const STARTER_PROMPTS = [
  "I'm a music producer looking to analyze my mixes",
  "I want to build a synthesizer plugin but don't know where to start",
  "I'm a developer and need a productivity app",
  "I make beats and want something to process drums",
];

// Call the server-side discover proxy
async function callClaude(messages) {
  const res = await fetch("/api/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return { reply: data.reply, library: data.library };
}

function parseBlueprints(text) {
  const match = text.match(/<blueprints>([\s\S]*?)<\/blueprints>/);
  if (!match) return [];
  try { return JSON.parse(match[1]); } catch { return []; }
}

function parseComposite(text) {
  const match = text.match(/<composite>([\s\S]*?)<\/composite>/);
  return match ? match[1].trim() : null;
}

function cleanText(text) {
  return text
    .replace(/<blueprints>[\s\S]*?<\/blueprints>/g, "")
    .replace(/<composite>[\s\S]*?<\/composite>/g, "")
    .trim();
}

function ThinkingIndicator() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"12px 14px",background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.05)",borderRadius:4,width:"fit-content"}}>
      <div style={{fontSize:10,color:"#333",letterSpacing:1,marginRight:4}}>Claude is thinking</div>
      {[0,1,2].map(i=><div key={i} className="thinking-dot" style={{animationDelay:`${i*.2}s`}}/>)}
    </div>
  );
}

function BlueprintMatch({ bp, reason, onBuild }) {
  if (!bp) return null;
  return (
    <div className="bp-card" onClick={()=>onBuild(bp)}
      style={{background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.06)",borderRadius:4,padding:"12px 14px",display:"flex",flexDirection:"column",gap:6}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:"#eee",letterSpacing:.5}}>{bp.title}</div>
        <span style={{fontSize:9,padding:"2px 7px",border:"1px solid rgba(255,255,255,.07)",borderRadius:2,color:"#444",letterSpacing:1.5,flexShrink:0,marginLeft:8}}>{bp.category}</span>
      </div>
      <div style={{fontSize:11,color:"#555",lineHeight:1.5}}>{bp.description}</div>
      <div style={{fontSize:10,color:"#E8845A55",borderLeft:"1px solid #E8845A22",paddingLeft:8,lineHeight:1.5}}>→ {reason}</div>
      <div style={{fontSize:9,color:"#333",marginTop:2}}>Click to build this blueprint →</div>
    </div>
  );
}

function CompositeBlueprint({ content, onBuild, onSave, saving }) {
  const [expanded, setExpanded] = useState(false);
  const title = content.split("\n")[0].replace(/^#+\s*/, "");
  return (
    <div style={{background:"rgba(232,132,90,.03)",border:"1px solid #E8845A22",borderRadius:4,overflow:"hidden"}}>
      <div style={{padding:"12px 14px",borderBottom:expanded?"1px solid #E8845A11":"none"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{fontSize:9,color:"#E8845A",letterSpacing:2}}>COMPOSITE BLUEPRINT GENERATED</div>
          <button onClick={()=>setExpanded(!expanded)} style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:10,fontFamily:"'Share Tech Mono',monospace"}}>
            {expanded?"HIDE ↑":"PREVIEW ↓"}
          </button>
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,color:"#eee",letterSpacing:.5}}>{title}</div>
      </div>
      {expanded && (
        <pre style={{padding:"12px 14px",fontSize:10,color:"#555",lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:220,overflowY:"auto"}}>
          {content}
        </pre>
      )}
      <div style={{padding:"10px 14px",borderTop:"1px solid #E8845A11",display:"flex",gap:8}}>
        <button onClick={()=>onBuild({title, content, category:"Other", id:"composite"})}
          style={{flex:1,padding:"9px",border:"none",borderRadius:3,background:"#E8845A",color:"#fff",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:2}}>
          BUILD THIS →
        </button>
        <button onClick={()=>onSave(content)} disabled={saving}
          style={{padding:"9px 14px",border:"1px solid #E8845A44",borderRadius:3,background:"transparent",color:saving?"#333":"#E8845A",cursor:saving?"not-allowed":"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:1}}>
          {saving?"SAVING...":"SAVE TO LIBRARY"}
        </button>
      </div>
    </div>
  );
}

function Message({ msg, library, onBuild, onSave, saving }) {
  const matches = parseBlueprints(msg.content);
  const composite = parseComposite(msg.content);
  const text = cleanText(msg.content);
  const isUser = msg.role === "user";

  // Resolve blueprint IDs against the live library
  const resolvedMatches = matches.map(m => ({
    bp: library.find(b => b.id === m.id),
    reason: m.reason,
  })).filter(m => m.bp);

  return (
    <div className="msg" style={{display:"flex",flexDirection:"column",alignItems:isUser?"flex-end":"flex-start",gap:8}}>
      {!isUser && <div style={{fontSize:9,color:"#2a2a2a",letterSpacing:1,marginLeft:2}}>CLAUDE</div>}
      {text && (
        <div style={{maxWidth:"80%",padding:"11px 14px",borderRadius:4,background:isUser?"#E8845A12":"rgba(255,255,255,.02)",border:`1px solid ${isUser?"#E8845A22":"rgba(255,255,255,.05)"}`,fontSize:12,color:isUser?"#E8845A":"#888",lineHeight:1.7,textAlign:isUser?"right":"left"}}>
          {text}
        </div>
      )}
      {resolvedMatches.length > 0 && (
        <div style={{width:"100%",maxWidth:440,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:9,color:"#333",letterSpacing:2,marginLeft:2}}>MATCHED BLUEPRINTS</div>
          {resolvedMatches.map((m,i)=><BlueprintMatch key={i} bp={m.bp} reason={m.reason} onBuild={onBuild}/>)}
        </div>
      )}
      {composite && (
        <div style={{width:"100%",maxWidth:440}}>
          <CompositeBlueprint content={composite} onBuild={onBuild} onSave={onSave} saving={saving}/>
        </div>
      )}
    </div>
  );
}

export default function Discovery() {
  const { user: authUser, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [started, setStarted] = useState(false);
  const [buildTarget, setBuildTarget] = useState(null);
  const [library, setLibrary] = useState([]);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text) => {
    const content = text || input.trim();
    if (!content || thinking) return;
    setInput(""); setStarted(true);

    const userMsg = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setThinking(true);

    try {
      const { reply, library: freshLibrary } = await callClaude(
        newMessages.map(m => ({ role: m.role, content: m.content }))
      );
      // Update library from server response so blueprint lookups stay fresh
      if (freshLibrary?.length > 0) setLibrary(freshLibrary);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    }
    setThinking(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleBuildTarget = (bp) => {
    setBuildTarget(bp);
  };

  const handleSaveComposite = async (content) => {
    if (!authUser) {
      alert("Sign in to save blueprints to the library.");
      return;
    }
    setSaving(true);
    try {
      const title = content.split("\n")[0].replace(/^#+\s*/, "") || "Composite Blueprint";
      const { blueprints: bpHelpers } = await import("@/lib/supabase");
      await bpHelpers.create({
        title,
        description: "AI-generated composite blueprint from guided discovery.",
        content,
        category: "Other",
        tags: [],
        tech_stack: [],
        completeness: 70,
        authorId: authUser.id,
      });
      alert("Blueprint saved! It will appear in the marketplace after review.");
    } catch (e) {
      console.error(e);
      alert("Save failed: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",position:"relative"}}>
      <div className="gridbg"/>

      {/* HEADER */}
      <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,8,.96)",backdropFilter:"blur(8px)",borderBottom:"1px solid rgba(255,255,255,.05)",padding:"0 24px",display:"flex",alignItems:"center",height:50,gap:14,flexShrink:0}}>
        <a href="/" style={{textDecoration:"none"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:3,color:"#eee"}}>
            BLUE<span style={{color:"#E8845A"}}>PRINT</span><span style={{color:"#222"}}>.MD</span>
          </div>
        </a>
        <div style={{width:1,height:16,background:"#1a1a1a"}}/>
        <div style={{fontSize:9,color:"#333",letterSpacing:2}}>GUIDED DISCOVERY</div>
        <div style={{flex:1}}/>
        <a href="/" style={{textDecoration:"none",fontSize:9,color:"#2a2a2a",letterSpacing:1,cursor:"pointer"}}
          onMouseEnter={e=>e.target.style.color="#E8845A"}
          onMouseLeave={e=>e.target.style.color="#2a2a2a"}>
          ← BACK TO MARKETPLACE
        </a>
      </header>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:1,maxWidth:680,width:"100%",margin:"0 auto",padding:"0 20px"}}>
        {!started && (
          <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",paddingBottom:120}}>
            <div style={{marginBottom:32}}>
              <div style={{fontSize:9,color:"#E8845A",letterSpacing:3,marginBottom:10}}>AI-GUIDED BLUEPRINT SEARCH</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,lineHeight:1,color:"#eee",letterSpacing:2,marginBottom:12}}>
                TELL ME WHAT<br/>YOU WANT TO BUILD
              </div>
              <div style={{fontSize:12,color:"#444",lineHeight:1.8}}>
                Not sure what blueprint you need? Just describe what you're trying to accomplish. Claude will search the library, find the best match — or combine multiple blueprints into something new.
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:9,color:"#2a2a2a",letterSpacing:2,marginBottom:4}}>TRY ASKING</div>
              {STARTER_PROMPTS.map(p=>(
                <button key={p} onClick={()=>send(p)}
                  style={{padding:"10px 14px",border:"1px solid rgba(255,255,255,.05)",borderRadius:3,background:"transparent",color:"#444",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:11,textAlign:"left",transition:"all .15s",letterSpacing:.5}}
                  onMouseEnter={e=>{e.currentTarget.style.color="#E8845A";e.currentTarget.style.borderColor="#E8845A22"}}
                  onMouseLeave={e=>{e.currentTarget.style.color="#444";e.currentTarget.style.borderColor="rgba(255,255,255,.05)"}}>
                  → {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {started && (
          <div style={{flex:1,paddingTop:24,paddingBottom:120,display:"flex",flexDirection:"column",gap:16,overflowY:"auto"}}>
            {messages.map((msg, i) => (
              <Message key={i} msg={msg} library={library} onBuild={handleBuildTarget} onSave={handleSaveComposite} saving={saving}/>
            ))}
            {thinking && <ThinkingIndicator/>}
            <div ref={bottomRef}/>
          </div>
        )}
      </div>

      {/* INPUT BAR */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:"rgba(8,8,8,.97)",backdropFilter:"blur(12px)",borderTop:"1px solid rgba(255,255,255,.05)",padding:"16px 24px"}}>
        <div style={{maxWidth:680,margin:"0 auto",display:"flex",gap:10,alignItems:"flex-end"}}>
          <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Describe what you want to build, your profession, or what problem you're trying to solve..."
            rows={1} style={{flex:1,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:4,padding:"11px 14px",color:"#aaa",fontSize:12,outline:"none",resize:"none",lineHeight:1.5,maxHeight:100,overflowY:"auto"}}
            onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,100)+"px"}}
          />
          <button onClick={()=>send()} disabled={!input.trim()||thinking}
            style={{padding:"11px 20px",borderRadius:4,border:"none",background:input.trim()&&!thinking?"#E8845A":"#141414",color:input.trim()&&!thinking?"#fff":"#2a2a2a",cursor:input.trim()&&!thinking?"pointer":"not-allowed",fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:2,transition:"all .2s",flexShrink:0}}>
            SEND
          </button>
        </div>
        <div style={{maxWidth:680,margin:"6px auto 0",fontSize:9,color:"#1a1a1a",textAlign:"center"}}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>

      {/* Build confirmation overlay */}
      {buildTarget && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
          <div style={{background:"#0b0b0b",border:"1px solid #1e1e1e",borderRadius:5,width:"100%",maxWidth:400,padding:28,textAlign:"center"}}>
            <div style={{fontSize:9,color:"#E8845A",letterSpacing:2,marginBottom:8}}>READY TO BUILD</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#eee",letterSpacing:1,marginBottom:8}}>{buildTarget.title}</div>
            <div style={{fontSize:11,color:"#444",marginBottom:24,lineHeight:1.6}}>
              This will open the full build flow where you can choose your LLM and access mode.
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setBuildTarget(null)} style={{flex:1,padding:"10px",border:"1px solid #141414",borderRadius:3,background:"transparent",color:"#444",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:11}}>Cancel</button>
              <a href={`/?build=${buildTarget.id}`} style={{flex:2,textDecoration:"none"}}>
                <button style={{width:"100%",padding:"10px",border:"none",borderRadius:3,background:"#E8845A",color:"#fff",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:2}}>BUILD →</button>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
