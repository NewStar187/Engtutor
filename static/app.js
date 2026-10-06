(() => {
  const $ = (id) => document.getElementById(id);
  const chat = $("chat");
  const messages = $("messages");
  const empty = $("empty");
  const form = $("composer");
  const input = $("input");
  const sendBtn = $("send-btn");
  const micBtn = $("mic-btn");
  const sessionList = $("session-list");
  const sidebar = $("sidebar");
  const backdrop = $("backdrop");
  const menuBtn = $("menu-btn");
  const STORAGE_KEY = "engtutor.sessions";
  const LEGACY_KEY = "engtutor.conversation";

  // 세션: { id, title, updatedAt, history: [{ role: "user" | "tutor", text, result? }] }
  let state = load();
  let busy = false;

  function load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { /* 무시 */ }
    if (!data || !Array.isArray(data.sessions)) data = { sessions: [], currentId: null };

    // 예전 버전(대화 1개만 저장)에서 옮겨오기
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
      if (Array.isArray(legacy) && legacy.length) {
        const s = newSession(legacy.find((t) => t.role === "user")?.text || "이전 대화");
        s.history = legacy;
        data.sessions.unshift(s);
        data.currentId = s.id;
      }
      localStorage.removeItem(LEGACY_KEY);
    } catch { /* 무시 */ }
    return data;
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* 저장 불가 시 무시 */ }
  }

  function newSession(firstText) {
    const title = firstText.length > 40 ? `${firstText.slice(0, 40)}…` : firstText;
    return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, updatedAt: Date.now(), history: [] };
  }
  function current() {
    return state.sessions.find((s) => s.id === state.currentId) || null;
  }

  function clone(id) {
    return $(id).content.firstElementChild.cloneNode(true);
  }

  function scrollToBottom() {
    chat.scrollTop = chat.scrollHeight;
  }

  function updateView() {
    empty.hidden = messages.children.length > 0;
  }

  // ---------- 사이드바 (대화 목록) ----------
  function formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  }

  function renderSessions() {
    sessionList.innerHTML = "";
    const sorted = [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
    for (const s of sorted) {
      const el = clone("tpl-session");
      el.classList.toggle("active", s.id === state.currentId);
      el.querySelector(".session-title").textContent = s.title;
      el.querySelector(".session-date").textContent = formatDate(s.updatedAt);
      el.querySelector(".session-open").addEventListener("click", () => openSession(s.id));
      el.querySelector(".session-delete").addEventListener("click", () => deleteSession(s.id));
      sessionList.appendChild(el);
    }
    $("session-empty").hidden = sorted.length > 0;
  }

  function openSession(id) {
    window.speechSynthesis?.cancel();
    state.currentId = id;
    save();
    renderAll();
    closeSidebar();
    input.focus();
  }

  function startNewSession() {
    openSession(null); // 첫 메시지를 보낼 때 세션이 만들어짐
  }

  function deleteSession(id) {
    const s = state.sessions.find((x) => x.id === id);
    if (!s || !confirm(`"${s.title}" 대화를 삭제할까요?`)) return;
    state.sessions = state.sessions.filter((x) => x.id !== id);
    if (state.currentId === id) state.currentId = null;
    save();
    renderAll();
  }

  function openSidebar() {
    sidebar.classList.add("open");
    backdrop.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
  }
  function closeSidebar() {
    sidebar.classList.remove("open");
    backdrop.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  }

  // ---------- 메시지 ----------
  function renderUser(text) {
    const el = clone("tpl-user");
    el.querySelector(".bubble").textContent = text;
    messages.appendChild(el);
  }

  function renderTutor(result, original) {
    const el = clone("tpl-tutor");
    const card = el.querySelector(".correction");
    card.classList.add(result.is_natural ? "ok" : "fix");
    el.querySelector(".badge").textContent = result.is_natural ? "✓ 자연스러워요" : "✎ 이렇게 고쳐볼까요?";
    el.querySelector(".original").textContent = original;
    el.querySelector(".corrected").textContent = result.corrected;
    el.querySelector(".explanation").textContent = result.explanation;
    el.querySelector(".reply-text").textContent = result.reply;

    const speakBtn = el.querySelector(".speak-btn");
    if ("speechSynthesis" in window) {
      speakBtn.addEventListener("click", () => speak(result.reply, speakBtn));
    } else {
      speakBtn.remove();
    }
    messages.appendChild(el);
  }

  function renderError(text) {
    const el = clone("tpl-error");
    el.querySelector(".bubble").textContent = text;
    messages.appendChild(el);
  }

  function renderAll() {
    messages.innerHTML = "";
    let lastUser = "";
    for (const turn of current()?.history || []) {
      if (turn.role === "user") {
        lastUser = turn.text;
        renderUser(turn.text);
      } else if (turn.result) {
        renderTutor(turn.result, lastUser);
      }
    }
    renderSessions();
    updateView();
    scrollToBottom();
  }

  async function send(text) {
    if (busy || !text.trim()) return;
    busy = true;
    text = text.trim();

    let session = current();
    if (!session) {
      session = newSession(text);
      state.sessions.push(session);
      state.currentId = session.id;
    }
    const context = session.history.map(({ role, text }) => ({ role, text }));
    session.history.push({ role: "user", text });
    session.updatedAt = Date.now();
    save();
    renderUser(text);
    renderSessions();
    input.value = "";
    autosize();
    updateView();

    const thinking = clone("tpl-thinking");
    messages.appendChild(thinking);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: context }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || `서버 오류 (${res.status})`);

      session.history.push({ role: "tutor", text: data.reply, result: data });
      session.updatedAt = Date.now();
      save();
      thinking.remove();
      if (session.id === state.currentId) renderTutor(data, text);
    } catch (err) {
      thinking.remove();
      session.history.pop(); // 실패한 메시지는 맥락에서 제외
      if (!session.history.length) {
        state.sessions = state.sessions.filter((s) => s !== session); // 빈 세션은 목록에서 제거
      }
      save();
      if (session.id === state.currentId) {
        renderError(err.message || "연결에 실패했어요. 다시 시도해 주세요.");
      }
    } finally {
      busy = false;
      renderSessions();
      updateView();
      scrollToBottom();
      syncSendButton();
      input.focus();
    }
  }

  // ---------- 발음 듣기 (TTS) ----------
  function speak(text, btn) {
    const synth = window.speechSynthesis;
    const wasPlaying = btn.classList.contains("playing");
    synth.cancel();
    document.querySelectorAll(".speak-btn.playing").forEach((b) => b.classList.remove("playing"));
    if (wasPlaying) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.95;
    const voice = synth.getVoices().find((v) => v.lang === "en-US");
    if (voice) utter.voice = voice;
    utter.onend = utter.onerror = () => btn.classList.remove("playing");
    btn.classList.add("playing");
    synth.speak(utter);
  }

  // ---------- 음성 입력 (지원 브라우저만) ----------
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (Recognition) {
    const rec = new Recognition();
    rec.lang = "en-US";
    rec.interimResults = true;
    let listening = false;
    micBtn.hidden = false;

    micBtn.addEventListener("click", () => (listening ? rec.stop() : rec.start()));
    rec.onstart = () => { listening = true; micBtn.classList.add("listening"); };
    rec.onend = () => { listening = false; micBtn.classList.remove("listening"); input.focus(); };
    rec.onresult = (e) => {
      input.value = Array.from(e.results).map((r) => r[0].transcript).join("");
      autosize();
      syncSendButton();
    };
  }

  // ---------- 입력창 ----------
  function autosize() {
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }
  function syncSendButton() {
    sendBtn.disabled = busy || !input.value.trim();
  }

  input.addEventListener("input", () => { autosize(); syncSendButton(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send(input.value);
    }
  });
  form.addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });

  $("starters").addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") send(e.target.textContent);
  });

  $("new-chat-btn").addEventListener("click", startNewSession);
  $("topbar-new-btn").addEventListener("click", startNewSession);
  menuBtn.addEventListener("click", () => (sidebar.classList.contains("open") ? closeSidebar() : openSidebar()));
  backdrop.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSidebar(); });

  renderAll();
  input.focus();
})();
