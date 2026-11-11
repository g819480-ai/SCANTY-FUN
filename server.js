const express = require("express");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "catalog.json");

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function readCatalog() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return { items: [] }; }
}
function writeCatalog(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function adminOnly(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(503).json({ error: "ADMIN_PASSWORD is not configured on the server." });
  if (req.headers["x-admin-password"] !== expected) return res.status(401).json({ error: "Invalid admin password." });
  next();
}

app.get("/api/catalog", (req, res) => res.json(readCatalog()));

app.post("/api/admin/items", adminOnly, (req, res) => {
  const { type, title, description = "", poster = "", sourceType, source = "", category = "General", featured = false } = req.body || {};
  const allowedTypes = ["movie", "blender", "music", "comedy"];
  if (!allowedTypes.includes(type) || !title || !sourceType || !["youtube", "mp4", "hls"].includes(sourceType)) {
    return res.status(400).json({ error: "Provide a valid type, title and source type." });
  }
  if (sourceType !== "youtube" && !/^https:\/\//i.test(source)) {
    return res.status(400).json({ error: "Video sources must use HTTPS." });
  }
  const data = readCatalog();
  const item = { id: `item-${Date.now()}`, type, title, description, poster, sourceType, source, category, featured: Boolean(featured) };
  data.items.unshift(item);
  writeCatalog(data);
  res.status(201).json(item);
});

app.delete("/api/admin/items/:id", adminOnly, (req, res) => {
  const data = readCatalog();
  const before = data.items.length;
  data.items = data.items.filter(item => item.id !== req.params.id);
  if (data.items.length === before) return res.status(404).json({ error: "Item not found." });
  writeCatalog(data);
  res.json({ ok: true });
});

app.get("/api/youtube/search", async (req, res) => {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(503).json({ error: "YouTube API is not configured. Add YOUTUBE_API_KEY to your environment." });
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Enter a search term." });
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.search = new URLSearchParams({
      part: "snippet", type: "video", maxResults: "12", q, key
    }).toString();
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: payload.error?.message || "YouTube search failed." });
    res.json((payload.items || []).map(v => ({
      id: v.id.videoId, title: v.snippet.title, description: v.snippet.description,
      thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || "",
      channel: v.snippet.channelTitle
    })));
  } catch (error) { res.status(500).json({ error: "Could not reach YouTube." }); }
});

app.get("/api/youtube/playlist", async (req, res) => {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(503).json({ error: "YouTube API is not configured." });
  const playlistId = String(req.query.id || "").trim();
  if (!playlistId) return res.status(400).json({ error: "Playlist ID is required." });
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.search = new URLSearchParams({
      part: "snippet,contentDetails", playlistId, maxResults: "25", key
    }).toString();
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: payload.error?.message || "Playlist request failed." });
    res.json((payload.items || []).map(v => ({
      id: v.contentDetails?.videoId, title: v.snippet?.title,
      description: v.snippet?.description,
      thumbnail: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || ""
    })).filter(v => v.id));
  } catch { res.status(500).json({ error: "Could not load playlist." }); }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`SCANTY FUN running on port ${PORT}`));
