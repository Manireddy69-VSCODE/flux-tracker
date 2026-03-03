import { useState, useEffect, useRef, useCallback } from "react";

// ─── Storage ────────────────────────────────────────────────────────────────
const SK = "hobby-ai-v2";
const blank = { messages: [], words: [], quotes: [], books: [], workouts: [] };

async function load() {
  try {
    const raw = localStorage.getItem(SK);
    return raw ? JSON.parse(raw) : blank;
  }
  catch { return blank; }
}
async function save(d) {
  try { localStorage.setItem(SK, JSON.stringify(d)); } catch {}
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const ts  = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const todayStr = () => new Date().toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });

const WORKOUT_TYPES = ["gym","run","walk","cycle","swim","yoga","hiit","climb","boxing","other"];
const WORKOUT_EMOJI = { gym:"🏋️",run:"🏃",walk:"🚶",cycle:"🚴",swim:"🏊",yoga:"🧘",hiit:"⚡",climb:"🧗",boxing:"🥊",other:"💪" };

// ─── AI Call ────────────────────────────────────────────────────────────────
async function callAI(systemPrompt, userMsg) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "PASTE_YOUR_REAL_KEY_HERE" || apiKey === "sk-ant-your-key-here") {
    return JSON.stringify(mockAiResponse(userMsg));
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-calls": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "";
}

function mockAiResponse(userMsg) {
  const text = userMsg.trim();
  const low = text.toLowerCase();
  const quoteMatch = text.match(/"([^"]+)"/);
  const wordMatch = low.match(/(?:meaning of|define|what does)\s+([a-z-]+)/i) || low.match(/^([a-z-]{3,})$/i);
  const workoutType = WORKOUT_TYPES.find((t) => low.includes(t));
  const dist = text.match(/(\d+(?:\.\d+)?)\s*km/i);
  const dur = text.match(/(\d+)\s*(min|minutes|hour|hours)/i);
  const bookHint = /(reading|finished|book|novel|started)/i.test(low);

  if (wordMatch) {
    const w = wordMatch[1];
    return {
      intent: "WORD_LOOKUP",
      reply: `Learning mode: saved "${w}" as a word lookup.`,
      data: {
        word: w,
        definition: "Mock definition (add Anthropic key for real definitions).",
        example: `Example sentence using ${w}.`,
        partOfSpeech: "noun",
      },
    };
  }

  if (quoteMatch || low.includes("quote")) {
    return {
      intent: "QUOTE",
      reply: "Learning mode: quote saved to your library.",
      data: {
        text: quoteMatch ? quoteMatch[1] : text,
      },
    };
  }

  if (workoutType || dist || dur) {
    const duration = dur ? (dur[2].startsWith("hour") ? Number(dur[1]) * 60 : Number(dur[1])) : null;
    return {
      intent: "WORKOUT",
      reply: "Learning mode: workout logged.",
      data: {
        type: workoutType || "other",
        duration,
        distance: dist ? Number(dist[1]) : null,
        notes: text,
      },
    };
  }

  if (bookHint) {
    const titleGuess = text.replace(/^(i[' ]?m\s+)?(reading|finished|started)\s+/i, "").trim();
    return {
      intent: "BOOK",
      reply: "Learning mode: book added to library.",
      data: {
        title: titleGuess || text,
        author: null,
        status: /finished/i.test(low) ? "finished" : (/reading|started/i.test(low) ? "reading" : "want"),
        genre: null,
      },
    };
  }

  return {
    intent: "CHAT",
    reply: "Learning mode is active. Add Anthropic key in .env for live AI replies.",
    data: {},
  };
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [db, setDb]           = useState(null);
  const [input, setInput]     = useState("");
  const [thinking, setThinking] = useState(false);
  const [view, setView]       = useState("chat");   // chat | library | workouts | words
  const [pulse, setPulse]     = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => { load().then(setDb); }, []);
  useEffect(() => { if (db) save(db); }, [db]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [db?.messages]);

  const mutate = (fn) => setDb(prev => { const next = { ...prev }; fn(next); return next; });

  // ─── Core: process any input ──────────────────────────────────────────────
  const process = useCallback(async (raw) => {
    const text = raw.trim();
    if (!text) return;
    setInput("");
    setThinking(true);
    setPulse(true);
    setTimeout(() => setPulse(false), 600);

    // Push user message
    mutate(d => d.messages.push({ id: uid(), role: "user", text, time: ts() }));

    try {
      const systemPrompt = `You are a personal hobby assistant. Analyze the user's input and:
1. DETECT its intent from these types:
   - WORD_LOOKUP: user wants the meaning/definition of a word (e.g. "what does ephemeral mean", "ephemeral", "define serendipity")
   - QUOTE: user is sharing a quote from a book (contains quotation marks or "said by" or author name, or "from [book]")
   - BOOK: user mentions a book title they read/are reading/want to read (e.g. "I'm reading Atomic Habits", "just finished 1984")
   - WORKOUT: user logged exercise (e.g. "ran 5km", "gym 1 hour", "walked today", "30 min yoga")
   - QUESTION: general question about stored data or anything else
   - CHAT: casual message

2. Respond in JSON only (no markdown, no backticks):
{
  "intent": "WORD_LOOKUP|QUOTE|BOOK|WORKOUT|QUESTION|CHAT",
  "reply": "your warm conversational reply to show in chat (1-3 sentences)",
  "data": {
    // For WORD_LOOKUP: { "word": "word", "definition": "clear definition", "example": "example sentence", "partOfSpeech": "noun/verb/etc" }
    // For QUOTE: { "text": "quote text", "book": "book title if mentioned", "author": "author if mentioned" }
    // For BOOK: { "title": "book title", "author": "author if known", "status": "reading|finished|want", "genre": "genre if obvious" }
    // For WORKOUT: { "type": "gym|run|walk|cycle|swim|yoga|hiit|climb|boxing|other", "duration": number_or_null, "distance": number_or_null, "notes": "any detail" }
    // For QUESTION or CHAT: {}
  }
}`;

      const raw_res = await callAI(systemPrompt, text);
      let parsed;
      try {
        const clean = raw_res.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = { intent: "CHAT", reply: raw_res, data: {} };
      }

      const { intent, reply, data } = parsed;
      const id = uid();

      // Store structured data
      mutate(d => {
        if (intent === "WORD_LOOKUP" && data.word) {
          d.words = d.words.filter(w => w.word.toLowerCase() !== data.word.toLowerCase());
          d.words.unshift({ id, word: data.word, definition: data.definition, example: data.example, partOfSpeech: data.partOfSpeech, savedAt: new Date().toISOString() });
        }
        if (intent === "QUOTE" && data.text) {
          d.quotes.unshift({ id, text: data.text, book: data.book || null, author: data.author || null, savedAt: new Date().toISOString() });
          // Auto-link book
          if (data.book && !d.books.find(b => b.title.toLowerCase() === data.book.toLowerCase())) {
            d.books.unshift({ id: uid(), title: data.book, author: data.author || null, status: "unknown", genre: null, addedAt: new Date().toISOString() });
          }
        }
        if (intent === "BOOK" && data.title) {
          const existing = d.books.find(b => b.title.toLowerCase() === data.title.toLowerCase());
          if (!existing) d.books.unshift({ id, title: data.title, author: data.author || null, status: data.status || "unknown", genre: data.genre || null, addedAt: new Date().toISOString() });
          else { existing.status = data.status || existing.status; existing.author = data.author || existing.author; }
        }
        if (intent === "WORKOUT" && data.type) {
          d.workouts.unshift({ id, type: data.type, duration: data.duration, distance: data.distance, notes: data.notes, date: todayStr(), savedAt: new Date().toISOString() });
        }
        d.messages.push({ id: uid(), role: "assistant", text: reply, intent, cardData: data, time: ts() });
      });

    } catch (e) {
      mutate(d => d.messages.push({ id: uid(), role: "assistant", text: "Something went wrong. Try again!", intent: "ERROR", cardData: {}, time: ts() }));
    }
    setThinking(false);
    inputRef.current?.focus();
  }, []);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); process(input); }
  };

  if (!db) return (
    <div style={S.splash}>
      <div style={S.splashDot} />
    </div>
  );

  const stats = {
    words: db.words.length,
    quotes: db.quotes.length,
    books: db.books.length,
    workouts: db.workouts.length,
  };

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* ── LEFT PANEL ── */}
      <aside style={S.aside}>
        <div style={S.logo}>
          <span style={S.logoMark}>◈</span>
          <span style={S.logoText}>FLUX</span>
        </div>

        <div style={S.asideSection}>
          <div style={S.asideSectionLabel}>OVERVIEW</div>
          {[
            { key:"chat",     icon:"◎", label:"Journal",  count: db.messages.filter(m=>m.role==="user").length },
            { key:"words",    icon:"α",  label:"Words",    count: stats.words },
            { key:"library",  icon:"▣",  label:"Library",  count: stats.books },
            { key:"workouts", icon:"◉",  label:"Workouts", count: stats.workouts },
          ].map(n => (
            <button key={n.key} style={{ ...S.navItem, ...(view===n.key ? S.navActive : {}) }} onClick={() => setView(n.key)}>
              <span style={S.navIcon}>{n.icon}</span>
              <span style={S.navLabel}>{n.label}</span>
              {n.count > 0 && <span style={{ ...S.navCount, ...(view===n.key?{background:"#e8ff47",color:"#0a0a0a"}:{}) }}>{n.count}</span>}
            </button>
          ))}
        </div>

        <div style={S.asideSection}>
          <div style={S.asideSectionLabel}>QUICK TIPS</div>
          {[
            ["α", "Type any word to define it"],
            ["❝", "Paste a quote to save it"],
            ["▣", "Mention a book title"],
            ["◉", "Log \"ran 5km today\""],
          ].map(([icon, tip]) => (
            <div key={tip} style={S.tip}><span style={{ color:"#e8ff47", fontSize:12 }}>{icon}</span><span>{tip}</span></div>
          ))}
        </div>

        <div style={S.asideMeta}>
          <div style={{ color:"#333", fontSize:10, fontFamily:"'DM Mono',monospace" }}>{todayStr()}</div>
          {Object.entries(stats).map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              <span style={{ color:"#444", fontSize:10, fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>{k}</span>
              <span style={{ color: v>0?"#e8ff47":"#333", fontSize:10, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={S.main}>

        {/* CHAT VIEW */}
        {view === "chat" && (
          <>
            <div style={S.chatArea}>
              {db.messages.length === 0 && (
                <div style={S.empty}>
                  <div style={S.emptyTitle}>Your personal intelligence layer.</div>
                  <div style={S.emptySub}>Type anything — a word, a quote, a book, a workout. I'll figure out the rest.</div>
                  <div style={S.suggestions}>
                    {["What does ephemeral mean?","\"Not all who wander are lost\" — Tolkien","Just finished Atomic Habits","Ran 6km this morning"].map(s => (
                      <button key={s} style={S.suggBtn} onClick={() => process(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {db.messages.map((msg, i) => (
                <MessageBubble key={msg.id} msg={msg} prev={db.messages[i-1]} />
              ))}
              {thinking && <ThinkingBubble />}
              <div ref={bottomRef} />
            </div>

            {/* INPUT */}
            <div style={{ ...S.inputWrap, ...(pulse ? S.inputPulse : {}) }}>
              <textarea
                ref={inputRef}
                style={S.inputBox}
                placeholder="Ask anything, log a workout, paste a quote, type a word…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
              />
              <button style={{ ...S.sendBtn, opacity: input.trim() ? 1 : 0.3 }} onClick={() => process(input)} disabled={thinking || !input.trim()}>
                <span style={{ fontSize: 18 }}>↑</span>
              </button>
            </div>
            <div style={S.inputHint}>Enter to send · Shift+Enter for newline</div>
          </>
        )}

        {/* WORDS VIEW */}
        {view === "words" && (
          <div style={S.panelWrap}>
            <PanelHeader title="Word Vault" sub={`${stats.words} words defined`} icon="α" />
            {db.words.length === 0
              ? <EmptyPanel text="Type any word in chat to define and save it." />
              : <div style={S.wordGrid}>
                  {db.words.map(w => (
                    <div key={w.id} style={S.wordCard}>
                      <div style={S.wordCardWord}>{w.word}</div>
                      {w.partOfSpeech && <div style={S.wordCardPos}>{w.partOfSpeech}</div>}
                      <div style={S.wordCardDef}>{w.definition}</div>
                      {w.example && <div style={S.wordCardEx}>"{w.example}"</div>}
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* LIBRARY VIEW */}
        {view === "library" && (
          <div style={S.panelWrap}>
            <PanelHeader title="Library" sub={`${stats.books} books · ${stats.quotes} quotes`} icon="▣" />
            {db.books.length > 0 && (
              <>
                <div style={S.panelSub}>Books</div>
                <div style={S.bookGrid}>
                  {db.books.map(b => (
                    <div key={b.id} style={S.bookCard}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ ...S.statusDot, background: {reading:"#e8ff47",finished:"#4ade80",want:"#60a5fa",unknown:"#555"}[b.status]||"#555" }} />
                        {b.genre && <span style={S.bookGenre}>{b.genre}</span>}
                      </div>
                      <div style={S.bookTitle}>{b.title}</div>
                      {b.author && <div style={S.bookAuthor}>{b.author}</div>}
                      <div style={{ ...S.bookStatus, color:{reading:"#e8ff47",finished:"#4ade80",want:"#60a5fa",unknown:"#888"}[b.status]||"#888" }}>
                        {{reading:"Currently reading",finished:"Finished",want:"Want to read",unknown:"In library"}[b.status]}
                      </div>
                      {db.quotes.filter(q=>q.book?.toLowerCase()===b.title.toLowerCase()).length > 0 && (
                        <div style={S.bookQuoteCount}>
                          ❝ {db.quotes.filter(q=>q.book?.toLowerCase()===b.title.toLowerCase()).length} quotes
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {db.quotes.length > 0 && (
              <>
                <div style={{ ...S.panelSub, marginTop:32 }}>Quotes</div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {db.quotes.map(q => (
                    <div key={q.id} style={S.quoteCard}>
                      <div style={S.quoteText}>"{q.text}"</div>
                      {(q.author || q.book) && (
                        <div style={S.quoteMeta}>
                          {q.author && <span>— {q.author}</span>}
                          {q.book && <span style={{ color:"#555" }}>{q.author?" · ":""}{q.book}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {db.books.length === 0 && db.quotes.length === 0 && <EmptyPanel text="Mention a book title or paste a quote in chat." />}
          </div>
        )}

        {/* WORKOUTS VIEW */}
        {view === "workouts" && (
          <div style={S.panelWrap}>
            <PanelHeader title="Workouts" sub={`${stats.workouts} sessions logged`} icon="◉" />
            {db.workouts.length === 0
              ? <EmptyPanel text='Try "ran 5km today" or "1 hour gym session" in chat.' />
              : <>
                  <WorkoutWeekChart workouts={db.workouts} />
                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:24 }}>
                    {db.workouts.map(w => (
                      <div key={w.id} style={S.workoutRow}>
                        <span style={{ fontSize:22 }}>{WORKOUT_EMOJI[w.type]||"💪"}</span>
                        <div style={{ flex:1 }}>
                          <div style={S.workoutType}>{w.type.charAt(0).toUpperCase()+w.type.slice(1)}</div>
                          <div style={S.workoutDate}>{w.date}</div>
                          {w.notes && <div style={S.workoutNotes}>{w.notes}</div>}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                          {w.duration && <span style={S.workoutChip}>{w.duration} min</span>}
                          {w.distance && <span style={{ ...S.workoutChip, background:"#1a2a1a", color:"#4ade80" }}>{w.distance} km</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  if (isUser) return (
    <div style={S.userBubbleWrap}>
      <div style={S.userBubble}>{msg.text}</div>
      <div style={S.bubbleTime}>{msg.time}</div>
    </div>
  );

  return (
    <div style={S.aiBubbleWrap}>
      <div style={S.aiAvatar}>◈</div>
      <div style={{ flex:1, maxWidth:560 }}>
        <div style={S.aiBubble}>{msg.text}</div>
        {/* Inline card based on intent */}
        {msg.intent === "WORD_LOOKUP" && msg.cardData?.word && <WordInlineCard d={msg.cardData} />}
        {msg.intent === "QUOTE"       && msg.cardData?.text  && <QuoteInlineCard d={msg.cardData} />}
        {msg.intent === "BOOK"        && msg.cardData?.title && <BookInlineCard d={msg.cardData} />}
        {msg.intent === "WORKOUT"     && msg.cardData?.type  && <WorkoutInlineCard d={msg.cardData} />}
        <div style={S.bubbleTime}>{msg.time}</div>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div style={S.aiBubbleWrap}>
      <div style={S.aiAvatar}>◈</div>
      <div style={{ ...S.aiBubble, padding:"14px 18px" }}>
        <div style={S.dots}><span /><span /><span /></div>
      </div>
    </div>
  );
}

// ─── Inline Cards ─────────────────────────────────────────────────────────────
function WordInlineCard({ d }) {
  return (
    <div style={S.inlineCard}>
      <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:4 }}>
        <span style={S.wordBig}>{d.word}</span>
        {d.partOfSpeech && <span style={S.posTag}>{d.partOfSpeech}</span>}
      </div>
      <div style={S.defText}>{d.definition}</div>
      {d.example && <div style={S.exText}>"{d.example}"</div>}
    </div>
  );
}

function QuoteInlineCard({ d }) {
  return (
    <div style={{ ...S.inlineCard, borderColor:"#e8ff4733" }}>
      <div style={S.quoteCardText}>"{d.text}"</div>
      {(d.author||d.book) && (
        <div style={{ color:"#555", fontSize:12, fontFamily:"'DM Mono',monospace", marginTop:8 }}>
          {d.author && `— ${d.author}`}{d.book && (d.author?" · ":"")}{d.book}
        </div>
      )}
      <div style={S.savedTag}>✓ saved to library</div>
    </div>
  );
}

function BookInlineCard({ d }) {
  const statusColor = {reading:"#e8ff47",finished:"#4ade80",want:"#60a5fa"}[d.status]||"#888";
  return (
    <div style={{ ...S.inlineCard, borderColor: statusColor + "33" }}>
      <div style={{ color: statusColor, fontSize:10, fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:2, marginBottom:6 }}>
        {{reading:"Currently Reading",finished:"Finished",want:"Want to Read"}[d.status]||"Added to Library"}
      </div>
      <div style={{ color:"#f0f0f0", fontFamily:"'DM Serif Display',serif", fontSize:18, lineHeight:1.3 }}>{d.title}</div>
      {d.author && <div style={{ color:"#666", fontSize:13, fontFamily:"'Syne',sans-serif", marginTop:3 }}>{d.author}</div>}
      <div style={S.savedTag}>✓ saved to library</div>
    </div>
  );
}

function WorkoutInlineCard({ d }) {
  return (
    <div style={{ ...S.inlineCard, borderColor:"#4ade8033" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:28 }}>{WORKOUT_EMOJI[d.type]||"💪"}</span>
        <div>
          <div style={{ color:"#f0f0f0", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16 }}>
            {d.type.charAt(0).toUpperCase()+d.type.slice(1)}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:3 }}>
            {d.duration && <span style={S.workoutChip}>{d.duration} min</span>}
            {d.distance && <span style={{ ...S.workoutChip, background:"#1a2a1a", color:"#4ade80" }}>{d.distance} km</span>}
          </div>
        </div>
      </div>
      {d.notes && <div style={{ color:"#555", fontSize:12, fontFamily:"'DM Mono',monospace", marginTop:8 }}>{d.notes}</div>}
      <div style={S.savedTag}>✓ logged to workouts</div>
    </div>
  );
}

// ─── Panel Components ─────────────────────────────────────────────────────────
function PanelHeader({ title, sub, icon }) {
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ color:"#e8ff47", fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:3, textTransform:"uppercase", marginBottom:8 }}>{icon} {title}</div>
      <div style={{ color:"#555", fontSize:13, fontFamily:"'Syne',sans-serif" }}>{sub}</div>
    </div>
  );
}

function EmptyPanel({ text }) {
  return (
    <div style={{ color:"#333", fontFamily:"'DM Mono',monospace", fontSize:13, padding:"40px 0", textAlign:"center" }}>
      {text}
    </div>
  );
}

function WorkoutWeekChart({ workouts }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
  });
  const data = days.map(day => ({
    label: day.split(",")[0],
    min: workouts.filter(w => w.date === day).reduce((s,w) => s+(w.duration||30), 0),
    count: workouts.filter(w => w.date === day).length,
  }));
  const max = Math.max(...data.map(d=>d.min), 1);
  return (
    <div style={{ background:"#0e0e0e", border:"1px solid #1a1a1a", borderRadius:12, padding:"20px 16px" }}>
      <div style={{ color:"#444", fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:2, marginBottom:16 }}>LAST 7 DAYS</div>
      <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:80 }}>
        {data.map((d,i) => (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <div style={{ width:"100%", background: d.min>0?"#e8ff47":"#1a1a1a", borderRadius:3, height: Math.max(3,(d.min/max)*64), transition:"height .4s ease", position:"relative" }}>
              {d.min>0 && <div style={{ position:"absolute", top:-16, left:"50%", transform:"translateX(-50%)", color:"#e8ff47", fontSize:9, fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>{d.min}m</div>}
            </div>
            <div style={{ color:"#333", fontSize:9, fontFamily:"'DM Mono',monospace" }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Styles & CSS ─────────────────────────────────────────────────────────────
const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #0a0a0a; }
  ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 2px; }
  textarea { resize: none; overflow: hidden; }
  textarea:focus { outline: none; }
  @keyframes blink { 0%,80%,100%{opacity:0} 40%{opacity:1} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  @keyframes ripple { 0%{box-shadow:0 0 0 0 rgba(232,255,71,.15)} 100%{box-shadow:0 0 0 16px rgba(232,255,71,0)} }
`;

const S = {
  root: { display:"flex", height:"100vh", background:"#080808", color:"#d0d0d0", fontFamily:"'Syne',sans-serif", overflow:"hidden" },
  splash: { display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#080808" },
  splashDot: { width:8, height:8, borderRadius:"50%", background:"#e8ff47" },

  // Aside
  aside: { width:210, background:"#0a0a0a", borderRight:"1px solid #111", display:"flex", flexDirection:"column", padding:"24px 16px", flexShrink:0 },
  logo: { display:"flex", alignItems:"center", gap:8, marginBottom:32 },
  logoMark: { color:"#e8ff47", fontSize:18, fontWeight:800 },
  logoText: { color:"#f0f0f0", fontSize:18, fontWeight:800, letterSpacing:4 },
  asideSection: { marginBottom:28 },
  asideSectionLabel: { color:"#2a2a2a", fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:3, textTransform:"uppercase", marginBottom:10 },
  navItem: { display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:8, border:"none", background:"transparent", color:"#444", cursor:"pointer", width:"100%", textAlign:"left", transition:"all .15s" },
  navActive: { background:"#111", color:"#f0f0f0" },
  navIcon: { fontSize:14, width:16, textAlign:"center", flexShrink:0 },
  navLabel: { flex:1, fontSize:13, fontFamily:"'Syne',sans-serif", fontWeight:600 },
  navCount: { fontSize:10, fontFamily:"'DM Mono',monospace", background:"#1a1a1a", color:"#555", borderRadius:10, padding:"1px 6px", fontWeight:600 },
  tip: { display:"flex", gap:8, alignItems:"center", padding:"5px 0", color:"#2a2a2a", fontSize:11, fontFamily:"'DM Mono',monospace" },
  asideMeta: { marginTop:"auto", paddingTop:16, borderTop:"1px solid #111" },

  // Main
  main: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" },
  chatArea: { flex:1, overflowY:"auto", padding:"28px 32px 8px", display:"flex", flexDirection:"column", gap:20 },

  // Empty / suggestions
  empty: { margin:"auto", textAlign:"center", maxWidth:440, padding:"40px 20px" },
  emptyTitle: { color:"#f0f0f0", fontFamily:"'DM Serif Display',serif", fontSize:26, lineHeight:1.3, marginBottom:12 },
  emptySub: { color:"#444", fontSize:13, fontFamily:"'DM Mono',monospace", lineHeight:1.7, marginBottom:28 },
  suggestions: { display:"flex", flexDirection:"column", gap:8, alignItems:"center" },
  suggBtn: { background:"#0e0e0e", border:"1px solid #1a1a1a", borderRadius:8, color:"#555", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:12, padding:"9px 16px", transition:"all .15s", textAlign:"left", width:"100%" },

  // Input
  inputWrap: { display:"flex", gap:10, padding:"16px 32px", borderTop:"1px solid #111", background:"#080808", alignItems:"flex-end", transition:"box-shadow .3s" },
  inputPulse: { animation:"ripple .6s ease-out" },
  inputBox: { flex:1, background:"#0e0e0e", border:"1px solid #1a1a1a", borderRadius:12, color:"#f0f0f0", fontFamily:"'DM Mono',monospace", fontSize:13, padding:"13px 16px", lineHeight:1.5, minHeight:48, transition:"border-color .2s" },
  sendBtn: { width:44, height:44, borderRadius:10, background:"#e8ff47", border:"none", color:"#0a0a0a", cursor:"pointer", fontSize:18, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"opacity .2s" },
  inputHint: { textAlign:"center", color:"#1e1e1e", fontSize:10, fontFamily:"'DM Mono',monospace", paddingBottom:12, marginTop:-10 },

  // Bubbles
  userBubbleWrap: { display:"flex", flexDirection:"column", alignItems:"flex-end", animation:"fadeUp .2s ease" },
  userBubble: { background:"#111", borderRadius:"16px 16px 4px 16px", color:"#f0f0f0", fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:500, lineHeight:1.6, maxWidth:480, padding:"12px 16px" },
  aiBubbleWrap: { display:"flex", gap:12, alignItems:"flex-start", animation:"fadeUp .25s ease" },
  aiAvatar: { width:28, height:28, borderRadius:8, background:"#111", display:"flex", alignItems:"center", justifyContent:"center", color:"#e8ff47", fontSize:12, flexShrink:0, marginTop:4 },
  aiBubble: { background:"#0e0e0e", border:"1px solid #141414", borderRadius:"4px 16px 16px 16px", color:"#b0b0b0", fontFamily:"'Syne',sans-serif", fontSize:14, lineHeight:1.7, padding:"12px 16px" },
  bubbleTime: { color:"#222", fontSize:10, fontFamily:"'DM Mono',monospace", marginTop:5, paddingLeft:4 },
  dots: { display:"flex", gap:5, "& span":{ width:5, height:5, borderRadius:"50%", background:"#333", display:"inline-block", animation:"blink 1.2s infinite" } },

  // Inline cards
  inlineCard: { background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:12, padding:"14px 16px", marginTop:10 },
  wordBig: { color:"#f0f0f0", fontFamily:"'DM Serif Display',serif", fontSize:22 },
  posTag: { color:"#e8ff47", fontSize:10, fontFamily:"'DM Mono',monospace", background:"#e8ff4711", padding:"2px 7px", borderRadius:20, textTransform:"uppercase", letterSpacing:1 },
  defText: { color:"#888", fontSize:13, fontFamily:"'Syne',sans-serif", lineHeight:1.7, marginTop:4 },
  exText: { color:"#444", fontSize:12, fontFamily:"'DM Mono',monospace", fontStyle:"italic", marginTop:8, borderLeft:"2px solid #1e1e1e", paddingLeft:10 },
  quoteCardText: { color:"#c0c0c0", fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:16, lineHeight:1.8 },
  savedTag: { color:"#2a4a2a", fontSize:10, fontFamily:"'DM Mono',monospace", marginTop:10, letterSpacing:1 },
  workoutChip: { background:"#1a1200", color:"#e8ff47", fontSize:11, fontFamily:"'DM Mono',monospace", padding:"2px 8px", borderRadius:6, fontWeight:600 },

  // Panel
  panelWrap: { flex:1, overflowY:"auto", padding:"32px 36px" },
  panelSub: { color:"#333", fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:3, textTransform:"uppercase", marginBottom:14 },

  // Words
  wordGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 },
  wordCard: { background:"#0a0a0a", border:"1px solid #111", borderRadius:14, padding:"18px 16px" },
  wordCardWord: { color:"#f0f0f0", fontFamily:"'DM Serif Display',serif", fontSize:20, marginBottom:3 },
  wordCardPos: { color:"#e8ff47", fontSize:10, fontFamily:"'DM Mono',monospace", background:"#e8ff4711", padding:"2px 7px", borderRadius:20, textTransform:"uppercase", letterSpacing:1, display:"inline-block", marginBottom:10 },
  wordCardDef: { color:"#777", fontSize:13, fontFamily:"'Syne',sans-serif", lineHeight:1.7 },
  wordCardEx: { color:"#333", fontSize:12, fontFamily:"'DM Mono',monospace", fontStyle:"italic", marginTop:10, borderLeft:"2px solid #1a1a1a", paddingLeft:10 },

  // Books
  bookGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 },
  bookCard: { background:"#0a0a0a", border:"1px solid #111", borderRadius:12, padding:16 },
  statusDot: { width:7, height:7, borderRadius:"50%", flexShrink:0, marginTop:3 },
  bookGenre: { color:"#333", fontSize:10, fontFamily:"'DM Mono',monospace" },
  bookTitle: { color:"#f0f0f0", fontFamily:"'DM Serif Display',serif", fontSize:16, lineHeight:1.3, marginBottom:4 },
  bookAuthor: { color:"#555", fontSize:12, fontFamily:"'DM Mono',monospace", fontStyle:"italic" },
  bookStatus: { fontSize:10, fontFamily:"'DM Mono',monospace", marginTop:6, textTransform:"uppercase", letterSpacing:1 },
  bookQuoteCount: { color:"#2a2a2a", fontSize:10, fontFamily:"'DM Mono',monospace", marginTop:6 },

  // Quotes
  quoteCard: { background:"#0a0a0a", border:"1px solid #111", borderLeft:"3px solid #e8ff4722", borderRadius:"0 12px 12px 0", padding:"16px 18px" },
  quoteText: { color:"#b0b0b0", fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:15, lineHeight:1.8 },
  quoteMeta: { color:"#444", fontSize:11, fontFamily:"'DM Mono',monospace", marginTop:10 },

  // Workouts
  workoutRow: { display:"flex", gap:14, alignItems:"center", background:"#0a0a0a", border:"1px solid #111", borderRadius:12, padding:"12px 16px" },
  workoutType: { color:"#f0f0f0", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15 },
  workoutDate: { color:"#333", fontSize:11, fontFamily:"'DM Mono',monospace" },
  workoutNotes: { color:"#444", fontSize:12, fontFamily:"'DM Mono',monospace", marginTop:3 },
};
