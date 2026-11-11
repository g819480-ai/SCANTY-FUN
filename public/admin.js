const $ = id => document.getElementById(id);
const headers = () => ({
  "Content-Type": "application/json",
  "x-admin-password": $("password").value
});
function esc(v) {
  return String(v || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}
/* -------------------------
   Published content
------------------------- */
async function refreshItems() {
  const res = await fetch("/api/catalog");
  const data = await res.json();
  $("adminItems").innerHTML =
    (data.items || []).map(item => `
      <div class="admin-row">
        <span>
          <b>${esc(item.title)}</b>
          <small>${esc(item.type)} · ${esc(item.category)}</small>
        </span>
        <button
          class="watch-btn"
          data-delete="${esc(item.id)}">
          Delete
        </button>
      </div>
    `).join("")
    || "<p>No published items.</p>";
  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("Delete this item?")) return;
      const r = await fetch(
        "/api/admin/items/" + encodeURIComponent(btn.dataset.delete),
        {
          method: "DELETE",
          headers: headers()
        }
      );
      if (!r.ok) {
        alert((await r.json()).error || "Delete failed");
      }
      refreshItems();
    };
  });
}
/* -------------------------
   Manual publishing
------------------------- */
$("adminForm").addEventListener("submit", async e => {
  e.preventDefault();
  const body = Object.fromEntries(
    [
      "type",
      "title",
      "category",
      "description",
      "poster",
      "sourceType",
      "source"
    ].map(k => [k, $(k).value.trim()])
  );
  const res = await fetch("/api/admin/items", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body)
  });
  const data = await res.json();
  $("adminMessage").textContent =
    res.ok
      ? "Published successfully."
      : (data.error || "Could not publish.");
  if (res.ok) {
    $("title").value = "";
    $("source").value = "";
    refreshItems();
  }
});
/* -------------------------
   Add YouTube movie
------------------------- */
async function addMovie(video) {
  const button = document.querySelector(
    `[data-add-movie="${CSS.escape(video.id)}"]`
  );
  if (button) {
    button.disabled = true;
    button.textContent = "Adding...";
  }
  const body = {
    type: "movie",
    title: video.title || "Untitled Movie",
    category: "YouTube",
    description: video.description || "",
    poster: video.thumbnail || "",
    sourceType: "youtube",
    source: video.id
  };
  try {
    const res = await fetch("/api/admin/items", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Could not add movie.");
    }
    if (button) {
      button.textContent = "✓ Added";
      button.disabled = true;
      button.dataset.added = "true";
    }
    await refreshItems();
  } catch (err) {
    if (button) {
      button.disabled = false;
      button.textContent = "+ Add Movie";
    }
    alert(err.message);
  }
}
/* -------------------------
   YouTube search / playlist
------------------------- */
async function yt(path) {
  $("ytResults").innerHTML = "<p>Searching YouTube...</p>";
  try {
    const res = await fetch(path);
    const data = await res.json();
    if (!res.ok) {
      $("ytResults").innerHTML =
        `<p>${esc(data.error || "YouTube request failed.")}</p>`;
      return;
    }
    $("ytResults").innerHTML =
      (data || []).map(v => `
        <div class="admin-row youtube-result">
          <span style="display:flex;gap:12px;align-items:center">
            ${v.thumbnail ? `
              <img
                src="${esc(v.thumbnail)}"
                alt=""
                style="
                  width:110px;
                  height:62px;
                  object-fit:cover;
                  border-radius:6px;
                "
              >
            ` : ""}
            <span>
              <b>${esc(v.title)}</b>
              <small>
                ${esc(v.channel || "YouTube")}
              </small>
              <small>
                ${esc(v.id)}
              </small>
            </span>
          </span>
          <button
            class="watch-btn"
            data-add-movie="${esc(v.id)}">
            + Add Movie
          </button>
        </div>
      `).join("")
      || "<p>No results.</p>";
    document
      .querySelectorAll("[data-add-movie]")
      .forEach(button => {
        const id = button.dataset.addMovie;
        const video = (data || []).find(v => String(v.id) === String(id));
        if (!video) return;
        button.onclick = () => addMovie(video);
      });
  } catch (err) {
    $("ytResults").innerHTML =
      `<p>${esc(err.message || "YouTube request failed.")}</p>`;
  }
}
/* -------------------------
   Search
------------------------- */
$("ytSearchBtn").onclick = () => {
  const q = $("ytSearch").value.trim();
  if (!q) {
    $("ytResults").innerHTML = "<p>Enter a movie name to search.</p>";
    return;
  }
  yt("/api/youtube/search?q=" + encodeURIComponent(q));
};
/* -------------------------
   Playlist
------------------------- */
$("playlistBtn").onclick = () => {
  const id = $("playlistId").value.trim();
  if (!id) {
    $("ytResults").innerHTML = "<p>Enter a playlist ID.</p>";
    return;
  }
  yt("/api/youtube/playlist?id=" + encodeURIComponent(id));
};
refreshItems();
