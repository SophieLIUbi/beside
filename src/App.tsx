import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { COMPANIONS, companionById } from "./companions";
import { COPY } from "./copy";
import { Portrait } from "./portrait";
import { PRESETS, voiceReady } from "./presets";
import { load, save } from "./storage";
import type { Profile, ProviderKind, Thread } from "./types";

type Sheet = "connect" | "help" | null;
type Arm = "erase" | "forget" | null;

export function App() {
  const saved = useState(load)[0];
  const [profile, setProfile] = useState<Profile>(saved.profile);
  const [threads, setThreads] = useState<Thread[]>(saved.threads);
  const [activeId, setActiveId] = useState<string | null>(saved.activeId);
  const [draft, setDraft] = useState("");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [draftProfile, setDraftProfile] = useState<Profile | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [arm, setArm] = useState<Arm>(null);

  const boxRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const pendingText = useRef("");

  const t = COPY[profile.locale];
  const active = threads.find((thread) => thread.id === activeId) ?? null;
  const ready = voiceReady(profile.provider, profile.apiKey);

  useEffect(() => {
    save({ v: 1, profile, threads, activeId });
  }, [profile, threads, activeId]);

  useEffect(() => {
    document.documentElement.lang = profile.locale === "zh" ? "zh-Hant" : "en";
    document.title = active ? `Beside — ${companionById(active.companionId).name}` : "Beside";
  }, [profile.locale, active]);

  useEffect(() => {
    setError(null);
  }, [profile.locale]);

  useEffect(() => {
    setThreads((prev) => {
      let changed = false;
      const next = prev.map((thread) => {
        const onlyGreeting = thread.messages.length === 1 && thread.messages[0]?.role === "companion";
        if (!onlyGreeting) return thread;
        const content = companionById(thread.companionId).greet[profile.locale](profile.name.trim());
        if (thread.messages[0].content === content) return thread;
        changed = true;
        return { ...thread, messages: [{ ...thread.messages[0], content }] };
      });
      return changed ? next : prev;
    });
  }, [profile.name, profile.locale]);

  useEffect(() => {
    if (!arm) return;
    const id = window.setTimeout(() => setArm(null), 4000);
    return () => window.clearTimeout(id);
  }, [arm]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft, activeId]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickRef.current = true;
  }, [activeId]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, [activeId]);

  function scrollIfStuck() {
    const el = scrollerRef.current;
    if (!el || !stickRef.current) return;
    el.scrollTop = el.scrollHeight;
  }

  function openCompanion(id: string) {
    const existing = threads
      .filter((thread) => thread.companionId === id)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (existing) setActiveId(existing.id);
    else startThread(id);
    setNavOpen(false);
    setError(null);
  }

  function startThread(id: string) {
    const thread: Thread = {
      id: crypto.randomUUID(),
      companionId: id,
      title: "",
      updatedAt: Date.now(),
      messages: [
        {
          id: crypto.randomUUID(),
          role: "companion",
          content: companionById(id).greet[profile.locale](profile.name.trim()),
          createdAt: Date.now(),
        },
      ],
    };
    setThreads((prev) => [thread, ...prev].slice(0, 40));
    setActiveId(thread.id);
    setNavOpen(false);
    setError(null);
  }

  function patchReply(threadId: string, replyId: string, content: string) {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              updatedAt: Date.now(),
              messages: thread.messages.map((msg) => (msg.id === replyId ? { ...msg, content } : msg)),
            }
          : thread,
      ),
    );
    requestAnimationFrame(scrollIfStuck);
  }

  function dropEmpty(threadId: string, replyId: string) {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId
          ? { ...thread, messages: thread.messages.filter((msg) => msg.id !== replyId || msg.content.trim()) }
          : thread,
      ),
    );
  }

  async function actuallySend(profileNow: Profile, text: string) {
    if (sendingRef.current) return;
    const thread = threads.find((item) => item.id === activeId);
    if (!thread) return;
    const value = text.trim();
    if (!value) return;

    sendingRef.current = true;
    setSending(true);
    setError(null);
    setDraft("");
    const copy = COPY[profileNow.locale];
    const userMsg = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: value,
      createdAt: Date.now(),
    };
    const replyId = crypto.randomUUID();
    setStreamId(replyId);
    const titled = thread.title || value.slice(0, 48);
    const history = [
      ...thread.messages,
      userMsg,
      { id: replyId, role: "companion" as const, content: "", createdAt: Date.now() },
    ];
    setThreads((prev) =>
      prev.map((item) =>
        item.id === thread.id ? { ...item, title: titled, messages: history, updatedAt: Date.now() } : item,
      ),
    );

    const ac = new AbortController();
    abortRef.current = ac;
    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          companionId: thread.companionId,
          userName: profileNow.name,
          locale: profileNow.locale,
          provider: {
            kind: profileNow.provider,
            apiKey: profileNow.apiKey,
            model: profileNow.model,
            baseUrl: profileNow.baseUrl,
          },
          messages: history
            .filter((msg) => msg.id !== replyId && msg.content.trim())
            .map((msg) => ({
              role: msg.role === "user" ? "user" : "assistant",
              content: msg.content,
            })),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || copy.quiet);
      }
      if (!res.body) throw new Error(copy.quiet);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buf += decoder.decode(chunk, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          let payload: { delta?: string; error?: string };
          try {
            payload = JSON.parse(data) as { delta?: string; error?: string };
          } catch {
            continue;
          }
          if (payload.error) throw new Error(payload.error);
          if (payload.delta) {
            full += payload.delta;
            patchReply(thread.id, replyId, full);
          }
        }
      }
      if (!full.trim()) throw new Error(copy.quiet);
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      if (!full.trim()) dropEmpty(thread.id, replyId);
      if (!aborted) setError(err instanceof Error ? err.message : copy.quiet);
    } finally {
      sendingRef.current = false;
      setSending(false);
      setStreamId(null);
      abortRef.current = null;
    }
  }

  function onSend(text?: string) {
    const value = (text ?? draft).trim();
    if (!value || sendingRef.current) return;
    if (!voiceReady(profile.provider, profile.apiKey)) {
      pendingText.current = value;
      setDraft(value);
      setDraftProfile(profile);
      setFormError(null);
      setSheet("connect");
      return;
    }
    void actuallySend(profile, value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.key === "Process") return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  function closeSheet() {
    pendingText.current = "";
    setSheet(null);
    setArm(null);
    setFormError(null);
  }

  function commitConnection() {
    if (!draftProfile) return;
    const copy = COPY[draftProfile.locale];
    if (PRESETS[draftProfile.provider].needsKey && draftProfile.apiKey.trim().length < 12) {
      setFormError(copy.needKey);
      return;
    }
    if (!draftProfile.model.trim()) {
      setFormError(copy.needModel);
      return;
    }
    const next = {
      ...draftProfile,
      apiKey: draftProfile.apiKey.trim(),
      model: draftProfile.model.trim(),
      baseUrl: draftProfile.baseUrl.trim(),
    };
    setProfile(next);
    setSheet(null);
    setFormError(null);
    const queued = pendingText.current;
    pendingText.current = "";
    if (queued) void actuallySend(next, queued);
  }

  function chooseProvider(kind: ProviderKind) {
    setDraftProfile((prev) => {
      if (!prev) return prev;
      const preset = PRESETS[kind];
      return {
        ...prev,
        provider: kind,
        model: preset.model || prev.model,
        baseUrl: kind === "custom" ? prev.baseUrl : preset.baseUrl,
      };
    });
    setFormError(null);
  }

  function eraseChats() {
    if (arm !== "erase") {
      setArm("erase");
      return;
    }
    abortRef.current?.abort();
    setThreads([]);
    setActiveId(null);
    setArm(null);
    setSheet(null);
  }

  function forgetThread() {
    if (!active) return;
    if (arm !== "forget") {
      setArm("forget");
      return;
    }
    abortRef.current?.abort();
    setThreads((prev) => prev.filter((thread) => thread.id !== active.id));
    setActiveId(null);
    setArm(null);
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
  }

  const recent = [...threads].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12);
  const form = draftProfile ?? profile;
  const formCopy = COPY[form.locale];

  return (
    <div className="app">
      {navOpen && <button className="nav-scrim" aria-label={t.close} onClick={() => setNavOpen(false)} />}
      <aside className={navOpen ? "side open" : "side"}>
        <div className="brand">
          <div className="brand-mark">Beside</div>
          <p>{t.tagline}</p>
        </div>
        <label className="name-field">
          <span className="label">{t.yourName}</span>
          <input
            className="side-input"
            value={profile.name}
            placeholder={t.namePlaceholder}
            autoComplete="off"
            maxLength={40}
            onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
          />
        </label>

        <div className="side-block">
          <div className="label">{t.people}</div>
          <div className="people">
            {COMPANIONS.map((person) => (
              <button
                key={person.id}
                className={active?.companionId === person.id ? "person active" : "person"}
                onClick={() => openCompanion(person.id)}
                aria-current={active?.companionId === person.id ? "true" : undefined}
              >
                <Portrait id={person.id} size={44} />
                <span className="person-copy">
                  <strong>{person.name}</strong>
                  <small>{person.role[profile.locale]}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="side-block grow">
          <div className="label">{t.recent}</div>
          {recent.length === 0 && <p className="quiet">{t.noneYet}</p>}
          <div className="recents">
            {recent.map((thread) => (
              <button
                key={thread.id}
                className={thread.id === activeId ? "recent-item active" : "recent-item"}
                onClick={() => {
                  setActiveId(thread.id);
                  setNavOpen(false);
                }}
              >
                <span>
                  <strong>{thread.title || companionById(thread.companionId).name}</strong>
                  <small>{companionById(thread.companionId).role[profile.locale]}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="side-foot">
          <span className={ready ? "voice-pill on" : "voice-pill"}>{ready ? t.voiceOn : t.voiceOff}</span>
          <button
            className="lang"
            onClick={() =>
              setProfile((prev) => ({ ...prev, locale: prev.locale === "en" ? "zh" : "en" }))
            }
          >
            {t.language}
          </button>
          <button className="text-btn" onClick={() => setSheet("help")}>
            {t.help}
          </button>
          <button
            className="text-btn"
            onClick={() => {
              setDraftProfile(profile);
              setFormError(null);
              setSheet("connect");
            }}
          >
            {t.connection}
          </button>
          <p className="disclaimer">{t.disclaimer}</p>
        </div>
      </aside>

      <main className="paper">
        <div className="topbar">
          <button className="icon-btn" onClick={() => setNavOpen(true)} aria-label={t.menu}>
            <MenuIcon />
          </button>
          <strong>{active ? companionById(active.companionId).name : "Beside"}</strong>
          {active && (
            <>
              <button className="text-btn" onClick={() => startThread(active.companionId)}>
                {t.newChat}
              </button>
              <button className="text-btn danger" onClick={forgetThread}>
                {arm === "forget" ? t.forgetArm : t.forget}
              </button>
            </>
          )}
        </div>

        {!active && (
          <section className="chooser">
            <p className="kicker">{t.kicker}</p>
            <h1>
              {t.hero} <em>{t.heroEm}</em>
            </h1>
            <p className="lede">{t.heroHint}</p>
            <div className="cards">
              {COMPANIONS.map((person) => (
                <button key={person.id} className="card" onClick={() => openCompanion(person.id)}>
                  <Portrait id={person.id} size={72} />
                  <span className="card-copy">
                    <strong>{person.name}</strong>
                    <small>{person.role[profile.locale]}</small>
                    <small>{person.blurb[profile.locale]}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {active && (
          <section className="thread" style={{ "--accent": companionById(active.companionId).accent } as CSSProperties}>
            <header className="thread-head">
              <Portrait id={active.companionId} size={52} />
              <div className="who">
                <strong>{companionById(active.companionId).name}</strong>
                <small>{companionById(active.companionId).role[profile.locale]}</small>
              </div>
              <div className="head-actions">
                <button className="text-btn" onClick={() => startThread(active.companionId)}>
                  {t.newChat}
                </button>
                <button className="text-btn danger" onClick={forgetThread}>
                  {arm === "forget" ? t.forgetArm : t.forget}
                </button>
              </div>
            </header>
            <div className="messages" ref={scrollerRef} onScroll={onScroll}>
              {active.messages.map((msg) => {
                const streaming = msg.id === streamId;
                if (msg.role === "companion" && !msg.content && streaming) {
                  return (
                    <p key={msg.id} className="writing">
                      {companionById(active.companionId).name} {t.writing}
                    </p>
                  );
                }
                if (!msg.content) return null;
                return (
                  <div key={msg.id} className={msg.role === "user" ? "msg-user" : "msg-companion"}>
                    <p className="msg-text">
                      {msg.content}
                      {streaming && <i className="caret" />}
                    </p>
                  </div>
                );
              })}
            </div>
            {!active.messages.some((msg) => msg.role === "user") && (
              <div className="chips">
                {t.chips.map((chip) => (
                  <button key={chip} className="chip" onClick={() => onSend(chip)}>
                    {chip}
                  </button>
                ))}
              </div>
            )}
            <div className="composer-wrap">
              {error && <p className="error-line">{error}</p>}
              {!ready && !error && <p className="error-line">{t.needVoice}</p>}
              <form
                className="composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSend();
                }}
              >
                <label className="sr" htmlFor="say">
                  {t.placeholder}
                </label>
                <textarea
                  id="say"
                  ref={boxRef}
                  rows={1}
                  value={draft}
                  placeholder={t.placeholder}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onKeyDown}
                  autoComplete="off"
                />
                {sending ? (
                  <button type="button" className="stop-btn" onClick={() => abortRef.current?.abort()}>
                    {t.stop}
                  </button>
                ) : (
                  <button className="send-btn" type="submit" disabled={!draft.trim()}>
                    {t.send}
                  </button>
                )}
              </form>
            </div>
          </section>
        )}
      </main>

      {sheet && (
        <div
          className="scrim"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSheet();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeSheet();
          }}
        >
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeSheet();
            }}
          >
            {sheet === "connect" && (
              <>
                <div className="sheet-head">
                  <h2 id="sheet-title">{formCopy.connectTitle}</h2>
                  <button className="text-btn" onClick={closeSheet}>
                    {formCopy.close}
                  </button>
                </div>
                <p className="sheet-lead">{formCopy.connectBody}</p>
                <div className="provider-grid">
                  {(["deepseek", "groq", "openai", "ollama", "custom"] as ProviderKind[]).map((kind) => (
                    <button
                      key={kind}
                      className={form.provider === kind ? "provider on" : "provider"}
                      onClick={() => chooseProvider(kind)}
                    >
                      <strong>{formCopy[kind]}</strong>
                      <small>{formCopy.providers[kind]}</small>
                    </button>
                  ))}
                </div>
                {form.provider === "ollama" ? (
                  <p className="hint">
                    {formCopy.ollamaHint}{" "}
                    <a href="https://ollama.com/download" target="_blank" rel="noreferrer">
                      {formCopy.getOllama}
                    </a>
                  </p>
                ) : (
                  <label className="field">
                    <span>{formCopy.key}</span>
                    <span className="key-row">
                      <input
                        type={showKey ? "text" : "password"}
                        value={form.apiKey}
                        autoComplete="off"
                        autoFocus
                        onChange={(event) =>
                          setDraftProfile((prev) => (prev ? { ...prev, apiKey: event.target.value } : prev))
                        }
                      />
                      <button type="button" className="text-btn" onClick={() => setShowKey((v) => !v)}>
                        {showKey ? formCopy.hideKey : formCopy.showKey}
                      </button>
                    </span>
                  </label>
                )}
                {form.provider === "groq" && (
                  <p className="hint">
                    <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
                      {formCopy.getKey}
                    </a>
                  </p>
                )}
                {form.provider === "openai" && (
                  <p className="hint">
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                      {formCopy.getOpenAI}
                    </a>
                  </p>
                )}
                {form.provider === "deepseek" && (
                  <p className="hint">
                    <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">
                      {formCopy.getDeepSeek}
                    </a>
                  </p>
                )}
                <label className="field">
                  <span>{formCopy.model}</span>
                  <input
                    value={form.model}
                    onChange={(event) =>
                      setDraftProfile((prev) => (prev ? { ...prev, model: event.target.value } : prev))
                    }
                  />
                </label>
                <label className="field">
                  <span>{formCopy.address}</span>
                  <input
                    value={form.baseUrl}
                    onChange={(event) =>
                      setDraftProfile((prev) => (prev ? { ...prev, baseUrl: event.target.value } : prev))
                    }
                  />
                </label>
                {formError && <p className="error-line">{formError}</p>}
                <div className="sheet-actions">
                  <button className="primary" onClick={commitConnection}>
                    {formCopy.useThis}
                  </button>
                  <button
                    className="text-btn danger"
                    onClick={() => {
                      setProfile((prev) => ({ ...prev, apiKey: "" }));
                      setDraftProfile((prev) => (prev ? { ...prev, apiKey: "" } : prev));
                    }}
                  >
                    {formCopy.eraseKey}
                  </button>
                </div>
                <p className="fine">{formCopy.privacy}</p>
              </>
            )}
            {sheet === "help" && (
              <>
                <div className="sheet-head">
                  <h2 id="sheet-title">{t.helpTitle}</h2>
                  <button className="text-btn" onClick={closeSheet}>
                    {t.close}
                  </button>
                </div>
                <p className="sheet-lead">{t.helpBody}</p>
                <p>{t.helpAct}</p>
                <ul className="help-list">
                  <li>
                    {t.emergency}: 999
                  </li>
                  <li>
                    {t.sbhk}: 2389 2222
                  </li>
                  <li>
                    {t.samaritans}: 2896 0000
                  </li>
                  <li>
                    <a href="https://www.iasp.info/suicidalthoughts/" target="_blank" rel="noreferrer">
                      {t.elsewhere}
                    </a>
                  </li>
                </ul>
                <button className="text-btn danger" onClick={eraseChats}>
                  {arm === "erase" ? t.eraseArm : t.eraseChats}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
