
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

function validAdmin(request, env) {
  const expected = env.ADMIN_PASSWORD;
  const supplied = request.headers.get("x-admin-password") || "";

  return Boolean(expected && supplied && supplied === expected);
}

async function youtubeSearch(url, env) {
  if (!env.YOUTUBE_API_KEY) {
    return json({ error: "YouTube API key is not configured." }, 503);
  }

  const q = (url.searchParams.get("q") || "").trim();

  if (!q) {
    return json({ error: "Enter a search term." }, 400);
  }

  const api = new URL("https://www.googleapis.com/youtube/v3/search");

  api.search = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "12",
    q,
    key: env.YOUTUBE_API_KEY
  });

  const response = await fetch(api);
  const data = await response.json();

  if (!response.ok) {
    return json({
      error: data.error?.message || "YouTube search failed."
    }, response.status);
  }

  return json(
    (data.items || []).map(v => ({
      id: v.id.videoId,
      title: v.snippet.title,
      description: v.snippet.description,
      thumbnail:
        v.snippet.thumbnails?.high?.url ||
        v.snippet.thumbnails?.medium?.url ||
        "",
      channel: v.snippet.channelTitle
    }))
  );
}

async function youtubePlaylist(url, env) {
  if (!env.YOUTUBE_API_KEY) {
    return json({ error: "YouTube API key is not configured." }, 503);
  }

  const id = (url.searchParams.get("id") || "").trim();

  if (!id) {
    return json({ error: "Playlist ID is required." }, 400);
  }

  const api = new URL(
    "https://www.googleapis.com/youtube/v3/playlistItems"
  );

  api.search = new URLSearchParams({
    part: "snippet,contentDetails",
    playlistId: id,
    maxResults: "25",
    key: env.YOUTUBE_API_KEY
  });

  const response = await fetch(api);
  const data = await response.json();

  if (!response.ok) {
    return json({
      error: data.error?.message || "Playlist request failed."
    }, response.status);
  }

  return json(
    (data.items || [])
      .map(v => ({
        id: v.contentDetails?.videoId,
        title: v.snippet?.title,
        description: v.snippet?.description,
        thumbnail:
          v.snippet?.thumbnails?.high?.url ||
          v.snippet?.thumbnails?.medium?.url ||
          ""
      }))
      .filter(v => v.id)
  );
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Worker health check
  if (path === "/api/health" && method === "GET") {
    return json({
      ok: true,
      service: "SCANTY FUN Worker",
      database: Boolean(env.DB)
    });
  }

  // All other API routes require the D1 binding
  if (!env.DB) {
    return json({
      error: "D1 database is not connected."
    }, 503);
  }

  // Get catalog
  if (path === "/api/catalog" && method === "GET") {
    const result = await env.DB.prepare(
      "SELECT * FROM catalog_items ORDER BY created_at DESC"
    ).all();

    const items = (result.results || []).map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      poster: item.poster,
      sourceType: item.source_type,
      source: item.source,
      category: item.category,
      featured: Boolean(item.featured),
      createdAt: item.created_at
    }));

    return json({ items });
  }

  // Publish catalog item
  if (path === "/api/admin/items" && method === "POST") {
    if (!validAdmin(request, env)) {
      return json({
        error: "Invalid admin password."
      }, 401);
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json({
        error: "Invalid JSON body."
      }, 400);
    }

    const {
      type,
      title,
      description = "",
      poster = "",
      sourceType,
      source = "",
      category = "General",
      featured = false
    } = body || {};

    const allowedTypes = [
      "movie",
      "blender",
      "music",
      "comedy"
    ];

    const allowedSources = [
      "youtube",
      "mp4",
      "hls"
    ];

    if (
      !allowedTypes.includes(type) ||
      !String(title || "").trim() ||
      !allowedSources.includes(sourceType) ||
      !String(source || "").trim()
    ) {
      return json({
        error: "Provide a valid type, title, source type and source."
      }, 400);
    }

    if (
      sourceType !== "youtube" &&
      !/^https:\/\//i.test(source)
    ) {
      return json({
        error: "Video sources must use HTTPS."
      }, 400);
    }

    const id = crypto.randomUUID();
    const cleanTitle = String(title).trim();
    const cleanDescription = String(description || "");
    const cleanPoster = String(poster || "");
    const cleanSource = String(source).trim();
    const cleanCategory = String(category || "General").trim();

    await env.DB.prepare(`
      INSERT INTO catalog_items
      (
        id,
        type,
        title,
        description,
        poster,
        source_type,
        source,
        category,
        featured
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      type,
      cleanTitle,
      cleanDescription,
      cleanPoster,
      sourceType,
      cleanSource,
      cleanCategory || "General",
      featured ? 1 : 0
    ).run();

    return json({
      id,
      type,
      title: cleanTitle,
      description: cleanDescription,
      poster: cleanPoster,
      sourceType,
      source: cleanSource,
      category: cleanCategory || "General",
      featured: Boolean(featured)
    }, 201);
  }

  // Delete catalog item
  if (
    path.startsWith("/api/admin/items/") &&
    method === "DELETE"
  ) {
    if (!validAdmin(request, env)) {
      return json({
        error: "Invalid admin password."
      }, 401);
    }

    const id = decodeURIComponent(
      path.split("/").pop()
    );

    const result = await env.DB.prepare(
      "DELETE FROM catalog_items WHERE id = ?"
    ).bind(id).run();

    if (!result.meta?.changes) {
      return json({
        error: "Item not found."
      }, 404);
    }

    return json({ ok: true });
  }

  // YouTube search
  if (
    path === "/api/youtube/search" &&
    method === "GET"
  ) {
    return youtubeSearch(url, env);
  }

  // YouTube playlist
  if (
    path === "/api/youtube/playlist" &&
    method === "GET"
  ) {
    return youtubePlaylist(url, env);
  }

  return json({
    error: "API route not found."
  }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env);
      } catch (error) {
        console.error(
          "SCANTY FUN API error:",
          error
        );

        return json({
          error: "Server error. Check Worker logs."
        }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
