PixelBuddy — Kids-friendly Pixel & GIF Studio (Web App)

A PRD for an 11-year-old–ready, AI-assisted pixel art and GIF maker, built for Vercel + Railway.

⸻

1) Goal & Non-Goals

Goal
Help kids (starting ~9–12) create pixel sprites and GIFs fast—even if they can’t draw—by combining a dead-simple editor with AI that respects pixel size & limited palettes.

Non-Goals
	•	Full Photoshop/GIMP replacement
	•	Advanced vector editing
	•	Public social network (can come later as a curated gallery)

⸻

2) Users & Use Cases

Primary user: an 11-year-old making sprites for Scratch/MakeCode/Byju’s/Blockly/Vibe Coding projects.
Secondary users: parents, teachers, hobbyist indie devs.

Top scenarios
	•	“Make a 32×32 slime in 16 colors → tweak a few pixels → export as PNG/GIF.”
	•	“Turn this sketch/photo into an 8-bit sprite with exactly 24 colors.”
	•	“Make a 4-frame walk cycle, reorder frames by drag-drop, export GIF.”

⸻

3) Product Pillars
	1.	Kid-simple UI (minimal, forgiving, keyboard-light)
	2.	AI that fits pixel art (size & palette constraints honored)
	3.	Fast iteration (tabs for multiple images, instant preview, undo/redo)
	4.	Safe & private (COPPA-aware defaults, no public profiles by default)

⸻

4) IA & Navigation
	•	Top bar: Project, New, Open, Size, Colors, AI (prompt + options), Export
	•	Left rail: Tools + 24 fixed “starter” colors (swatch), add custom color
	•	Center: Canvas (pixel grid), zoom, pan
	•	Right rail: Properties (layer toggle—optional), frame controls, history
	•	Bottom (GIF mode): Frame strip (thumbnails), drag-drop reorder, onion-skin toggle

Tabs along the top to switch between multiple open images (each tab = one canvas).

⸻

5) Core Features (Required)

5.1 AI Pixel Image Generation
	•	Prompt box in top bar with:
	•	Mode: From current canvas (image-to-image) or New image
	•	Size selector: common presets (16×16, 24×24, 32×32, 64×64) + custom
	•	Color limit: 2–64; defaults to 24
	•	Seed (advanced) and variations x4
	•	API: Use a backend route that calls an AI image service (e.g., OpenAI Images or a diffusion model) then quantizes to the selected palette size and resizes to target pixels with nearest-neighbor.
	•	Auto-load result directly into the pixel editor of the current/new tab.

Engineering notes:
	•	Enforce pixel size by generating at 4–8× scale then downsample with nearest-neighbor.
	•	Enforce color limit via Median Cut or Wu quantization; add optional Floyd–Steinberg dithering (toggle in Advanced).
	•	For image-to-image: send current canvas (upscaled) as the conditioning image.

5.2 Multi-Image Editing with Tabs
	•	New tab from: Blank, Template, or Clone of Tab N.
	•	“Open in new tab” when generating AI variations.
	•	Tab right-click: Rename, Duplicate, Close (with unsaved warning).

5.3 Size & Color Controls (Top Bar)
	•	Canvas Size dropdown + custom (width × height).
	•	Color Count dropdown (2, 4, 8, 16, 24, 32, 64).
	•	Changing size prompts: resize canvas (with stretch/center/crop options).

5.4 Left Tool Rail (Kid-simple)
	•	Core tools: Pencil, Eraser, Fill (bucket), Color Picker, Line, Rectangle, Circle, Move (nudge), Select (rect), Mirror (H/V), Undo/Redo.
	•	24 “Starter Colors” (fixed palette swatches) + “+” to add custom colors.
	•	Brush size: 1–4 px (radio buttons).
	•	Tooltips with tiny GIF demos (hover).

5.5 AI Command Menu (Top)
	•	Prompt field + checkbox: “Use current image as reference.”
	•	Buttons: Generate, 4 Variations, Enhance Details, Simplify Colors.

5.6 New Window & Load Existing
	•	New Window opens a modal listing all open tabs; pick which to load into the new window’s first tab (helpful for dual-monitor).
	•	Recent files list (local cache) with thumbnails.

5.7 New Blank Page (Transparent by default)
	•	Creates a fully transparent canvas at chosen size.

5.8 Export
	•	PNG (preserves transparency; default for sprites)
	•	JPG (with background color fill if transparent)
	•	GIF (from current frame or multi-frame sequence)
	•	Optional scale export: 1×, 2×, 4× (nearest-neighbor)

5.9 GIF Builder
	•	Shows thumbnails of all open tabs (or frames in current project).
	•	Drag-drop to reorder.
	•	Checkbox per image to include/exclude.
	•	Per-frame delay (ms) + global default.
	•	Preview loop.
	•	Onion-skin (±1 frame) in editor view.

5.10 UI/UX Quality
	•	Large hit targets, high contrast, readable labels.
	•	Undo/redo (100 steps) per tab.
	•	Autosave to local-first storage (IndexedDB).
	•	Simple empty states with “Try a template” CTAs.
	•	Language toggle: English / 한국어.

5.11 Hosting
	•	Frontend: Vercel (Next.js / React + Tailwind)
	•	Backend: Railway (https://aipixelarteditor-production.up.railway.app) for AI proxy, quantization jobs, auth.
	•	Storage: Railway Postgres for projects + R2/Supabase Storage for images.
	•	Cache/Queue: Redis (Railway add-on) for job fan-out & rate limiting.

⸻

6) Nice-to-Have (Recommended)
	•	Beginner/Advanced mode (Advanced exposes layers, dithering, seed).
	•	Templates: characters, items, tiles (16×16 grids), UI icons.
	•	Sprite sheet exporter (grid + JSON metadata).
	•	Layer support (max 3 in Beginner, 8 in Advanced).
	•	Keyboard shortcuts (P, E, G, I, [, ], Z/Y, 1–4 brush).
	•	Magic clean-up (remove stray pixels, smooth outline).
	•	Palette import/export (GPL, Aseprite .gpl).
	•	Reference panel (pin a reference image beside canvas).
	•	Share link (read-only) for classmates/teachers.

⸻

7) Constraints, Risks, Mitigations
	•	AI output is not strict-pixel: Always post-process (quantize + nearest-neighbor downscale).
	•	Palette limits & dithering artifact risk: Offer preview toggle; default dithering off for kids.
	•	API key handling: Never expose user’s OpenAI key in browser; proxied via backend.
	•	COPPA/privacy: No public profiles; minimal PII; parent/teacher account gate for cloud sync.

⸻

8) Detailed UX Spec

8.1 Top Bar (left → right)
	•	Logo (click = Home)
	•	Project (name inline-editable)
	•	New ▼ (Blank, From Template, Import Image, Clone Tab N)
	•	Size (dropdown + custom dialog)
	•	Colors (dropdown: 2/4/8/16/24/32/64)
	•	AI: Prompt [_________]  [☑ Use current image]  (Generate) (Variations)
	•	Export ▼ (PNG, JPG, GIF, Sprite Sheet)
	•	Profile (Sign in / Parent Mode)

8.2 Left Rail
	•	Tools (icons + short labels on hover)
	•	24 color swatches (fixed order) + “+” to add custom; long-press to replace a fixed swatch in the current project palette only (doesn’t change defaults).
	•	Current/secondary color chip.

8.3 Canvas
	•	Pixel grid with crisp nearest-neighbor rendering.
	•	Zoom slider (50–1600%), pan by space+drag.
	•	Selection marquee + move with arrow keys (nudge).

8.4 Right Rail
	•	Frame list (thumbnails) + add/duplicate/delete.
	•	Properties:
	•	Canvas size (info)
	•	Palette count (info)
	•	Dithering (toggle, Advanced)
	•	Onion skin (toggle in GIF mode)
	•	History list (compact).

8.5 Bottom (GIF mode only)
	•	Frames in timeline, drag-drop reorder, per-frame delay input, include checkbox.

⸻

9) Data Model (Cloud)

User {
  id, email (parent/teacher), locale, createdAt
}

Project {
  id, userId, name, createdAt, updatedAt,
  width, height, colorLimit, palette: [rgb...],
  mode: 'beginner'|'advanced',
  frames: [FrameId], activeFrameId
}

Frame {
  id, projectId, index, delayMs, included:boolean,
  layers: [LayerId],
  flattenedPngUrl, // stored artifact for quick load/preview
  rawRleData // compressed pixel data (RLE/PNG)
}

Layer (optional) {
  id, frameId, index, name, visible:boolean, opacity:0-1, data
}

Asset {
  id, userId, type:'upload'|'ai', originalUrl, thumbUrl, meta
}

Local-first: Projects also cached in IndexedDB; server sync is optional.

⸻

10) API Endpoints (Backend on Railway: https://aipixelarteditor-production.up.railway.app)

POST https://aipixelarteditor-production.up.railway.app/api/ai/generate
	•	body: { prompt, mode:'new'|'img2img', width, height, colorLimit, referenceImageId? }
	•	returns: { assetId, pngUrl, palette }
	•	flow: generate → quantize (Median Cut) → nearest-neighbor resize → store.

POST https://aipixelarteditor-production.up.railway.app/api/ai/variations
	•	body: { assetId | imageData, count } → returns array of processed variations.

POST/GET/PATCH https://aipixelarteditor-production.up.railway.app/api/project/*
	•	CRUD with auth.

POST https://aipixelarteditor-production.up.railway.app/api/export/gif
	•	body: { frameIds, delays, loop:boolean } → returns { gifUrl }.

POST https://aipixelarteditor-production.up.railway.app/api/upload
	•	user uploads a PNG/JPG → server quantizes/downscales per current project.

Auth
	•	Email magic link (passwordless) for parents/teachers.
	•	Kids can use anonymous local mode (no server).

Rate limiting
	•	Per user: 60 AI calls/hour; global burst limits.
	•	Redis-based sliding window.

⸻

11) AI Post-Processing (Implementation Notes)
	•	Quantization:
	•	Default: Median Cut (fast, good enough).
	•	Advanced option: Wu (better quality).
	•	Preserve transparency index if present.
	•	Dithering:
	•	Floyd–Steinberg (toggle). Default off for clarity.
	•	Clamp errors to avoid noisy kids’ outputs.
	•	Resize:
	•	Generate at 4–8× target, then downscale with nearest-neighbor (no smoothing).
	•	Ensure pixel-perfect edges (image-rendering: pixelated in CSS).

⸻

12) Accessibility & Localization
	•	WCAG AA contrast; 44px minimum touch targets.
	•	Tooltips + short helper text; mini GIF hints.
	•	English/Korean copy; locale-aware number/date; RTL ready later.
	•	Keyboard access to all core functions.

⸻

13) Safety, Privacy, Compliance
	•	No public profiles by default; sharing uses expiring read-only links.
	•	PII-minimal: only parent/teacher email for cloud sync.
	•	Under-13 use: local-only mode or parent-approved account.
	•	Don’t store raw third-party API keys client-side; keys live on server with per-user usage limits.

⸻

14) Performance
	•	WebAssembly (wasm) for quantization & GIF assembly if needed.
	•	Off-main-thread workers for heavy ops.
	•	Lazy-load AI panel & GIF builder.
	•	Canvas diff-rendering for brushes and selections.

⸻

15) Telemetry (Opt-in)
	•	Anonymous events: feature use (AI gen, export), errors, session length.
	•	No content capture by default; parents can opt-in to save projects to cloud.

⸻

16) Success Metrics
	•	TTFP (time to first pixel) < 10s on low-end laptop.
	•	90%+ of first-time kids export a PNG or GIF within 10 minutes.
	•	<1% AI request error rate (rolling 7-day).
	•	Weekly retention of projects > 35% (classroom pilots).

⸻

17) Rollout Plan

MVP (4–6 weeks)
	•	Pixel editor (tools, 24 colors, size control)
	•	Tabs with multi-image support
	•	AI generation (new & img2img) with quantization & auto-load
	•	GIF builder (thumbnails, drag-drop, include checkbox, per-frame delay)
	•	Export (PNG/JPG/GIF), local autosave
	•	Vercel + Railway deploy, minimal auth (anonymous)

Beta
	•	Beginner/Advanced toggle, dithering option
	•	Templates & sprite-sheet export
	•	Email sign-in for cloud save
	•	Korean localization

v1.0
	•	Classroom mode (teacher org, share links)
	•	Palette import/export
	•	Layer support (simple)

⸻

18) Technical Stack
	•	Frontend: Next.js (App Router), React, Tailwind, Zustand or Redux Toolkit
	•	Canvas: HTML <canvas> + OffscreenCanvas workers; CSS image-rendering: pixelated
	•	GIF: gifuct-js or wasm encoder; fallback server-side assembly for big files
	•	Backend: Node + Fastify (Railway), zod validation, Redis, Postgres
	•	Storage: R2/Supabase (images), Postgres (metadata)
	•	Auth: next-auth (email magic link) or Clerk (parent/teacher only)
	•	CI/CD: GitHub Actions → Vercel/Railway; preview deploys per PR
	•	Monitoring: Sentry (frontend+backend), UptimeRobot

⸻

19) Acceptance Criteria (MVP)
	•	Prompt → AI image generated honoring chosen size & color count, loads into editor within ≤10s on typical connection
	•	Tabs: open/close/duplicate; unsaved-change guard
	•	24 colors always visible; drawing feels instant (≤16ms per stroke frame)
	•	Export: PNG (transparency), JPG (background fill), GIF (loop)
	•	GIF builder shows all open images as thumbnails; supports drag-drop reorder + include checkboxes
	•	New blank page starts fully transparent
	•	New window can load image from any numbered tab
	•	Deployed on Vercel (frontend) + Railway (backend: https://aipixelarteditor-production.up.railway.app) with env-based config
	•	Works on Chrome, Edge, Safari (latest), 13″ laptop at 125% zoom

⸻

20) UI Copy (kid-friendly)
	•	New → Blank: “Start from scratch (透明 background).”
	•	AI Prompt placeholder: “e.g., ‘cute blue slime with big eyes’”
	•	Dithering toggle (Advanced): “Speckle colors to look more retro.”
	•	Undo tip: “Made a oops? Press ⌘Z / Ctrl+Z.”

⸻

21) Open Questions
	•	Do we want layer support in MVP or hold for v1.0?
	•	Should we include community templates or only built-in sets at launch?
	•	Classroom sign-in: parent/teacher email only, or codes per class?

⸻

22) Quick Wireframe (text)

+---------------------------------------------------------------------------------+
| Logo | ProjectName | New | Size [32x32] | Colors [24] | [Prompt_________] [✓ref]|
|          (Generate) (Variations)                         | Export ▼ | Profile   |
+----Tools----+----------------------------Canvas-------------------------+ Frames |
| [Pencil ]   |                                                            | [ + ] |
| [Eraser ]   |                         [PIXEL GRID]                       | [ □ ] |
| [Fill   ]   |                                                            | delay |
| [Picker ]   +------------------------------------------------------------+------+
| [Line   ]   | [24 color swatches .....................]                          |
| [Rect   ]   | [Add color +]                                                      |
| [Circle ]   +--------------------------------------------------------------------+
| [Move   ]   |      GIF timeline (thumbnails) [□ include] [drag to reorder]      |
| [Select ]   +--------------------------------------------------------------------+
| [Mirror ]                                                                        |
| [Undo/Redo]                                                                       |
+----------------------------------------------------------------------------------+


⸻

23) Teacher/Parent Mode (optional beta)
	•	Bulk import student devices (local-only), distribute templates, lock advanced features, collect exports to a shared classroom folder.

⸻

24) Pricing (future)
	•	Free: local-only, limited AI calls/day
	•	Plus: cloud sync, more AI credits, class templates
	•	Classroom: seats, admin controls

⸻

TL;DR for the team

Ship a kid-friendly pixel/GIF studio with AI that respects size & palettes, super-simple tabs and GIF builder, and deploy it on Vercel + Railway. Start small, post-process every AI image (quantize + nearest-neighbor), keep the interface clean, and make exporting painless.

If you want, I can spin up a starter Next.js repo structure (pages, API routes, canvas store, quantization worker) and stub the endpoints next.