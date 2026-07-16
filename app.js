
function pageKey(){
  const parts = location.pathname.split("/").filter(Boolean);
  return parts.slice(-2).join("/");
}
const PK = pageKey();
const DEPTH = document.body?.dataset.depth || "";
const idx = window.SEARCH_INDEX || [];
const doneSet = new Set();
idx.forEach(e => {
  const k = "done:" + e.u.split("/").slice(-2).join("/");
  if (localStorage.getItem(k)) doneSet.add(e.u);
});
const HOME_COMMITMENT_KEY = "istqb:home-learning-commitment";
const LESSON_REFLECTION_KEY_PREFIX = "istqb:lesson-reflection:";
const SINGLE_STEP_KEY = "istqb:single-step-mode";
const IS_LOCAL_FILE = location.protocol === "file:";

function getApiBase(){
  if (IS_LOCAL_FILE) return "";
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return location.origin;
  const meta = document.querySelector('meta[name="api-base"]');
  return meta?.content ? meta.content.replace(/\/$/, "") : "";
}

function escHtml(s){
  return String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function sanitizeLearningLabels(){
  if (!document.body) return;
  const oldLabel = ["A", "D", "H", "D"].join("");
  const replacements = [
    [oldLabel + " 友善版", "結構化學習版"],
    [oldLabel + " 友善版面", "結構化學習版面"],
    [oldLabel + " 友善", "結構化學習"],
  ];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    let text = node.nodeValue || "";
    replacements.forEach(([from, to]) => {
      text = text.replaceAll(from, to);
    });
    node.nodeValue = text;
  });
}
sanitizeLearningLabels();
function getLessonSlugFromPath(path){
  const match = String(path || "").match(/u\d{2}/);
  return match ? match[0] : "";
}
function getCurrentLessonEntry(){
  const slug = getLessonSlugFromPath(PK);
  return idx.find(e => e.u.endsWith(slug + ".html")) || null;
}
function getChapterKey(entry){
  const match = String(entry?.b || "").match(/第\d章/);
  return match ? match[0] : "總覽";
}
const CHAPTER_GUIDE = {
  "第1章": {
    title: "測試基礎",
    role: "先建立共同語言：測試、除錯、品質保證、七大原則與測試活動。",
    move: "先用自己的話說出每個名詞差異，再做題目。",
    bridge: "先把名詞和基本觀念穩住，後面才看得懂題目到底在問流程、技術還是管理。",
  },
  "第2章": {
    title: "測試與開發",
    role: "把測試放回開發流程，看懂層級、類型、驗收與敏捷情境。",
    move: "每遇到一題先判斷它問的是流程、層級還是測試類型。",
    bridge: "有了基本語言後，這章把測試放進開發生命週期，讓你知道每種測試出現在什麼位置。",
  },
  "第3章": {
    title: "靜態測試",
    role: "理解不執行程式也能找問題，審查流程和角色很常考。",
    move: "把 Review 的角色、活動、產物拆成一張小表。",
    bridge: "在進入動態測試前，先補上不執行程式也能找缺陷的審查思路。",
  },
  "第4章": {
    title: "動態測試技術",
    role: "這是高分關鍵章：等價劃分、邊界值、決策表、狀態轉換要會套題。",
    move: "少背定義，多做一題並寫出為什麼這樣切資料。",
    bridge: "前面是觀念和流程，這裡開始把需求轉成測試案例，是最需要用題目練手感的一章。",
  },
  "第5章": {
    title: "測試管理",
    role: "看懂風險、估計、排序、監控與工具，不只背流程名。",
    move: "遇到情境題先找限制：時間、風險、資源、回歸範圍。",
    bridge: "技術會解題，管理讓你知道資源不夠時怎麼取捨、排序與回報。",
  },
  "第6章": {
    title: "模擬試題",
    role: "把知識轉成考試反應，重點是錯題回圈而不是一直刷新題。",
    move: "每題先看答案，再寫一句錯因或判斷規則。",
    bridge: "最後把前面所有章節接成考試反應，用錯題反推要回補哪一章。",
  },
  "總覽": {
    title: "總覽",
    role: "先定位本課在整張地圖的位置，再決定今天只做哪一小段。",
    move: "先讀 TL;DR，再做一個最小練習回合。",
    bridge: "先看懂這段在地圖中的位置，再開始讀細節。",
  },
};
function getChapterGuide(entry){
  return CHAPTER_GUIDE[getChapterKey(entry)] || CHAPTER_GUIDE["總覽"];
}
function getLessonNeighbors(entry){
  const index = idx.findIndex(item => item.u === entry?.u);
  return {
    index,
    prev: index > 0 ? idx[index - 1] : null,
    next: index >= 0 && index < idx.length - 1 ? idx[index + 1] : null,
  };
}
function buildLessonFlowHtml(entry){
  const { index, prev, next } = getLessonNeighbors(entry);
  const guide = getChapterGuide(entry);
  const currentNo = index >= 0 ? String(index + 1).padStart(2, "0") : "--";
  const prevHtml = prev ? `
    <a class="lesson-flow-node" href="${DEPTH + escHtml(prev.u)}">
      <span>上一站</span>
      <strong>${escHtml(prev.t)}</strong>
      <small>${escHtml(prev.s || prev.b || "")}</small>
    </a>
  ` : `
    <div class="lesson-flow-node is-static">
      <span>起點</span>
      <strong>先認識整張考試地圖</strong>
      <small>不用急著背，先知道考試怎麼組成。</small>
    </div>
  `;
  const nextHtml = next ? `
    <a class="lesson-flow-node" href="${DEPTH + escHtml(next.u)}">
      <span>下一站</span>
      <strong>${escHtml(next.t)}</strong>
      <small>${escHtml(next.s || next.b || "")}</small>
    </a>
  ` : `
    <div class="lesson-flow-node is-static">
      <span>收束</span>
      <strong>回到錯題與速查表</strong>
      <small>做完模擬題後，回補最常錯的章節。</small>
    </div>
  `;
  return `
    <div class="lesson-flow-bridge">
      ${prevHtml}
      <div class="lesson-flow-current">
        <span>現在</span>
        <strong>${currentNo} · ${escHtml(entry?.t || document.title)}</strong>
        <small>${escHtml(guide.bridge)}</small>
      </div>
      ${nextHtml}
    </div>
  `;
}
function isLessonPage(){
  return !!document.querySelector(".lesson");
}
if (isLessonPage()) document.body?.classList.add("lesson-page");
if (document.getElementById("overallProgress")) document.body?.classList.add("home-page");
(function setupControlBrand(){
  const brand = document.querySelector(".nav .brand");
  if (!brand || brand.querySelector(".control-lockup")) return;
  const target = brand.querySelector("a") || brand;
  target.innerHTML = `
    <span class="control-lockup">
      <span class="control-lockup-main"><b>ISTQB</b><i>/ RADAR</i></span>
      <small>TEST CONTROL</small>
    </span>
  `;
})();
(function normalizeDuplicateIds(){
  const seen = new Map();
  document.querySelectorAll("[id]").forEach(node => {
    const baseId = node.id;
    const count = seen.get(baseId) || 0;
    seen.set(baseId, count + 1);
    if (!count) return;
    let nextId = `${baseId}-${count + 1}`;
    let suffix = count + 1;
    while (document.getElementById(nextId)) nextId = `${baseId}-${++suffix}`;
    node.id = nextId;
  });
})();
function isSingleStepOn(){
  return document.body?.dataset.singleStep === "on";
}
function syncSingleStepUI(){
  const on = isSingleStepOn();
  const btn = document.getElementById("singleStepBtn");
  if (btn) {
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? "✓ 單步中" : "1 單步";
    btn.title = on ? "結束單步模式" : "開啟單步模式";
  }
  const toggle = document.querySelector(".lesson-step-toggle");
  if (toggle) {
    toggle.classList.toggle("is-active", on);
    toggle.setAttribute("aria-pressed", on ? "true" : "false");
    toggle.textContent = on ? "結束單步模式" : "開啟單步模式";
  }
  const state = document.querySelector(".lesson-step-state strong");
  if (state) state.textContent = on ? "已開啟" : "未開啟";
}
function setSingleStep(on){
  if (!isLessonPage()) return;
  document.body.dataset.singleStep = on ? "on" : "off";
  try {
    localStorage.setItem(SINGLE_STEP_KEY, on ? "1" : "0");
  } catch (e) {}
  if (on) {
    document.getElementById("aiPanel")?.classList.remove("open");
    document.getElementById("aiFab")?.classList.remove("hidden");
    document.getElementById("ttsPanel")?.classList.remove("open");
    document.body.classList.remove("ai-open", "tts-open");
  }
  syncSingleStepUI();
}
if (isLessonPage()) {
  try {
    document.body.dataset.singleStep = localStorage.getItem(SINGLE_STEP_KEY) === "1" ? "on" : "off";
  } catch (e) {
    document.body.dataset.singleStep = "off";
  }
}

// Theme
const themeBtn = document.getElementById("themeBtn");
const saved = localStorage.getItem("theme");
document.documentElement.dataset.theme = saved === "light" ? "light" : "dark";
function syncTheme(){
  if (!themeBtn) return;
  const dark = document.documentElement.dataset.theme === "dark";
  themeBtn.textContent = dark ? "LIGHT" : "DARK";
  themeBtn.title = dark ? "切換亮色控制室" : "切換暗色控制室";
}
themeBtn?.addEventListener("click", () => {
  const cur = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = cur;
  localStorage.setItem("theme", cur);
  syncTheme();
});
syncTheme();

// 記錄上次學習時間
function touchPage(){ localStorage.setItem("seen:" + PK, Date.now().toString()); }
if (document.querySelector(".lesson")) touchPage();
try {
  if (document.querySelector(".lesson")) sessionStorage.setItem("istqb:lastLesson", PK);
} catch(e){}

// Checklist
function initChecklist(){
  document.querySelectorAll(".checklist input[type=checkbox], .core-list input[type=checkbox]").forEach(cb => {
    const key = "check:" + PK + ":" + cb.dataset.key;
    if (localStorage.getItem(key) === "1") cb.checked = true;
    cb.addEventListener("change", () => {
      localStorage.setItem(key, cb.checked ? "1" : "0");
      updateLessonProgress();
      markPageDone();
      updateLessonStudyStrip();
    });
  });
  updateLessonProgress();
  markPageDone();
  updateLessonStudyStrip();
}
function updateLessonProgress(){
  const boxes = document.querySelectorAll(".checklist input[type=checkbox]");
  if (!boxes.length) return;
  const done = [...boxes].filter(b => b.checked).length;
  const bar = document.querySelector(".lesson .progress > span");
  const lbl = document.querySelector(".lesson .progress-label");
  if (bar) bar.style.width = (done/boxes.length*100) + "%";
  if (lbl) lbl.textContent = `本課進度 ${done} / ${boxes.length}`;
}
function markPageDone(){
  const boxes = document.querySelectorAll(".checklist input[type=checkbox]");
  if (!boxes.length) return;
  const allDone = [...boxes].every(b => b.checked);
  const key = "done:" + PK;
  if (allDone) {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, new Date().toISOString());
      const today = new Date().toDateString();
      const tk = "today:" + today;
      localStorage.setItem(tk, String((parseInt(localStorage.getItem(tk)||"0"))+1));
    }
    doneSet.add(PK);
  } else {
    localStorage.removeItem(key);
    doneSet.delete(PK);
  }
}
initChecklist();

// Lesson single-step study panel
function getLessonStudyState(){
  const boxes = [...document.querySelectorAll(".checklist input[type=checkbox]")];
  const done = boxes.filter(box => box.checked).length;
  const firstOpen = boxes.find(box => !box.checked) || null;
  const firstText = firstOpen?.closest("label")?.querySelector(".txt")?.textContent?.trim() || "";
  return {
    boxes,
    total: boxes.length,
    done,
    firstOpen,
    firstText,
    nextLink: document.querySelector(".lesson-nav .btn.primary[href]"),
  };
}
function updateLessonStudyStrip(){
  const strip = document.querySelector(".lesson-study-strip");
  if (!strip) return;
  const state = getLessonStudyState();
  const step = strip.querySelector(".lesson-step-num");
  const progress = strip.querySelector(".lesson-step-progress");
  const task = strip.querySelector("[data-lesson-step-task]");
  const caption = strip.querySelector("[data-lesson-step-caption]");
  const primary = strip.querySelector(".lesson-step-primary");
  if (step) step.textContent = state.firstOpen ? String(state.done + 1).padStart(2, "0") : "✓";
  if (progress) progress.textContent = state.total ? `${state.done} / ${state.total} 已完成` : "先讀重點，再做一題";

  let action = "content";
  let taskText = state.firstText || "先讀 TL;DR，再看第一個重點段落";
  let captionText = "今天不用一次讀完全部，先讓一個小回合完整收束。";
  let primaryLabel = "前往內容";
  if (state.firstOpen) {
    action = "checklist";
    taskText = state.firstText;
    captionText = "看完對應段落後，把這一項打勾，最後寫一句自己的整理。";
    primaryLabel = "前往任務";
  } else if (state.nextLink) {
    action = "next";
    taskText = "這課已完成，可以前往下一課";
    captionText = state.nextLink.textContent.trim();
    primaryLabel = "前往下一課";
  }
  if (task) task.textContent = taskText;
  if (caption) caption.textContent = captionText;
  if (primary) {
    primary.textContent = primaryLabel;
    primary.dataset.action = action;
  }
}
function runLessonStepAction(){
  const state = getLessonStudyState();
  const action = document.querySelector(".lesson-step-primary")?.dataset.action || "content";
  if (action === "checklist") {
    document.querySelector(".checklist")?.scrollIntoView({ behavior: "smooth", block: "start" });
    state.firstOpen?.focus({ preventScroll: true });
    return;
  }
  if (action === "next" && state.nextLink) {
    location.href = state.nextLink.href;
    return;
  }
  document.querySelector(".lesson .md-body")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
(function(){
  const lesson = document.querySelector(".lesson");
  if (!lesson || lesson.querySelector(".lesson-study-strip")) return;
  const entry = getCurrentLessonEntry();
  const guide = getChapterGuide(entry);
  const reflectionKey = LESSON_REFLECTION_KEY_PREFIX + PK;
  const strip = document.createElement("section");
  strip.className = "lesson-study-strip";
  strip.innerHTML = `
    <div class="lesson-step-head">
      <div>
        <div class="lesson-step-eyebrow">你的學習節奏</div>
        <h2 class="lesson-step-title">現在只做這一步</h2>
      </div>
      <div class="lesson-step-state">單步模式 <strong>未開啟</strong></div>
    </div>
    <div class="lesson-step-context">
      <div>
        <span>本課位置</span>
        <strong>${escHtml(getChapterKey(entry))} · ${escHtml(guide.title)}</strong>
        <p>${escHtml(guide.role)}</p>
      </div>
      <div>
        <span>讀法提醒</span>
        <strong>先抓考點，再碰細節</strong>
        <p>${escHtml(guide.move)}</p>
      </div>
    </div>
    ${buildLessonFlowHtml(entry)}
    <div class="lesson-step-rhythm" aria-label="本課建議學習流程">
      <span>1. 看全局</span>
      <span>2. 抓考點</span>
      <span>3. 做一題</span>
      <span>4. 寫一句</span>
    </div>
    <div class="lesson-step-next">
      <span class="lesson-step-num">01</span>
      <div class="lesson-step-copy">
        <strong data-lesson-step-task>先讀 TL;DR，再看第一個重點段落</strong>
        <span data-lesson-step-caption>今天不用一次讀完全部，先讓一個小回合完整收束。</span>
      </div>
      <div class="lesson-step-progress">0 / 0 已完成</div>
    </div>
    <div class="lesson-step-actions">
      <button type="button" class="btn primary lesson-step-primary" data-action="content">前往內容</button>
      <button type="button" class="btn lesson-step-toggle" aria-pressed="false">開啟單步模式</button>
    </div>
    <label class="lesson-step-reflection">
      <span>最後 30 秒：用自己的話寫一句</span>
      <textarea data-lesson-reflection rows="2" placeholder="例：這題是在考我分辨 defect、error、failure 的差異。"></textarea>
    </label>
  `;
  strip.querySelector(".lesson-step-primary")?.addEventListener("click", runLessonStepAction);
  strip.querySelector(".lesson-step-toggle")?.addEventListener("click", () => setSingleStep(!isSingleStepOn()));
  const reflection = strip.querySelector("[data-lesson-reflection]");
  if (reflection) {
    try {
      reflection.value = localStorage.getItem(reflectionKey) || "";
    } catch(e){}
    let timer;
    reflection.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(reflectionKey, reflection.value);
        } catch(e){}
      }, 250);
    });
  }
  const anchor = lesson.querySelector(".tldr") || lesson.querySelector(".progress-label");
  if (anchor) anchor.insertAdjacentElement("afterend", strip);
  else lesson.insertAdjacentElement("afterbegin", strip);
  updateLessonStudyStrip();
  syncSingleStepUI();
})();

// Single-step toggle button
(function(){
  if (!isLessonPage()) return;
  const tools = document.querySelector(".nav .tools");
  if (!tools || document.getElementById("singleStepBtn")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "singleStepBtn";
  btn.className = "btn";
  btn.setAttribute("aria-pressed", "false");
  btn.addEventListener("click", () => setSingleStep(!isSingleStepOn()));
  tools.insertBefore(btn, document.getElementById("searchBtn") || tools.firstChild);
  syncSingleStepUI();
})();

// 標記為「不熟」(spaced repetition)
document.getElementById("markWeakBtn")?.addEventListener("click", () => {
  const k = "weak:" + PK;
  if (localStorage.getItem(k)) { localStorage.removeItem(k); alert("已取消標記"); }
  else { localStorage.setItem(k, Date.now().toString()); alert("已標記為「不熟」，3 天後會在首頁提醒複習"); }
});

// Notes
(function(){
  const ta = document.querySelector("textarea[data-note]");
  if (!ta) return;
  const key = "note:" + PK;
  ta.value = localStorage.getItem(key) || "";
  let t;
  ta.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => localStorage.setItem(key, ta.value), 300); });
})();

// Streak
(function(){
  if (!document.querySelector(".lesson")) return;
  const today = new Date().toDateString();
  const last = localStorage.getItem("streak:lastDay");
  let count = parseInt(localStorage.getItem("streak:count")||"0");
  if (last !== today){
    const yest = new Date(Date.now()-86400000).toDateString();
    if (last === yest) count++; else count = 1;
    localStorage.setItem("streak:lastDay", today);
    localStorage.setItem("streak:count", String(count));
  }
})();

// Pomodoro
let timer=null, remain=25*60, running=false;
const timeEl = document.querySelector(".pomo .time");
const playBtn = document.querySelector(".pomo .play");
const resetBtn = document.querySelector(".pomo .reset");
const fmt = s => String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0");
const renderTime = () => { if (timeEl) timeEl.textContent = fmt(remain); };
playBtn?.addEventListener("click", () => {
  running = !running;
  playBtn.textContent = running ? "⏸" : "▶";
  if (running) {
    timer = setInterval(() => {
      remain--;
      if (remain <= 0) { remain=25*60; running=false; playBtn.textContent="▶"; clearInterval(timer); alert("這一輪完成！休息一下吧 ☕"); }
      renderTime();
    }, 1000);
  } else clearInterval(timer);
});
resetBtn?.addEventListener("click", () => { clearInterval(timer); remain=25*60; running=false; if(playBtn) playBtn.textContent="▶"; renderTime(); });
renderTime();

// TOC
(function(){
  const tocNav = document.getElementById("tocNav");
  if (!tocNav) return;
  const heads = document.querySelectorAll(".lesson .md-body h2, .lesson .md-body h3");
  if (!heads.length) { tocNav.parentElement.style.display = "none"; return; }
  const ul = document.createElement("ul");
  const usedIds = new Map();
  heads.forEach((h,i) => {
    const baseId = h.id || "h-" + i;
    const seen = usedIds.get(baseId) || 0;
    usedIds.set(baseId, seen + 1);
    h.id = seen ? `${baseId}-${seen + 1}` : baseId;
    const li = document.createElement("li");
    li.className = h.tagName.toLowerCase();
    const a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    ul.appendChild(li);
  });
  tocNav.appendChild(ul);
  const links = tocNav.querySelectorAll("a");
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id));
      }
    });
  }, { rootMargin: "0px 0px -70% 0px" });
  heads.forEach(h => obs.observe(h));
})();

// 列印按鈕
document.getElementById("printBtn")?.addEventListener("click", () => window.print());

// Progress / cards
(function progress(){
  if (!idx.length) return;
  document.querySelectorAll(".card[data-lesson], .card[href], a[data-lesson] .card").forEach(card => {
    const link = card.matches("a[href]") ? card : card.closest("a[data-lesson], a[href]");
    const u = card.dataset.lesson || link?.dataset.lesson || link?.getAttribute("href");
    if (!u) return;
    const k = "done:" + u.split("/").slice(-2).join("/");
    if (localStorage.getItem(k)) card.classList.add("done");
    // 上次學習時間
    const seen = localStorage.getItem("seen:" + u.split("/").slice(-2).join("/"));
    if (seen) {
      const days = Math.floor((Date.now() - parseInt(seen)) / 86400000);
      const ago = days === 0 ? "今天剛看過" : days === 1 ? "昨天看過" : `${days} 天前看過`;
      const lbl = card.querySelector(".last-seen");
      if (lbl) lbl.textContent = "🕐 " + ago;
    }
  });
  const overall = document.getElementById("overallProgress");
  if (overall) {
    const total = idx.length;
    const done = doneSet.size;
    const pct = total ? Math.round(done/total*100) : 0;
    overall.textContent = `整體進度 ${done} / ${total}（${pct}%）`;
    const bar = document.querySelector(".hero .progress > span");
    if (bar) bar.style.width = pct + "%";
  }
})();

// 倒數計時
(function(){
  const el = document.getElementById("countdown");
  if (!el || !el.dataset.target) return;
  const target = new Date(el.dataset.target);
  const ms = target - new Date();
  const days = Math.ceil(ms / 86400000);
  if (days < 0) {
    el.textContent = "EXAM WINDOW · NEXT DATE NOT SET";
    el.classList.add("is-empty");
    return;
  }
  el.innerHTML = `EXAM WINDOW · <strong>${days}</strong> DAYS`;
  if (days <= 14) el.classList.add("urgent");
})();

// Homepage: personal learning rhythm and exam context
(function(){
  const hero = document.querySelector("main > .hero");
  if (!hero || !document.getElementById("overallProgress") || document.querySelector(".home-personal-loop")) return;
  const chapters = [];
  idx.forEach(entry => {
    const key = getChapterKey(entry);
    let item = chapters.find(chapter => chapter.key === key);
    if (!item) {
      const guide = getChapterGuide(entry);
      item = { key, guide, lessons: [] };
      chapters.push(item);
    }
    item.lessons.push(entry);
  });
  let savedCommitment = "";
  let lastLesson = "";
  try {
    savedCommitment = localStorage.getItem(HOME_COMMITMENT_KEY) || "";
    lastLesson = sessionStorage.getItem("istqb:lastLesson") || "";
  } catch(e){}
  const lastEntry = lastLesson ? idx.find(entry => entry.u.endsWith(lastLesson)) : null;
  const nextEntry = idx.find(entry => !doneSet.has(entry.u)) || idx[0] || null;
  const loop = document.createElement("section");
  loop.className = "home-personal-loop";
  loop.innerHTML = `
    <div class="home-personal-head">
      <div>
        <div class="home-personal-eyebrow">你的學習節奏</div>
        <h2 class="home-personal-title">先看懂脈絡，再做一個小回合</h2>
        <p class="home-personal-intro">ISTQB 很容易變成背名詞。這裡改成先看章節位置，再抓考點，接著做一題，最後用自己的話寫一句整理。</p>
      </div>
      <div class="home-personal-actions">
        ${lastEntry ? `<a class="btn" href="${escHtml(lastEntry.u)}">繼續上次：${escHtml(lastEntry.t)}</a>` : ""}
        ${nextEntry ? `<a class="btn primary" href="${escHtml(nextEntry.u)}">今天只做一課</a>` : ""}
      </div>
    </div>
    <div class="home-personal-steps">
      <div class="home-personal-step">
        <span>01</span>
        <strong>先看全局</strong>
        <p>先知道這課屬於哪一章、考試大概在問什麼，不急著背細節。</p>
      </div>
      <div class="home-personal-step">
        <span>02</span>
        <strong>抓住考點</strong>
        <p>每一段只問一件事：這個概念會怎麼變成選擇題？</p>
      </div>
      <div class="home-personal-step">
        <span>03</span>
        <strong>做一小題</strong>
        <p>先做一題或一個最小例子，讓概念變成判斷動作。</p>
      </div>
      <div class="home-personal-step">
        <span>04</span>
        <strong>寫一句整理</strong>
        <p>用自己的話寫下「這題在考什麼」，比多看三遍更穩。</p>
      </div>
    </div>
    <label class="home-personal-commitment">
      <span>本輪小承諾</span>
      <input type="text" value="${escHtml(savedCommitment)}" placeholder="例：今天只讀單元 10，做一題等價劃分，再寫一句錯因">
    </label>
  `;
  const map = document.createElement("section");
  map.className = "home-context-map";
  map.innerHTML = `
    <div class="home-context-head">
      <div>
        <div class="home-context-eyebrow">考試脈絡</div>
        <h2 class="home-context-title">先知道每一章在幫你補哪種能力</h2>
      </div>
      <span class="home-context-count">${idx.length} 個單元</span>
    </div>
    <div class="home-context-grid">
      ${chapters.map(chapter => {
        const done = chapter.lessons.filter(entry => doneSet.has(entry.u)).length;
        const first = chapter.lessons.find(entry => !doneSet.has(entry.u)) || chapter.lessons[0];
        return `
          <a class="home-context-card" href="${escHtml(first?.u || "#")}">
            <div class="home-context-card-top">
              <span>${escHtml(chapter.key)}</span>
              <em>${done} / ${chapter.lessons.length}</em>
            </div>
            <strong>${escHtml(chapter.guide.title)}</strong>
            <p>${escHtml(chapter.guide.role)}</p>
            <small>${escHtml(chapter.guide.move)}</small>
          </a>
        `;
      }).join("")}
    </div>
  `;
  const story = document.createElement("section");
  story.className = "home-story-flow";
  story.innerHTML = `
    <div class="home-story-head">
      <div>
        <div class="home-story-eyebrow">學習主線</div>
        <h2 class="home-story-title">整張地圖其實是一條線，不是 22 個散點</h2>
        <p class="home-story-intro">先建立測試語言，再放進開發流程，接著學審查與測試技術，最後用管理題和模擬題收束。你每次只需要知道自己正在這條線的哪一段。</p>
      </div>
    </div>
    <div class="home-story-track">
      ${chapters.map((chapter, chapterIndex) => `
        <a class="home-story-node" href="${escHtml(chapter.lessons[0]?.u || "#")}">
          <span>${String(chapterIndex + 1).padStart(2, "0")}</span>
          <strong>${escHtml(chapter.key)} · ${escHtml(chapter.guide.title)}</strong>
          <p>${escHtml(chapter.guide.bridge)}</p>
        </a>
      `).join("")}
    </div>
  `;
  hero.insertAdjacentElement("afterend", map);
  hero.insertAdjacentElement("afterend", story);
  hero.insertAdjacentElement("afterend", loop);
  loop.querySelector(".home-personal-commitment input")?.addEventListener("input", ev => {
    try {
      localStorage.setItem(HOME_COMMITMENT_KEY, ev.currentTarget.value);
    } catch(e){}
  });
})();

// Streak / today / 推薦 / 匯出
(function(){
  const streakNum = document.getElementById("streakNum");
  if (streakNum) {
    const today = new Date().toDateString();
    const last = localStorage.getItem("streak:lastDay");
    let count = parseInt(localStorage.getItem("streak:count")||"0");
    if (last && last !== today) {
      const yest = new Date(Date.now()-86400000).toDateString();
      if (last !== yest) count = 0;
    }
    streakNum.textContent = count;
  }
  const td = document.getElementById("todayDone");
  if (td) {
    const today = new Date().toDateString();
    td.textContent = localStorage.getItem("today:" + today) || "0";
  }

  // 今天學一課（優先選 weak、再選未完成）
  document.getElementById("todayBtn")?.addEventListener("click", () => {
    const weak = idx.filter(e => {
      const k = "weak:" + e.u.split("/").slice(-2).join("/");
      const t = localStorage.getItem(k);
      if (!t) return false;
      const days = (Date.now() - parseInt(t)) / 86400000;
      return days >= 3;
    });
    let pick;
    if (weak.length) {
      pick = weak[Math.floor(Math.random()*weak.length)];
      if (!confirm(`📌 該複習了：\n\n${pick.t}\n${pick.b||""}\n\n（你 3 天前標記為「不熟」）\n\n要開始嗎？`)) return;
    } else {
      const undone = idx.filter(e => !doneSet.has(e.u));
      if (!undone.length) { alert("太強了，全部學完了 🎉"); return; }
      pick = undone[Math.floor(Math.random()*undone.length)];
      if (!confirm(`今天推薦你學：\n\n📘 ${pick.t}\n${pick.b||""}\n\n要開始嗎？`)) return;
    }
    location.href = DEPTH + pick.u;
  });

  // 匯出
  document.getElementById("exportBtn")?.addEventListener("click", () => {
    const lines = ["# 我的學習筆記", "", "匯出時間：" + new Date().toLocaleString("zh-TW"), ""];
    lines.push(`## 📊 學習統計`);
    lines.push(`- 已完成：**${doneSet.size} / ${idx.length}** 課`);
    lines.push(`- 連續學習：**${localStorage.getItem("streak:count")||0}** 天`);
    lines.push("");
    let any = false;
    idx.forEach(e => {
      const pk = e.u.split("/").slice(-2).join("/");
      const done = doneSet.has(e.u);
      const note = localStorage.getItem("note:" + pk) || "";
      if (!done && !note) return;
      any = true;
      lines.push(`### ${done ? "✅" : "📝"} ${e.t}`);
      if (e.b) lines.push(`*${e.b}*`);
      lines.push("");
      if (e.s) { lines.push("> " + e.s); lines.push(""); }
      if (note) { lines.push("**我的筆記：**"); lines.push(""); lines.push(note); lines.push(""); }
    });
    if (!any) lines.push("_還沒有完成的課程或筆記_");
    const blob = new Blob([lines.join("\n")], { type:"text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `學習筆記_${new Date().toISOString().slice(0,10)}.md`;
    a.click();
  });

  // 匯出 Anki
  document.getElementById("ankiBtn")?.addEventListener("click", () => {
    const cards = window.ANKI_CARDS || [];
    if (!cards.length) { alert("這個網站沒有 Anki 卡片資料"); return; }
    const tsv = cards.map(c => `${c.q.replace(/\t/g," ")}\t${c.a.replace(/\t/g," ")}`).join("\n");
    const blob = new Blob([tsv], { type:"text/tab-separated-values;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `anki_cards_${new Date().toISOString().slice(0,10)}.tsv`;
    a.click();
  });
})();

// Quiz 模式
(function(){
  const quizBox = document.getElementById("quizBox");
  if (!quizBox) return;
  const cards = window.QUIZ_CARDS || [];
  if (!cards.length) { quizBox.innerHTML = "<p>沒有測驗資料</p>"; return; }
  let i = 0;
  function shuffledOptions(card) {
    const opts = card.options.map((text, originalIndex) => ({ text, originalIndex }));
    for (let j = opts.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [opts[j], opts[k]] = [opts[k], opts[j]];
    }
    return opts;
  }
  function render() {
    const c = cards[i];
    const opts = shuffledOptions(c);
    const correctIndex = opts.findIndex(o => o.originalIndex === c.answer);
    quizBox.innerHTML = `
      <div class="quiz-card">
        <div style="color:var(--muted);font-size:13px">第 ${i+1} / ${cards.length} 題</div>
        <div class="quiz-q">${c.q}</div>
        <div class="quiz-options">
          ${opts.map((o,j) => `<div class="quiz-option" data-i="${j}">${o.text}</div>`).join("")}
        </div>
        <div class="quiz-feedback" style="display:none"></div>
        <div style="margin-top:14px;display:flex;gap:10px">
          <button class="btn" id="quizPrev">← 上一題</button>
          <button class="btn primary" id="quizNext">下一題 →</button>
        </div>
      </div>`;
    quizBox.querySelectorAll(".quiz-option").forEach(el => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.dataset.i, 10);
        const fb = quizBox.querySelector(".quiz-feedback");
        quizBox.querySelectorAll(".quiz-option").forEach((x,j) => {
          if (j === correctIndex) x.classList.add("correct");
          else if (j === idx) x.classList.add("wrong");
          x.style.pointerEvents = "none";
        });
        fb.style.display = "block";
        fb.innerHTML = `${idx === correctIndex ? "✅ 答對了！" : "❌ 答錯了"}<br>${c.explain || ""}`;
      });
    });
    quizBox.querySelector("#quizPrev").onclick = () => { if (i>0) { i--; render(); } };
    quizBox.querySelector("#quizNext").onclick = () => { if (i<cards.length-1) { i++; render(); } else alert("做完啦 🎉"); };
  }
  render();
})();

// ========= AI 助教浮動聊天 =========
(function(){
  if (!document.getElementById("aiFab")) return;
  const CHAT_API = getApiBase() + '/api/chat';
  const fab = document.getElementById("aiFab");
  const panel = document.getElementById("aiPanel");
  const closeBtn = document.getElementById("aiClose");
  const log = document.getElementById("aiLog");
  const input = document.getElementById("aiInput");
  const sendBtn = document.getElementById("aiSend");
  const copyBtn = document.getElementById("aiCopy");

  // 收集當前頁面內容當 context
  const lessonTitle = document.querySelector(".lesson h1")?.textContent || document.title;
  const breadcrumb = document.querySelector(".lesson > div:first-child")?.textContent?.replace("← 回到目錄 ·","").trim() || "";
  const bodyText = document.querySelector(".md-body")?.innerText?.slice(0, 2500) || "";
  const SITE_NAME = document.querySelector(".brand")?.textContent?.trim() || "學習網站";
  const sysPrompt = `你是一位友善、簡潔的學習教練，使用繁體中文回答。學生正在閱讀「${SITE_NAME}」中的單元：「${lessonTitle}」（${breadcrumb}）。\n\n本課內容摘要：\n${bodyText}\n\n回答原則：\n- 用最白話的方式解釋\n- 優先用條列、表格或範例\n- 如果學生問題和本課無關，也可以回答\n- 保持簡短，重點優先`;
  const localSummary = document.querySelector(".tldr p")?.textContent?.trim()
    || "先掌握定義、差異與題目中的判斷線索。";
  const localTopics = [...document.querySelectorAll(".md-body h2, .md-body h3")]
    .map(node => node.textContent.replace(/[⭐🔊]/g, "").replace(/^\d+\s*/, "").trim())
    .filter((topic, index, list) => topic && list.indexOf(topic) === index)
    .slice(0, 5);
  const localExamNote = [...document.querySelectorAll(".cl-exam")]
    .map(node => node.textContent.replace(/\s+/g, " ").trim())
    .find(Boolean) || "";

  let messages = [];
  function open(){
    panel.classList.add("open");
    fab.classList.add("hidden");
    document.body.classList.add("ai-open");
    document.body.classList.remove("tts-open");
    document.getElementById("ttsPanel")?.classList.remove("open");
    window.__TTS?.stop?.(true);
    setTimeout(()=>input.focus(),200);
  }
  function close(){
    panel.classList.remove("open");
    fab.classList.remove("hidden");
    document.body.classList.remove("ai-open");
  }
  fab.addEventListener("click", open);
  closeBtn.addEventListener("click", close);

  function add(role, text){
    const div = document.createElement("div");
    div.className = "ai-msg ai-" + role;
    div.innerHTML = role === "user" ? esc(text) : renderMd(text);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }
  function esc(s){ return s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function renderMd(s){
    s = esc(s);
    s = s.replace(/```([\s\S]*?)```/g, (_,c)=>`<pre><code>${c}</code></pre>`);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/^### (.+)$/gm, "<h4>$1</h4>");
    s = s.replace(/^## (.+)$/gm, "<h3>$1</h3>");
    s = s.replace(/^(\|.+\|\n)((?:\|[-: ]+)+\|\n)((?:\|.+\|\n?)+)/gm, (_, hdr, _sep, body) => {
      const parse = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const ths = parse(hdr).map(h => `<th>${h}</th>`).join('');
      const trs = body.trim().split('\n').map(r => `<tr>${parse(r).map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
      return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    });
    s = s.replace(/^- (.+)$/gm, "<li>$1</li>");
    s = s.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");
    s = s.replace(/\n\n/g, "<br><br>");
    return s;
  }
  function getLocalExample(){
    const examples = [
      [/邊界/, "例如欄位允許 18–65 歲，二值邊界至少要碰 17、18、65、66；題目在看你有沒有同時測到邊界內外。"],
      [/等價/, "例如年齡限制 18–65，可先切成「小於 18／18–65／大於 65」三個等價類別，再各挑代表值。"],
      [/決策表/, "例如會員與滿額各有真／假兩種狀態，就先列出 2²＝4 種條件組合，再確認每一欄的動作。"],
      [/狀態/, "例如帳號從正常 → 輸錯密碼 → 鎖定；測試重點是合法轉換、非法轉換，以及連續轉換序列。"],
      [/靜態/, "例如需求文件寫著「密碼必須安全」卻沒有可測量條件，審查階段就能直接把這個模糊點當成缺陷提出。"],
      [/風險/, "例如付款失敗機率不高、但影響營收很大，風險值仍然高，測試資源就應優先投入付款流程。"],
      [/覆蓋|白箱/, "例如 if/else 兩條分支都跑過，才算分支覆蓋完整；只跑到每一行，不代表每個判斷結果都測過。"],
      [/驗收|使用者故事/, "例如 Given 已登入、When 送出有效訂單、Then 顯示訂單編號；這樣的驗收條件才明確且可測試。"],
    ];
    return examples.find(([pattern]) => pattern.test(lessonTitle))?.[1]
      || `把「${localSummary}」改寫成一個真實系統情境，再問自己：輸入、狀態、預期結果與風險各是什麼。`;
  }
  function buildLocalCoachReply(question){
    const wantsExample = /例|情境|實際|怎麼用|不懂/.test(question);
    const wantsExam = /考|陷阱|記|重點|必背/.test(question);
    const topics = localTopics.length
      ? localTopics.map(topic => `- ${topic}`).join("\n")
      : "- 定義與核心差異\n- 常考判斷線索";
    const detail = wantsExample
      ? `**先看一個例子**\n${getLocalExample()}`
      : wantsExam && localExamNote
        ? `**考題雷達**\n${localExamNote}`
        : `**這課的主線**\n${localSummary}`;
    return `**LOCAL COACH / 內建課程解析**\n\n**先給結論**\n「${lessonTitle}」不要只背名詞，要練成看到情境就能選出對應測試概念。\n\n${detail}\n\n**掃描清單**\n${topics}\n\n**現在做一個最小回合**\n用一句話回答：「這個方法能找哪一類缺陷，最容易和哪個概念混淆？」`;
  }
  function speakReply(reply){
    if (localStorage.getItem("tts.autoai") !== "1" || !window.__TTS?.speak) return;
    const clean = reply.replace(/```[\s\S]*?```/g, "").replace(/[*`#>_~\-]/g, "");
    window.__TTS.open?.();
    window.__TTS.speak(window.__TTS.splitText(clean), 0, { scope:"ai", title:"AI 教練回覆" });
  }

  async function send(){
    const text = input.value.trim();
    if (!text) return;
    add("user", text);
    messages.push({role:"user", content:text});
    input.value = "";
    sendBtn.disabled = true;
    const thinking = document.createElement("div");
    thinking.className = "ai-msg ai-assistant ai-thinking";
    thinking.textContent = "🤔 思考中…";
    log.appendChild(thinking);
    log.scrollTop = log.scrollHeight;
    if (IS_LOCAL_FILE) {
      await new Promise(resolve => setTimeout(resolve, 420));
      const reply = buildLocalCoachReply(text);
      thinking.remove();
      messages.push({role:"assistant", content:reply});
      add("assistant", reply);
      speakReply(reply);
      sendBtn.disabled = false;
      input.focus();
      return;
    }
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const resp = await fetch(CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          max_tokens: 1024,
          system: sysPrompt,
          messages: messages
        })
      });
      const data = await resp.json();
      thinking.remove();
      if (data.content && data.content[0]) {
        const reply = data.content[0].text;
        messages.push({role:"assistant", content:reply});
        add("assistant", reply);
        speakReply(reply);
      } else {
        add("assistant", "❌ " + (data.error?.message || data.error || "API 回應異常，可改用「複製問題」貼到 Claude/ChatGPT 網頁版"));
      }
    } catch(err) {
      thinking.remove();
      const msg = err.name === 'AbortError' ? '請求逾時（30 秒）' : err.message;
      add("assistant", "🌐 連線失敗：" + msg + "\n\n你可以按「📋 複製到剪貼簿」貼到 Claude/ChatGPT 網頁版繼續問。");
    } finally {
      clearTimeout(timeout);
    }
    sendBtn.disabled = false;
    input.focus();
  }
  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", e => { if (e.key==="Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });

  copyBtn.addEventListener("click", () => {
    const q = input.value.trim() || "請幫我解釋這個單元的重點";
    const full = `我正在學「${lessonTitle}」（${breadcrumb}）。\n\n本課內容：\n${bodyText}\n\n我的問題：${q}`;
    const legacyCopy = () => new Promise((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = full;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy") ? resolve() : reject(new Error("copy failed")); }
      catch (error) { reject(error); }
      ta.remove();
    });
    const copy = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(full).catch(legacyCopy)
      : legacyCopy();
    copy.then(() => {
      copyBtn.textContent = "✅ 已複製！貼到 Claude/ChatGPT";
      setTimeout(()=>copyBtn.textContent = "📋 複製問題到剪貼簿", 2500);
    }).catch(() => {
      copyBtn.textContent = "請手動選取文字複製";
      setTimeout(()=>copyBtn.textContent = "📋 複製問題到剪貼簿", 2500);
    });
  });

  // 預設打招呼
  add("assistant", `嗨！我是這課的 AI 學習教練 👋\n\n你正在學「**${lessonTitle}**」。卡住或想更深入的話，直接問我吧～`);
})();

// Search
(function(){
  const btn = document.getElementById("searchBtn");
  const modal = document.getElementById("searchModal");
  const input = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");
  if (!btn || !modal) return;
  let cursor = 0, current = [];
  function open(){ modal.classList.add("open"); input.value=""; render(""); setTimeout(()=>input.focus(),50); }
  function close(){ modal.classList.remove("open"); }
  function render(q){
    q = q.trim().toLowerCase();
    current = !q ? idx.slice(0, 30) : idx.filter(e => (e.t+" "+(e.b||"")+" "+(e.s||"")).toLowerCase().includes(q)).slice(0, 50);
    cursor = 0;
    if (!current.length) { results.innerHTML = '<div class="search-empty">沒有結果</div>'; return; }
    results.innerHTML = current.map((e,i) =>
      `<a class="search-item${i===0?' active':''}" href="${DEPTH}${e.u}">
         <div class="si-title">${esc(e.t)}</div>
         <div class="si-meta">${esc(e.b||"")}</div>
       </a>`).join("");
  }
  function esc(s){ return (s||"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  btn.addEventListener("click", open);
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  input?.addEventListener("input", e => render(e.target.value));
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); open(); return; }
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowDown") { e.preventDefault(); cursor=Math.min(cursor+1,current.length-1); upd(); }
    if (e.key === "ArrowUp")   { e.preventDefault(); cursor=Math.max(cursor-1,0); upd(); }
    if (e.key === "Enter") { const a = results.querySelectorAll(".search-item")[cursor]; if (a) location.href = a.href; }
  });
  function upd(){
    results.querySelectorAll(".search-item").forEach((el,i) => el.classList.toggle("active", i===cursor));
    const el = results.querySelectorAll(".search-item")[cursor];
    if (el) el.scrollIntoView({ block:"nearest" });
  }
})();

let cloudVoiceNoticeShown = false;
function showCloudVoiceFallbackNotice(){
  if (cloudVoiceNoticeShown) return;
  cloudVoiceNoticeShown = true;
  const notice = document.createElement('div');
  notice.className = 'tts-fallback-notice';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.textContent = '雲端語音暫時無法使用，已切換為裝置內建語音';
  document.body.appendChild(notice);
  setTimeout(() => {
    notice.classList.add('is-hiding');
    setTimeout(() => notice.remove(), 240);
  }, 4200);
}

/* ───────── 🔊 TTS 朗讀（Web Speech API + Azure 自然語音） ───────── */
window.__TTS = (function(){
  if (!('speechSynthesis' in window)) return {};
  const synth = window.speechSynthesis;
  const LS = { rate:'tts.rate', voice:'tts.voice', mode:'tts.mode', azVoice:'tts.azVoice' };
  let voices = [], queue = [], qIdx = 0;
  let azVoices = [], audio = null, audioUrl = '', azAvailable = false;
  let epoch = 0;
  let panel = null;
  let ttsState = 'idle';
  let queueMeta = { scope: 'idle', title: '尚未開始', anchor: null };
  let activeAnchor = null;

  const API_BASE = getApiBase();
  function detectBackend(){
    if (IS_LOCAL_FILE) {
      azAvailable = false;
      try { localStorage.setItem(LS.mode, 'browser'); } catch(e){}
      refreshVoiceList();
      return Promise.resolve();
    }
    return fetch(API_BASE + '/api/health').then(r=>r.json()).then(d => {
      azAvailable = !!(d && d.azure);
      refreshVoiceList();
      if (azAvailable){
        fetch(API_BASE + '/api/voices').then(r=>r.json()).then(list => {
          azVoices = (list||[]).filter(v => /^zh-(TW|CN|HK)/.test(v.locale));
          refreshVoiceList();
        }).catch(()=>{});
      }
    }).catch(()=>{ azAvailable = false; refreshVoiceList(); });
  }
  detectBackend();

  function loadVoices(){
    voices = synth.getVoices().filter(v => /zh|cmn|yue/i.test(v.lang));
    if (!voices.length) voices = synth.getVoices();
    refreshVoiceList();
  }
  loadVoices();
  if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', loadVoices);
  else speechSynthesis.onvoiceschanged = loadVoices;

  function pickVoice(){
    const saved = localStorage.getItem(LS.voice);
    if (saved){ const v = voices.find(x => x.name === saved); if (v) return v; }
    return voices.find(v => /zh-TW|zh_TW|zh-Hant|Taiwan/i.test(v.lang+v.name))
        || voices.find(v => /zh/i.test(v.lang)) || voices[0];
  }
  function getRate(){ return parseFloat(localStorage.getItem(LS.rate) || '1.05'); }
  function getMode(){ return IS_LOCAL_FILE ? 'browser' : (localStorage.getItem(LS.mode) || (azAvailable?'azure':'browser')); }
  function getAzVoice(){ return localStorage.getItem(LS.azVoice) || 'zh-TW-HsiaoChenNeural'; }
  function clearAudio(){
    if (!audio){
      if (audioUrl){ URL.revokeObjectURL(audioUrl); audioUrl = ''; }
      return;
    }
    audio.onended = audio.onerror = audio.onplay = null;
    audio.pause();
    audio.src = '';
    audio = null;
    if (audioUrl){ URL.revokeObjectURL(audioUrl); audioUrl = ''; }
  }
  function headingLabel(heading){
    return Array.from(heading.childNodes || [])
      .map(node => {
        if (node.nodeType === 3) return node.textContent || '';
        if (node.nodeType === 1 && node.classList && node.classList.contains('tts-btn')) return '';
        return node.textContent || '';
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function getSelectedText(){
    return String(window.getSelection?.().toString() || '').replace(/\s+/g, ' ').trim();
  }
  function setActiveAnchor(anchor){
    if (activeAnchor){
      activeAnchor.classList.remove('tts-reading');
      activeAnchor.querySelector('.tts-btn')?.classList.remove('is-reading');
    }
    activeAnchor = anchor || null;
    if (activeAnchor){
      activeAnchor.classList.add('tts-reading');
      activeAnchor.querySelector('.tts-btn')?.classList.add('is-reading');
    }
  }
  function updatePanelStatus(){
    if (!panel) return;
    const source = panel.querySelector('[data-tts-source]');
    const status = panel.querySelector('[data-tts-status]');
    const progress = panel.querySelector('[data-tts-progress]');
    const current = panel.querySelector('[data-tts-current]');
    const prevBtn = panel.querySelector('[data-act="prev"]');
    const nextBtn = panel.querySelector('[data-act="next"]');
    const stopBtn = panel.querySelector('[data-act="stop"]');
    const selectionBtn = panel.querySelector('[data-act="selection"]');

    const statusLabels = {
      idle: '待命中',
      loading: '準備朗讀',
      playing: '朗讀中',
      paused: '已暫停',
    };
    const currentIndex = queue.length ? Math.min(qIdx + 1, queue.length) : 0;
    const done = queue.length && qIdx >= queue.length;
    if (source) source.textContent = queueMeta.title || '尚未開始';
    if (status) status.textContent = statusLabels[ttsState] || '待命中';
    if (progress) progress.textContent = queue.length ? `${currentIndex} / ${queue.length}` : '0 / 0';
    if (current){
      if (done) current.textContent = '這段已朗讀完，可以再播一次，或切去下一段。';
      else if (queue[qIdx]) current.textContent = queue[qIdx];
      else if (getSelectedText()) current.textContent = '已偵測到你選取的文字，可以直接按「✂」朗讀。';
      else current.textContent = '按播放可朗讀目前頁面，或用段落按鈕只讀這一段。';
    }
    if (prevBtn) prevBtn.disabled = !queue.length || qIdx <= 0;
    if (nextBtn) nextBtn.disabled = !queue.length || qIdx >= Math.max(queue.length - 1, 0);
    if (stopBtn) stopBtn.disabled = !queue.length && !(audio && audio.src) && !synth.speaking && !synth.paused;
    if (selectionBtn) selectionBtn.disabled = !getSelectedText();
  }
  function stopAll(resetQueue = false){
    epoch++;
    synth.cancel();
    clearAudio();
    setActiveAnchor(null);
    if (resetQueue){
      queue = [];
      qIdx = 0;
      queueMeta = { scope: 'idle', title: '尚未開始', anchor: null };
    }
    setStatus('idle');
  }
  function speakChunks(chunks, startIdx=0, meta={}){
    stopAll();
    queue = chunks;
    qIdx = startIdx;
    queueMeta = {
      scope: meta.scope || 'page',
      title: meta.title || '整頁內容',
      anchor: meta.anchor || null,
    };
    setActiveAnchor(queueMeta.anchor);
    updatePanelStatus();
    if (!queue.length) return;
    nextChunk();
  }
  async function nextChunk(){
    if (qIdx >= queue.length){ setStatus('idle'); updatePanelStatus(); return; }
    setActiveAnchor(queueMeta.anchor);
    const myEpoch = epoch;
    const text = queue[qIdx];
    if (getMode() === 'azure' && azAvailable){
      try {
        setStatus('loading');
        const ratePct = Math.round((getRate()-1)*100);
        const r = (ratePct>=0?'+':'')+ratePct+'%';
        const resp = await fetch(API_BASE + '/api/tts', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ text, voice:getAzVoice(), rate:r })
        });
        if (epoch !== myEpoch) return;
        if (!resp.ok){ throw new Error('tts '+resp.status); }
        const blob = await resp.blob();
        if (epoch !== myEpoch) return;
        clearAudio();
        audioUrl = URL.createObjectURL(blob);
        audio = new Audio(audioUrl);
        audio.onplay = () => { if (epoch === myEpoch) setStatus('playing'); };
        audio.onended = () => {
          clearAudio();
          if (epoch === myEpoch){ qIdx++; nextChunk(); }
        };
        audio.onerror = () => {
          clearAudio();
          if (epoch === myEpoch){ qIdx++; nextChunk(); }
        };
        const playPromise = audio.play();
        if (playPromise && playPromise.catch){
          playPromise.then(() => {
            if (epoch === myEpoch) setStatus('playing');
          }).catch(err => {
            clearAudio();
            if (epoch !== myEpoch) return;
            console.warn('Azure TTS playback failed, fallback to browser', err);
            browserSpeak(text);
          });
        } else {
          setStatus('playing');
        }
      } catch(e){
        if (epoch !== myEpoch) return;
        console.warn('Azure TTS failed, fallback to browser', e);
        showCloudVoiceFallbackNotice();
        localStorage.setItem(LS.mode,'browser'); browserSpeak(text);
      }
      return;
    }
    browserSpeak(text);
  }
  function browserSpeak(text){
    const myEpoch = epoch;
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(); if (v) u.voice = v;
    u.lang = (v && v.lang) || 'zh-TW';
    u.rate = getRate(); u.pitch = 1;
    u.onend = () => { if (epoch === myEpoch){ qIdx++; nextChunk(); } };
    u.onerror = () => { if (epoch === myEpoch){ qIdx++; nextChunk(); } };
    setStatus('playing');
    synth.speak(u);
  }
  function splitText(text){
    const cleaned = String(text || '')
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
      .replace(/<br\s*\/?>/gi, '，')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!cleaned) return [];

    const lines = cleaned
      .split(/\n+/)
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const chunks = [];
    lines.forEach(line => {
      const parts = line.split(/(?<=[。！？!?；;：:，,、])/).map(s => s.trim()).filter(Boolean);
      if (!parts.length) return;
      let current = '';
      parts.forEach(part => {
        if (!current) { current = part; return; }
        if ((current + part).length > 80){
          chunks.push(current);
          current = part;
        } else current += part;
      });
      if (current) chunks.push(current);
    });
    return chunks;
  }
  function sanitizeReadableText(node){
    const clone = node.cloneNode(true);
    clone.querySelectorAll('button,.tts-btn').forEach(n => n.remove());
    clone.querySelectorAll('table').forEach(table => {
      const rows = Array.from(table.querySelectorAll('tr'));
      if (!rows.length) return;
      const headerRow = rows.find(row => row.querySelector('th'));
      const headers = headerRow
        ? Array.from(headerRow.querySelectorAll('th')).map(cell => (cell.innerText || cell.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
        : [];
      const dataRows = Array.from(table.querySelectorAll('tbody tr')).length
        ? Array.from(table.querySelectorAll('tbody tr'))
        : rows.filter(row => row !== headerRow);
      const summary = document.createElement('div');
      const intro = document.createElement('p');
      intro.textContent = headers.length ? `以下是表格，欄位有：${headers.join('、')}。` : '以下是表格內容。';
      summary.appendChild(intro);
      dataRows.slice(0, 8).forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('th,td'))
          .map(cell => (cell.innerText || cell.textContent || '').replace(/<br\s*\/?>/gi, '，').replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (!cells.length) return;
        const line = cells.map((cell, cellIndex) => {
          const head = headers[cellIndex];
          return head ? `${head}：${cell}` : `第 ${cellIndex + 1} 欄 ${cell}`;
        }).join('，');
        const p = document.createElement('p');
        p.textContent = `第 ${rowIndex + 1} 列，${line}。`;
        summary.appendChild(p);
      });
      if (dataRows.length > 8){
        const rest = document.createElement('p');
        rest.textContent = `後面還有 ${dataRows.length - 8} 列，先略過。`;
        summary.appendChild(rest);
      }
      table.replaceWith(summary);
    });
    clone.querySelectorAll('pre').forEach(pre => {
      const note = document.createElement('p');
      note.textContent = '以下有一段程式碼、表格範例或整理格式，可視需要自行閱讀。';
      pre.replaceWith(note);
    });
    return clone.innerText || clone.textContent || '';
  }
  function getSectionNodes(heading){
    const level = parseInt((heading.tagName || 'H2').slice(1), 10) || 2;
    const nodes = [heading];
    let node = heading.nextElementSibling;
    while (node){
      if (/^H[1-6]$/.test(node.tagName || '')){
        const nextLevel = parseInt(node.tagName.slice(1), 10);
        if (nextLevel <= level) break;
      }
      nodes.push(node);
      node = node.nextElementSibling;
    }
    return nodes;
  }
  function getSectionText(heading){
    const wrap = document.createElement('div');
    getSectionNodes(heading).forEach(node => {
      wrap.appendChild(node.cloneNode(true));
    });
    return splitText(sanitizeReadableText(wrap));
  }
  function getReadableRoot(){
    return document.querySelector('.lesson .md-body')
      || document.querySelector('.md-body')
      || document.querySelector('main');
  }
  function openPanel(){
    panel.classList.add('open');
    document.body.classList.add('tts-open');
    document.body.classList.remove('ai-open');
    document.getElementById('aiPanel')?.classList.remove('open');
    document.getElementById('aiFab')?.classList.remove('hidden');
    updatePanelStatus();
  }

  function injectButtons(){
    document.querySelectorAll('.lesson .md-body h2').forEach(h2 => {
      if (h2.querySelector('.tts-btn')) return;
      const chunks = getSectionText(h2);
      const label = headingLabel(h2);
      if (!chunks.length) return;
      if (chunks.length === 1 && chunks[0] === label) return;
      const b = document.createElement('button');
      b.className = 'tts-btn';
      b.title = '朗讀本段';
      b.setAttribute('aria-label', `朗讀：${h2.textContent.trim()}`);
      b.textContent = '🔊';
      b.onclick = (e) => {
        e.stopPropagation();
        openPanel();
        speakChunks(chunks, 0, { scope:'section', title: label, anchor: h2 });
      };
      h2.appendChild(b);
    });
  }

  panel = document.createElement('div');
  panel.id = 'ttsPanel';
  panel.innerHTML = `
    <div class="tts-meta">
      <div class="tts-meta-copy">
        <strong data-tts-source>尚未開始</strong>
        <span data-tts-status>待命中</span>
      </div>
      <div class="tts-meta-progress" data-tts-progress>0 / 0</div>
    </div>
    <div class="tts-current" data-tts-current>按播放可朗讀目前頁面，或用段落按鈕只讀這一段。</div>
    <div class="tts-controls">
      <button class="tts-ico" data-act="prev" title="上一句">⏮</button>
      <button class="tts-ico" data-act="toggle" title="播放或暫停">▶</button>
      <button class="tts-ico" data-act="next" title="下一句">⏭</button>
      <button class="tts-ico" data-act="stop" title="停止">⏹</button>
      <button class="tts-ico" data-act="selection" title="朗讀選取文字">✂</button>
      <label class="tts-rate">速度<select data-act="rate">
        <option value="0.85">0.85x</option><option value="1">1x</option>
        <option value="1.05">1.05x</option><option value="1.2">1.2x</option>
        <option value="1.4">1.4x</option><option value="1.6">1.6x</option>
      </select></label>
      <select class="tts-voice" data-act="voice"></select>
      <label class="tts-rate"><input type="checkbox" data-act="mode"> Azure 自然</label>
      <label class="tts-rate"><input type="checkbox" data-act="autoai"> AI 朗讀</label>
      <button class="tts-ico" data-act="page" title="朗讀整頁">📖</button>
      <button class="tts-ico" data-act="close" title="收起">✕</button>
    </div>
  `;
  document.body.appendChild(panel);

  function refreshVoiceList(){
    if (!panel) return;
    const sel = panel.querySelector('[data-act="voice"]');
    if (!sel) return;
    sel.innerHTML = '';
    const mode = getMode();
    if (mode === 'azure' && azVoices.length){
      azVoices.forEach(v => {
        const o = document.createElement('option');
        o.value = v.name;
        o.textContent = `${v.display||v.name} · ${v.locale} ${v.gender==='Female'?'♀':'♂'}`;
        sel.appendChild(o);
      });
      sel.value = getAzVoice();
    } else {
      voices.forEach(v => {
        const o = document.createElement('option');
        o.value = v.name; o.textContent = `${v.name} (${v.lang})`;
        sel.appendChild(o);
      });
      const saved = localStorage.getItem(LS.voice);
      if (saved && voices.find(v => v.name === saved)) sel.value = saved;
    }
    panel.querySelector('[data-act="rate"]').value = String(getRate());
    const m = panel.querySelector('[data-act="mode"]');
    if (m){
      m.checked = (mode === 'azure' && azAvailable);
      m.disabled = IS_LOCAL_FILE;
      m.title = IS_LOCAL_FILE
        ? '本機檔案模式會自動使用裝置語音'
        : (azAvailable ? '切換 Azure 自然語音' : '未偵測到語音後端，先使用瀏覽器語音');
    }
    const a = panel.querySelector('[data-act="autoai"]');
    if (a) a.checked = localStorage.getItem('tts.autoai') === '1';
    updatePanelStatus();
  }
  setTimeout(refreshVoiceList, 300);

  function setStatus(s){
    ttsState = s;
    const t = panel.querySelector('[data-act="toggle"]');
    if (t) t.textContent = (s === 'playing' || s === 'loading') ? '⏸' : '▶';
    updatePanelStatus();
  }

  function readWholePage(){
    const all = [];
    const body = getReadableRoot();
    if (body) all.push(...splitText(sanitizeReadableText(body)));
    const title = document.querySelector('.lesson h1')?.textContent?.trim() || document.title || '整頁內容';
    if (all.length){
      openPanel();
      speakChunks(all, 0, { scope:'page', title });
    }
  }
  function readSelection(){
    const selected = getSelectedText();
    if (!selected){
      queueMeta = { scope: 'selection', title: '選取文字', anchor: null };
      setStatus('idle');
      updatePanelStatus();
      return;
    }
    openPanel();
    speakChunks(splitText(selected), 0, { scope:'selection', title:'你選取的文字' });
  }
  panel.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
    if (act === 'toggle'){
      if (audio && !audio.paused){ audio.pause(); setStatus('paused'); return; }
      if (audio && audio.paused && audio.src){ audio.play(); setStatus('playing'); return; }
      if (synth.paused){ synth.resume(); setStatus('playing'); return; }
      if (synth.speaking){ synth.pause(); setStatus('paused'); return; }
      if (queue.length && qIdx < queue.length){ nextChunk(); return; }
      readWholePage();
      return;
    }
    if (act === 'next'){ stopAll(); qIdx = Math.min(queue.length, qIdx+1); nextChunk(); }
    else if (act === 'prev'){ stopAll(); qIdx = Math.max(0, qIdx-1); nextChunk(); }
    else if (act === 'stop'){ stopAll(true); }
    else if (act === 'selection'){ readSelection(); }
    else if (act === 'page'){ readWholePage(); }
    else if (act === 'close'){
      stopAll(true);
      panel.classList.remove('open');
      document.body.classList.remove('tts-open');
    }
  });
  function restartFromCurrent(){
    const playing = (audio && audio.src) || synth.speaking || synth.paused;
    if (!playing || !queue.length) return;
    stopAll();
    nextChunk();
  }
  panel.addEventListener('change', (e) => {
    const act = e.target.dataset.act;
    if (act === 'rate'){
      localStorage.setItem(LS.rate, e.target.value);
      restartFromCurrent();
    } else if (act === 'voice'){
      if (getMode()==='azure') localStorage.setItem(LS.azVoice, e.target.value);
      else localStorage.setItem(LS.voice, e.target.value);
      restartFromCurrent();
    } else if (act === 'mode'){
      if (e.target.checked && !azAvailable){
        detectBackend().then(()=>{
          if (!azAvailable){
            alert(`無法連到語音後端\n\n目前設定的 API 位址：${API_BASE || '(未設定)'}\n請確認後端已啟動，或檢查 meta[name="api-base"] 是否正確。`);
            e.target.checked = false;
            localStorage.setItem(LS.mode, 'browser');
          } else {
            localStorage.setItem(LS.mode, 'azure');
            refreshVoiceList();
            restartFromCurrent();
          }
        });
        return;
      }
      localStorage.setItem(LS.mode, e.target.checked ? 'azure' : 'browser');
      refreshVoiceList();
      restartFromCurrent();
    } else if (act === 'autoai'){
      localStorage.setItem('tts.autoai', e.target.checked ? '1' : '0');
    }
  });

  const fab = document.createElement('button');
  fab.id = 'ttsFab';
  fab.title = '朗讀工具';
  fab.setAttribute('aria-label', '打開朗讀工具');
  fab.textContent = '🔊';
  fab.onclick = () => {
    const opening = !panel.classList.contains('open');
    panel.classList.toggle('open', opening);
    document.body.classList.toggle('tts-open', opening);
    if (opening) {
      document.body.classList.remove('ai-open');
      document.getElementById('aiPanel')?.classList.remove('open');
      document.getElementById('aiFab')?.classList.remove('hidden');
    }
    updatePanelStatus();
  };
  document.body.appendChild(fab);

  document.addEventListener('selectionchange', updatePanelStatus);
  window.addEventListener('beforeunload', () => { synth.cancel(); clearAudio(); });

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', injectButtons);
  else injectButtons();

  updatePanelStatus();
  return { speak: speakChunks, splitText, stop: stopAll, open: openPanel };
})();
