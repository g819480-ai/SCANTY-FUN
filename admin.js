const $ = id => document.getElementById(id);
const headers = () => ({ "Content-Type":"application/json", "x-admin-password": $("password").value });
async function refreshItems() {
  const res = await fetch("/api/catalog"); const data = await res.json();
  $("adminItems").innerHTML = (data.items || []).map(item => `<div class="admin-row"><span><b>${esc(item.title)}</b><small>${esc(item.type)} · ${esc(item.category)}</small></span><button class="watch-btn" data-delete="${esc(item.id)}">Delete</button></div>`).join("") || "<p>No published items.</p>";
  document.querySelectorAll("[data-delete]").forEach(btn => btn.onclick = async () => {
    if (!confirm("Delete this item?")) return;
    const r = await fetch("/api/admin/items/"+encodeURIComponent(btn.dataset.delete), {method:"DELETE",headers:headers()});
    if (!r.ok) alert((await r.json()).error || "Delete failed"); refreshItems();
  });
}
function esc(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("adminForm").addEventListener("submit", async e => {
  e.preventDefault();
  const body = Object.fromEntries(["type","title","category","description","poster","sourceType","source"].map(k=>[k,$(k).value.trim()]));
  const res = await fetch("/api/admin/items",{method:"POST",headers:headers(),body:JSON.stringify(body)});
  const data = await res.json(); $("adminMessage").textContent = res.ok ? "Published successfully." : (data.error || "Could not publish.");
  if(res.ok){$("title").value="";$("source").value="";refreshItems();}
});
async function yt(path) {
  const res=await fetch(path); const data=await res.json();
  $("ytResults").innerHTML = res.ok ? (data.map(v=>`<div class="admin-row"><span><b>${esc(v.title)}</b><small>${esc(v.channel||"YouTube")} · ${esc(v.id)}</small></span><button class="watch-btn" data-copy="${esc(v.id)}">Copy ID</button></div>`).join("") || "<p>No results.</p>") : `<p>${esc(data.error)}</p>`;
  document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.copy));
}
$("ytSearchBtn").onclick=()=>yt("/api/youtube/search?q="+encodeURIComponent($("ytSearch").value));
$("playlistBtn").onclick=()=>yt("/api/youtube/playlist?id="+encodeURIComponent($("playlistId").value));
refreshItems();