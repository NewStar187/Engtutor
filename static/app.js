(() => {
  const $ = (id) => document.getElementById(id);
  const chat = $("chat");
  const messages = $("messages");
  const empty = $("empty");
  const form = $("composer");
  const input = $("input");
  const sendBtn = $("send-btn");
  const micBtn = $("mic-btn");
  const STORAGE_KEY = "engtutor.conversation";

  // 대화 기록: { role: "user" | "tutor", text, result? }
  let history = load();
  let busy = false;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch { /* 저장 불가 시 무시 */ }
  }

  function clone(id) {
    return $(id).content.firstElementChild.cloneNode(true);
  }

  function scrollToBottom() {
    chat.scrollTop = chat.scrollHeight;
  }

  function updateView() {
    empty.hidden = messages.children.length > 0;
    const results = history.filter((t) => t.role === "tutor" && t.result);
    const total = results.length;
    const natural = results.filter((t) => t.result.is_natural).length;
    $("stats").hidden = total === 0;
    $("stat-total").textContent = total;
    $("stat-rate").textContent = total ? `${Math.round((natural / total) * 100)}%` : "0%";
  }

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
    for (const turn of history) {
      if (turn.role === "user") {
        lastUser = turn.text;
        renderUser(turn.text);
      } else if (turn.result) {
        renderTutor(turn.result, lastUser);
      }
    }
    updateView();
    scrollToBottom();
  }

  async function send(text) {
    if (busy || !text.trim()) return;
    busy = true;
    text = text.trim();

    const context = history.map(({ role, text }) => ({ role, text }));
    history.push({ role: "user", text });
    renderUser(text);
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

      thinking.remove();
      history.push({ role: "tutor", text: data.reply, result: data });
      renderTutor(data, text);
      save();
    } catch (err) {
      thinking.remove();
      history.pop(); // 실패한 메시지는 맥락에서 제외
      renderError(err.message || "연결에 실패했어요. 다시 시도해 주세요.");
    } finally {
      busy = false;
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

  $("reset-btn").addEventListener("click", () => {
    if (history.length && !confirm("대화를 지우고 새로 시작할까요?")) return;
    window.speechSynthesis?.cancel();
    history = [];
    save();
    renderAll();
    input.focus();
  });

  renderAll();
  input.focus();
})();
