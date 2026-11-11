const grid = document.getElementById("catalogGrid");
const empty = document.getElementById("emptyState");
const modal = document.getElementById("playerModal");
const playerMount = document.getElementById("playerMount");
let catalog = [];
let currentView = "home";
let currentCategory = "All";
let query = "";

const typeLabels = { movie: "MOVIE", blender: "BLENDER", music: "MUSIC", comedy: "COMEDY" };
const safe = value => String(value || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

async function loadCatalog() {
  try {
    const response = await fetch("/api/catalog");
    const data = await response.json();
    catalog = data.items || [];
  } catch { catalog = []; }
  render();
}
function getVisibleItems() {
  return catalog.filter(item => {
    const typeMatch = currentView === "home" || item.type === currentView;
    const catMatch = currentCategory === "All" || item.category?.toLowerCase() === currentCategory.toLowerCase();
    const text = `${item.title} ${item.description} ${item.category}`.toLowerCase();
    return typeMatch && catMatch && (!query || text.includes(query.toLowerCase()));
  });
}
function render() {
  const titles = {home:"Featured for you",movie:"Movies",blender:"Blender",music:"Music",comedy:"Comedy"};
  document.getElementById("sectionTitle").textContent = titles[currentView] || "Featured for you";
  const items = getVisibleItems();
  document.getElementById("resultCount").textContent = `${items.length} TITLES`;
  grid.innerHTML = items.map(item => `
    <article class="media-card">
      <div class="poster">${item.poster ? `<img loading="lazy" src="${safe(item.poster)}" alt="${safe(item.title)} poster">` : `<span class="poster-placeholder">SF</span>`}
        <span class="type-tag">${safe(typeLabels[item.type] || item.type)}</span></div>
      <div class="card-body"><h3 title="${safe(item.title)}">${safe(item.title)}</h3>
        <p>${safe(item.description)}</p>
        <div class="card-foot"><span class="category">${safe(item.category || "General")}</span>
          <button class="watch-btn" data-play="${safe(item.id)}">▶ WATCH</button></div>
      </div>
    </article>`).join("");
  empty.hidden = items.length !== 0;
  grid.querySelectorAll("[data-play]").forEach(btn => btn.addEventListener("click", () => playItem(btn.dataset.play)));
}
function openPlayer(title, sourceType, source) {
  playerMount.innerHTML = "";
  document.getElementById("playerCaption").textContent = title;
  if (sourceType === "youtube") {
    const id = extractYouTubeId(source);
    if (!id) { playerMount.innerHTML = "<p>That YouTube link or video ID is not valid.</p>"; }
    else {
      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      playerMount.appendChild(frame);
    }
  } else {
    const video = document.createElement("video");
    video.controls = true; video.autoplay = true; video.playsInline = true;
    playerMount.appendChild(video);
    if (sourceType === "hls" && window.Hls && Hls.isSupported()) {
      const hls = new Hls(); hls.loadSource(source); hls.attachMedia(video);
      modal.dataset.hls = "1"; modal._hls = hls;
    } else { video.src = source; }
  }
  modal.classList.add("open"); modal.setAttribute("aria-hidden", "false");
}
function extractYouTubeId(value) {
  const s = String(value || "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try { const u = new URL(s); if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0]; return u.searchParams.get("v") || u.pathname.match(/\/embed\/([\w-]+)/)?.[1] || null; } catch { return null; }
}
function playItem(id) {
  const item = catalog.find(x => x.id === id);
  if (item) openPlayer(item.title, item.sourceType, item.source);
}
function setView(view) {
  currentView = view; currentCategory = "All"; query = "";
  document.getElementById("siteSearch").value = "";
  document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  document.getElementById("categoryChips").style.display = ["movie","home"].includes(view) ? "flex" : "none";
  document.getElementById("hero").style.display = view === "home" ? "block" : "none";
  document.getElementById("playArea").hidden = !["games","quizzes"].includes(view);
  document.getElementById("catalogSection").style.display = ["games","quizzes"].includes(view) ? "none" : "block";
  if (view === "games") showGame();
  if (view === "quizzes") showQuiz();
  render();
  window.scrollTo({top: view === "home" ? 0 : document.getElementById("catalogSection").offsetTop - 80, behavior:"smooth"});
}
document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => { setView(b.dataset.view); document.getElementById("mainNav").classList.remove("open"); }));
document.querySelectorAll("[data-jump]").forEach(b => b.addEventListener("click", () => setView(b.dataset.jump)));
document.getElementById("menuToggle").addEventListener("click", () => document.getElementById("mainNav").classList.toggle("open"));
document.getElementById("searchBtn").addEventListener("click", () => { query = document.getElementById("siteSearch").value.trim(); render(); });
document.getElementById("siteSearch").addEventListener("keydown", e => { if(e.key === "Enter") { query = e.target.value.trim(); render(); } });
document.querySelectorAll("[data-category]").forEach(b => b.addEventListener("click", () => {
  currentCategory = b.dataset.category;
  document.querySelectorAll("[data-category]").forEach(x => x.classList.toggle("selected", x === b));
  render();
}));
function closePlayer() {
  if (modal._hls) { modal._hls.destroy(); modal._hls = null; }
  playerMount.innerHTML = ""; modal.classList.remove("open"); modal.setAttribute("aria-hidden","true");
}
document.getElementById("closePlayer").addEventListener("click", closePlayer);
modal.addEventListener("click", e => { if (e.target === modal) closePlayer(); });
document.addEventListener("keydown", e => { if(e.key === "Escape") closePlayer(); });

function showGame() {
  document.getElementById("miniTitle").textContent = "Quick game: Guess the number";
  const box = document.getElementById("miniContent");
  const answer = Math.floor(Math.random()*10)+1;
  box.innerHTML = `<h3>I'm thinking of a number from 1 to 10.</h3><p>Take a guess and see if you can get it right.</p><input id="guessInput" type="number" min="1" max="10" placeholder="Your number" style="padding:11px;background:#09090d;border:1px solid #ffffff30;color:white;border-radius:7px;width:140px"><button class="btn btn-primary" id="guessBtn">Check</button><p id="guessResult"></p>`;
  document.getElementById("guessBtn").onclick = () => {
    const n = Number(document.getElementById("guessInput").value);
    document.getElementById("guessResult").textContent = n === answer ? "Correct! You got it 🎉" : (n < answer ? "Try a higher number." : "Try a lower number.");
  };
}
function showQuiz() {
  document.getElementById("miniTitle").textContent = "Entertainment quiz";
  const box = document.getElementById("miniContent");
  box.innerHTML = `<h3>Which format is commonly used for a YouTube video ID?</h3><div><button class="mini-option" data-answer="wrong">A. 4-digit PIN</button><button class="mini-option" data-answer="right">B. 11-character ID</button><button class="mini-option" data-answer="wrong">C. Email address</button></div><p id="quizResult"></p>`;
  box.querySelectorAll("[data-answer]").forEach(b => b.onclick = () => document.getElementById("quizResult").textContent = b.dataset.answer === "right" ? "Correct! 🎉" : "Not quite — try again.");
}
document.getElementById("year").textContent = new Date().getFullYear();
loadCatalog();
