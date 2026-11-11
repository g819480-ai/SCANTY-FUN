# SCANTY FUN

A responsive entertainment hub for Movies, Blender, Music, Comedy, Games and Quizzes.

## Included
- Responsive red/black homepage and mobile navigation
- Movies catalog with Hollywood, Nollywood, Ghanaian, African and Trending category filters
- Dedicated Blender entertainment section (not Blender 3D)
- Music and comedy catalog sections
- Search across published catalog titles and descriptions
- YouTube embedded player, fullscreen support, licensed MP4 and HLS playback
- HLS adaptive playback when supported by the browser
- Admin page for adding/removing titles, posters, categories and playback links
- Server-side YouTube Data API v3 search and playlist lookup (API key is not exposed to visitors)
- Small built-in number guessing game and quiz

## Run locally
1. Install Node.js 20 or newer.
2. Extract the project folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and set:
   - `ADMIN_PASSWORD` to a long, private password
   - `YOUTUBE_API_KEY` to your YouTube Data API v3 key (optional until using YouTube search/playlist tools)
5. Run `npm start`.
6. Open `http://localhost:3000`.
7. Admin page: `http://localhost:3000/admin.html`.

## Deploy
Deploy this folder to a Node.js host. Set `PORT` if required, plus `ADMIN_PASSWORD` and `YOUTUBE_API_KEY` as environment variables. The host must provide persistent writable storage for `data/catalog.json`; on an ephemeral host, use a database or persistent disk before relying on admin changes.

## Content and rights
Only add video URLs you own, are licensed to distribute, or are otherwise authorized to embed/play. YouTube playback uses the official embed player and remains subject to YouTube's terms and each video's embed settings. MP4/HLS sources must be HTTPS and must be authorized. The project does not scrape or bypass paid services, DRM, geo-restrictions, or copyright controls.

## Important production hardening
The included admin password header is a simple starter gate, not a complete multi-user identity system. Before public production, add HTTPS, rate limiting, secure admin sessions, persistent database storage, backups, and stronger access controls. Never put your YouTube API key or admin password in frontend files or commit a real `.env` file.
