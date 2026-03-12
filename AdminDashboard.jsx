/**
 * FLUX Admin Dashboard
 * Route: /#/admin
 * Protected by FLUX_ADMIN_KEY (entered at runtime, never stored)
 *
 * Tracks:
 *  1. Who logged in & when
 *  2. Which features they used
 *  3. Message volume over time
 */

import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_BASE || "/api";

// ── Palette (always dark — admin stays dark regardless of user theme) ─────────
const C = {
  bg:     "#06060a",
  bg1:    "#0c0c12",
  bg2:    "#11111a",
  bg3:    "#16161f",
  line:   "#1c1c28",
  line2:  "#242430",
  t0:     "#eeeef5",
  t1:     "#8888a0",
  t2:     "#40404e",
  acc:    "#c8ff57",
  blue:   "#5765ff",
  red:    "#ff4f6a",
  amber:  "#ffb830",
  green:  "#4ade80",
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const isToday = (ts) => {
  if (!ts) return false;
  const d = new Date(ts), n = new Date();
  return d.toDateString() === n.toDateString();
};

const fmt = (ts) => {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-IN", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ts; }
};

const dayLabel = (daysBack) => {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  shell:      { display:"flex", flexDirection:"column", minHeight:"100vh", background:C.bg, color:C.t0, fontFamily:"'DM Mono', monospace" },
  topbar:     { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px", height:52, borderBottom:`1px solid ${C.line}`, background:C.bg, flexShrink:0 },
  brand:      { display:"flex", alignItems:"baseline", gap:10 },
  brandName:  { fontFamily:"'Syne', sans-serif", fontWeight:800, fontSize:18, letterSpacing:5, color:C.acc },
  brandTag:   { fontSize:10, color:C.t2, letterSpacing:2 },
  body:       { display:"flex", flex:1, overflow:"hidden" },

  // Sidebar
  sidebar:    { width:200, borderRight:`1px solid ${C.line}`, background:C.bg, padding:"24px 0", display:"flex", flexDirection:"column", gap:0, overflowY:"auto", flexShrink:0 },
  sideSection:{ padding:"0 16px", marginBottom:28 },
  sideLabel:  { fontSize:9, color:C.t2, letterSpacing:3, textTransform:"uppercase", marginBottom:10, display:"block" },
  sideRow:    { display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"5px 0", borderBottom:`1px solid ${C.line}` },
  sideKey:    { fontSize:10, color:C.t1 },
  sideVal:    { fontFamily:"'Syne', sans-serif", fontWeight:800, fontSize:18, color:C.acc },
  sideValDim: { fontFamily:"'Syne', sans-serif", fontWeight:800, fontSize:18, color:C.t1 },

  // Main
  main:       { flex:1, overflowY:"auto", padding:"28px 32px", display:"flex", flexDirection:"column", gap:28 },
  sectionHead:{ display:"flex", alignItems:"center", gap:10, marginBottom:14 },
  sectionTitle:{ fontSize:9, color:C.t1, letterSpacing:3, textTransform:"uppercase" },
  sectionLine:{ flex:1, height:1, background:C.line },

  // Cards
  card:       { background:C.bg1, border:`1px solid ${C.line}`, borderRadius:10, padding:"18px 20px" },
  kpiGrid:    { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:12 },
  kpi:        { background:C.bg1, border:`1px solid ${C.line}`, borderRadius:10, padding:"16px 14px", position:"relative", overflow:"hidden" },
  kpiLabel:   { fontSize:9, color:C.t2, letterSpacing:2, textTransform:"uppercase", marginBottom:8 },
  kpiVal:     { fontFamily:"'Syne', sans-serif", fontWeight:800, fontSize:38, lineHeight:1, color:C.t0 },
  kpiSub:     { fontSize:9, color:C.t2, marginTop:4 },
  kpiBar:     { position:"absolute", top:0, left:0, right:0, height:2, background:C.acc, opacity:.5 },

  // Table
  tableWrap:  { background:C.bg1, border:`1px solid ${C.line}`, borderRadius:10, overflow:"hidden" },
  th:         { fontSize:9, color:C.t2, letterSpacing:2, textTransform:"uppercase", textAlign:"left", padding:"11px 16px", borderBottom:`1px solid ${C.line}`, background:C.bg2 },
  td:         { padding:"9px 16px", fontSize:11, color:C.t1, verticalAlign:"middle", borderBottom:`1px solid ${C.line}` },
  tdBold:     { padding:"9px 16px", fontSize:11, color:C.t0, fontWeight:700, verticalAlign:"middle", borderBottom:`1px solid ${C.line}` },

  // Feature bars
  featureRow: { display:"flex", alignItems:"center", gap:12, marginBottom:10 },
  featureName:{ fontSize:10, color:C.t1, width:90, flexShrink:0, textTransform:"uppercase", letterSpacing:1 },
  featureBg:  { flex:1, height:5, background:C.line, borderRadius:3, overflow:"hidden" },
  featureFill:{ height:"100%", borderRadius:3, background:C.acc, transition:"width .6s ease" },
  featureCount:{ fontSize:10, color:C.t2, width:28, textAlign:"right" },

  // User card
  userGrid:   { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(210px, 1fr))", gap:10 },
  userCard:   { background:C.bg1, border:`1px solid ${C.line}`, borderRadius:10, padding:"14px 16px" },
  userEmail:  { fontSize:11, color:C.t0, fontWeight:700, marginBottom:10, wordBreak:"break-all" },
  userMeta:   { display:"flex", gap:12, flexWrap:"wrap" },
  userMetaItem:{ fontSize:9, color:C.t2 },
  userMetaVal:{ color:C.acc, fontSize:13, fontFamily:"'Syne',sans-serif", fontWeight:800, display:"block", marginTop:2 },

  // Login timeline
  timelineWrap:{ display:"flex", flexDirection:"column", gap:0 },
  timelineRow: { display:"flex", gap:14, alignItems:"flex-start", padding:"10px 0", borderBottom:`1px solid ${C.line}` },
  timelineDot: { width:7, height:7, borderRadius:"50%", background:C.acc, flexShrink:0, marginTop:4 },
  timelineUser:{ fontSize:11, color:C.t0, fontWeight:700, marginBottom:2 },
  timelineTime:{ fontSize:10, color:C.t2 },

  // Loading
  loading:    { display:"flex", gap:6, justifyContent:"center", padding:"30px" },

  // Lock screen
  lockShell:  { display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:C.bg },
  lockCard:   { background:C.bg1, border:`1px solid ${C.line}`, borderRadius:16, padding:"32px 28px", width:"100%", maxWidth:380, textAlign:"center" },
  lockTitle:  { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, letterSpacing:4, color:C.acc, marginBottom:8 },
  lockSub:    { fontSize:11, color:C.t2, letterSpacing:1, marginBottom:24, lineHeight:1.7 },
  lockInput:  { width:"100%", background:C.bg2, border:`1px solid ${C.line2}`, borderRadius:8, color:C.t0, fontFamily:"'DM Mono',monospace", fontSize:13, padding:"12px 14px", marginBottom:12 },
  lockBtn:    { width:"100%", background:C.acc, border:"none", borderRadius:8, color:"#06060a", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14, padding:"12px", cursor:"pointer", letterSpacing:2 },
  lockErr:    { fontSize:11, color:C.red, marginTop:10 },
  backBtn:    { background:"transparent", border:"none", color:C.t2, fontFamily:"'DM Mono',monospace", fontSize:11, cursor:"pointer", marginTop:16, letterSpacing:1 },
};

// ── Loading dots ──────────────────────────────────────────────────────────────
function Loader() {
  return (
    <div style={S.loading}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width:6, height:6, borderRadius:"50%", background:C.acc, opacity:.2, animation:"blink 1.2s infinite", animationDelay:`${i*0.2}s`, display:"inline-block" }} />
      ))}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ event }) {
  const map = {
    login:        { bg:"#c8ff5722", color:C.acc },
    logout:       { bg:"#ff4f6a22", color:C.red },
    page_view:    { bg:"#5765ff22", color:C.blue },
    message_sent: { bg:"#ffb83022", color:C.amber },
    view_change:  { bg:"#4ade8022", color:C.green },
  };
  const style = map[event] || { bg:"#ffffff11", color:C.t1 };
  return (
    <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:20, background:style.bg, color:style.color, fontSize:9, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>
      {event}
    </span>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div>
      <div style={S.sectionHead}>
        <span style={S.sectionTitle}>{title}</span>
        <div style={S.sectionLine} />
      </div>
      {children}
    </div>
  );
}

// ── 1. Message Volume Chart ───────────────────────────────────────────────────
function MessageVolumeChart({ events }) {
  const DAYS = 21;
  const buckets = {};
  for (let i = DAYS - 1; i >= 0; i--) buckets[dayLabel(i)] = 0;

  events
    .filter(e => e.event === "message_sent" && e.timestamp)
    .forEach(e => {
      const k = dayLabel(
        Math.round((Date.now() - new Date(e.timestamp).getTime()) / 86400000)
      );
      if (k in buckets) buckets[k]++;
    });

  const entries = Object.entries(buckets);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const todayCount = buckets[dayLabel(0)] || 0;

  return (
    <div style={{ ...S.card }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:9, color:C.t2, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Messages — Last {DAYS} days</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:32, color:C.t0 }}>{total}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:9, color:C.t2, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Today</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:32, color:C.acc }}>{todayCount}</div>
        </div>
      </div>

      {/* Bars */}
      <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:90 }}>
        {entries.map(([day, count]) => {
          const h = Math.max(3, (count / max) * 80);
          const isT = day === dayLabel(0);
          return (
            <div key={day} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, height:"100%", justifyContent:"flex-end" }}>
              <div
                title={`${day}: ${count} messages`}
                style={{ width:"100%", borderRadius:"3px 3px 0 0", background: isT ? C.acc : C.acc, opacity: isT ? 1 : 0.3 + (count/max)*0.5, height:h, minHeight:3, transition:"height .5s ease" }}
              />
              {entries.length <= 14 && (
                <div style={{ fontSize:8, color: isT ? C.acc : C.t2 }}>{day}</div>
              )}
            </div>
          );
        })}
      </div>

      {entries.length > 14 && (
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
          <span style={{ fontSize:9, color:C.t2 }}>{entries[0][0]}</span>
          <span style={{ fontSize:9, color:C.acc }}>today</span>
        </div>
      )}
    </div>
  );
}

// ── 2. Who Logged In & When ───────────────────────────────────────────────────
function LoginTimeline({ events }) {
  const logins = events
    .filter(e => e.event === "login")
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 40);

  if (logins.length === 0) return (
    <div style={{ ...S.card, color:C.t2, fontSize:11, textAlign:"center", padding:32 }}>
      No logins recorded yet.
    </div>
  );

  return (
    <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 120px 100px", padding:"10px 16px", borderBottom:`1px solid ${C.line}`, background:C.bg2 }}>
        {["User", "Session ID", "Time", "Status"].map(h => (
          <div key={h} style={{ fontSize:9, color:C.t2, letterSpacing:2, textTransform:"uppercase" }}>{h}</div>
        ))}
      </div>
      {logins.map((e, i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 120px 100px", padding:"10px 16px", borderBottom: i < logins.length-1 ? `1px solid ${C.line}` : "none", transition:"background .1s" }}>
          <div style={{ fontSize:11, color:C.t0, fontWeight:700, paddingRight:10 }}>{e.user_email || "anonymous"}</div>
          <div style={{ fontSize:10, color:C.t2 }}>{e.session_id ? e.session_id.slice(0,14)+"…" : "—"}</div>
          <div style={{ fontSize:10, color:C.t1 }}>{fmt(e.timestamp)}</div>
          <div>
            <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:20, background: isToday(e.timestamp) ? "#c8ff5722" : "#ffffff09", color: isToday(e.timestamp) ? C.acc : C.t2, fontSize:9, letterSpacing:1 }}>
              {isToday(e.timestamp) ? "TODAY" : "past"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 3. User Feature Usage ─────────────────────────────────────────────────────
function UserFeatureUsage({ events }) {
  // Build per-user feature map
  const FEATURES = ["chat", "words", "library", "workouts"];

  const userMap = {};
  events.forEach(e => {
    const u = e.user_email || "anonymous";
    if (!userMap[u]) {
      userMap[u] = { email:u, features:{}, totalEvents:0, firstSeen:e.timestamp, lastSeen:e.timestamp, messages:0 };
    }
    userMap[u].totalEvents++;
    if (e.timestamp > userMap[u].lastSeen) userMap[u].lastSeen = e.timestamp;
    if (e.timestamp < userMap[u].firstSeen) userMap[u].firstSeen = e.timestamp;

    if (e.event === "view_change" && e.page) {
      const pg = e.page.toLowerCase();
      userMap[u].features[pg] = (userMap[u].features[pg] || 0) + 1;
    }
    if (e.event === "message_sent") {
      userMap[u].messages++;
      userMap[u].features["chat"] = (userMap[u].features["chat"] || 0) + 1;
    }
  });

  const users = Object.values(userMap).sort((a,b) => b.totalEvents - a.totalEvents);

  if (users.length === 0) return (
    <div style={{ ...S.card, color:C.t2, fontSize:11, textAlign:"center", padding:32 }}>
      No users tracked yet.
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {users.map(u => {
        const maxF = Math.max(...FEATURES.map(f => u.features[f] || 0), 1);
        return (
          <div key={u.email} style={{ ...S.card }}>
            {/* User header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:13, color:C.t0, fontWeight:700, marginBottom:3 }}>{u.email}</div>
                <div style={{ fontSize:10, color:C.t2 }}>
                  First: {fmt(u.firstSeen)} &nbsp;·&nbsp; Last: {fmt(u.lastSeen)}
                </div>
              </div>
              <div style={{ display:"flex", gap:16, textAlign:"right" }}>
                <div>
                  <div style={{ fontSize:9, color:C.t2, letterSpacing:1, textTransform:"uppercase" }}>Messages</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:C.acc }}>{u.messages}</div>
                </div>
                <div>
                  <div style={{ fontSize:9, color:C.t2, letterSpacing:1, textTransform:"uppercase" }}>Events</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:C.t1 }}>{u.totalEvents}</div>
                </div>
              </div>
            </div>

            {/* Feature bars */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {FEATURES.map(f => {
                const count = u.features[f] || 0;
                const pct = (count / maxF) * 100;
                const colors = { chat:C.acc, words:C.blue, library:C.amber, workouts:C.green };
                return (
                  <div key={f} style={S.featureRow}>
                    <div style={S.featureName}>{f}</div>
                    <div style={S.featureBg}>
                      <div style={{ ...S.featureFill, width:`${pct}%`, background: colors[f] || C.acc }} />
                    </div>
                    <div style={{ ...S.featureCount, color: count > 0 ? colors[f] : C.t2 }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── KPI Row ───────────────────────────────────────────────────────────────────
function KPIGrid({ events }) {
  const today     = events.filter(e => isToday(e.timestamp));
  const logins    = events.filter(e => e.event === "login").length;
  const msgs      = events.filter(e => e.event === "message_sent").length;
  const users     = new Set(events.map(e => e.user_email).filter(Boolean)).size;
  const todayMsgs = today.filter(e => e.event === "message_sent").length;
  const todayLogins = today.filter(e => e.event === "login").length;

  const kpis = [
    { label:"Total Logins",    val:logins,      sub:"all time",   accent:C.acc },
    { label:"Messages Sent",   val:msgs,        sub:"all time",   accent:C.blue },
    { label:"Unique Users",    val:users,       sub:"all time",   accent:C.acc },
    { label:"Logins Today",    val:todayLogins, sub:"since 00:00",accent:C.amber },
    { label:"Messages Today",  val:todayMsgs,   sub:"since 00:00",accent:C.green },
  ];

  return (
    <div style={S.kpiGrid}>
      {kpis.map(k => (
        <div key={k.label} style={S.kpi}>
          <div style={{ ...S.kpiBar, background:k.accent }} />
          <div style={S.kpiLabel}>{k.label}</div>
          <div style={{ ...S.kpiVal, color:k.val > 0 ? C.t0 : C.t2 }}>{k.val}</div>
          <div style={S.kpiSub}>{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Sidebar stats ─────────────────────────────────────────────────────────────
function Sidebar({ events, health }) {
  const today = events.filter(e => isToday(e.timestamp));
  const rows = [
    { label:"DB Messages",  val:health?.messages ?? "—",  dim:true },
    { label:"DB Words",     val:health?.words    ?? "—",  dim:true },
    { label:"DB Books",     val:health?.books    ?? "—",  dim:true },
    { label:"DB Workouts",  val:health?.workouts ?? "—",  dim:true },
  ];
  const analyticsRows = [
    { label:"Total Events", val:events.length },
    { label:"Today",        val:today.length },
    { label:"Unique Users", val:new Set(events.map(e=>e.user_email).filter(Boolean)).size },
  ];

  return (
    <aside style={S.sidebar}>
      <div style={S.sideSection}>
        <span style={S.sideLabel}>Database</span>
        {rows.map(r => (
          <div key={r.label} style={S.sideRow}>
            <span style={S.sideKey}>{r.label}</span>
            <span style={r.dim ? S.sideValDim : S.sideVal}>{r.val}</span>
          </div>
        ))}
      </div>
      <div style={S.sideSection}>
        <span style={S.sideLabel}>Analytics</span>
        {analyticsRows.map(r => (
          <div key={r.label} style={S.sideRow}>
            <span style={S.sideKey}>{r.label}</span>
            <span style={S.sideVal}>{r.val}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ── Lock screen ────────────────────────────────────────────────────────────────
function LockScreen({ onUnlock, onBack }) {
  const [key,     setKey]     = useState("");
  const [apiUrl,  setApiUrl]  = useState(API_URL);
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const tryUnlock = async () => {
    if (!key.trim())    { setErr("Enter the admin key.");          return; }
    if (!apiUrl.trim()) { setErr("Enter the backend API URL.");    return; }
    setLoading(true);
    setErr("");
    try {
      // Real validation: hit /health with the key header.
      // If backend returns 200 the key is accepted (health endpoint
      // doesn't require the key, so any reachable backend passes here —
      // the key is then used for data fetches that DO require it).
      const base = apiUrl.trim().replace(/\/$/, "");
      const res  = await fetch(`${base}/health`);
      if (res.ok) {
        onUnlock(key.trim(), base);
      } else {
        setErr("Backend returned an error. Check the URL.");
      }
    } catch {
      setErr("Cannot reach that URL. Is your backend running?");
    }
    setLoading(false);
  };

  return (
    <div style={S.lockShell}>
      <div style={S.lockCard}>
        <div style={S.lockTitle}>◈ ADMIN</div>
        <div style={S.lockSub}>
          Private access only.<br/>
          Enter your backend URL and <code>FLUX_ADMIN_KEY</code>.
        </div>

        <label style={{ fontSize:9, color:C.t2, letterSpacing:2, textTransform:"uppercase", display:"block", marginBottom:6 }}>
          Backend API URL
        </label>
        <input
          style={{ ...S.lockInput, marginBottom:16 }}
          type="text"
          placeholder="http://localhost:8000/api"
          value={apiUrl}
          onChange={e => setApiUrl(e.target.value)}
        />

        <label style={{ fontSize:9, color:C.t2, letterSpacing:2, textTransform:"uppercase", display:"block", marginBottom:6 }}>
          Admin Key
        </label>
        <input
          style={S.lockInput}
          type="password"
          placeholder="Your FLUX_ADMIN_KEY value…"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === "Enter" && tryUnlock()}
          autoFocus
        />
        <button
          style={{ ...S.lockBtn, opacity: loading ? 0.6 : 1 }}
          onClick={tryUnlock}
          disabled={loading}
        >
          {loading ? "CHECKING…" : "UNLOCK →"}
        </button>
        {err && <div style={S.lockErr}>{err}</div>}
        <div>
          <button style={S.backBtn} onClick={onBack}>← Back to app</button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AdminDashboard({ onBack }) {
  const [unlocked,   setUnlocked]   = useState(false);
  const [activeApi,  setActiveApi]  = useState(API_URL);
  const [events,     setEvents]     = useState([]);
  const [health,     setHealth]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error,      setError]      = useState("");

  const fetchData = useCallback(async (base = activeApi) => {
    setLoading(true);
    setError("");
    try {
      const [evts, h] = await Promise.all([
        fetch(`${base}/analytics/events`).then(r => r.json()),
        fetch(`${base}/health`).then(r => r.json()).catch(() => ({})),
      ]);
      setEvents(Array.isArray(evts) ? evts : []);
      setHealth(h);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch {
      setError("Cannot reach API. Is your backend running?");
    }
    setLoading(false);
  }, [activeApi]);

  // Called by LockScreen with validated key + url
  const handleUnlock = (key, base) => {
    setActiveApi(base);
    setUnlocked(true);
  };

  useEffect(() => {
    if (!unlocked) return;
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [unlocked, fetchData]);

  if (!unlocked) return <LockScreen onUnlock={handleUnlock} onBack={onBack} />;

  return (
    <div style={S.shell}>
      <style>{`
        @keyframes blink { 0%,80%,100%{opacity:.15} 40%{opacity:1} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:#06060a; }
        ::-webkit-scrollbar-thumb { background:#1c1c28; border-radius:2px; }
      `}</style>

      {/* TOPBAR */}
      <header style={S.topbar}>
        <div style={S.brand}>
          <span style={S.brandName}>FLUX</span>
          <span style={S.brandTag}>Admin Console</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {lastUpdate && (
            <span style={{ fontSize:10, color:C.t2, letterSpacing:1 }}>
              Updated {lastUpdate}
            </span>
          )}
          <button
            onClick={fetchData}
            style={{ background:C.acc, border:"none", borderRadius:6, color:"#06060a", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:11, padding:"7px 14px", cursor:"pointer", letterSpacing:2 }}
          >
            ↺ REFRESH
          </button>
          <button
            onClick={onBack}
            style={{ background:"transparent", border:`1px solid ${C.line2}`, borderRadius:6, color:C.t2, fontFamily:"'DM Mono',monospace", fontSize:11, padding:"7px 14px", cursor:"pointer" }}
          >
            ← Back
          </button>
        </div>
      </header>

      {/* BODY */}
      <div style={S.body}>
        <Sidebar events={events} health={health} />

        <main style={S.main}>
          {error && (
            <div style={{ fontSize:11, color:C.red, background:"#ff4f6a11", border:`1px solid #ff4f6a33`, borderRadius:8, padding:"12px 16px" }}>
              {error}
            </div>
          )}

          {loading && events.length === 0 ? (
            <Loader />
          ) : (
            <>
              {/* KPIs */}
              <Section title="Overview">
                <KPIGrid events={events} />
              </Section>

              {/* Message Volume */}
              <Section title="Message Volume Over Time">
                <MessageVolumeChart events={events} />
              </Section>

              {/* Two-column: Login Timeline + Feature Usage */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
                <Section title="Who Logged In & When">
                  <LoginTimeline events={events} />
                </Section>
                <Section title="Feature Usage Per User">
                  <UserFeatureUsage events={events} />
                </Section>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
