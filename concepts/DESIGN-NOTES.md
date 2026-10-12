# KRO Studios design directions

Live preview path: `https://krostudios.com/concepts/`.

Three working directions share the actual KRO app catalogue: Obsidian Engine, Signal Field, and Future Archive. The direction selector, app selection, screenshots, navigation, motion pause, and outbound promotional links all work. Query parameters `design=engine|signal|archive` and `app=kino|echo|tanakh` select a specific view. Display preferences stay in browser-local storage.

Echo Dare is labelled coming soon, matching the published promotional page. SovietKino and Tanakh links point to their existing promotional pages, where users choose a platform. No fabricated downloads, ratings, or release dates are displayed.

The site uses local fonts and images, vanilla JavaScript, CSS, Canvas2D and a lazily loaded WebGL phone renderer; it requires no build tool or runtime API key. Its demo pages use `noindex,follow`, and the existing root website remains separate. All app screenshots are genuine captures copied from the app projects. Motion respects the OS preference and can be paused.

## Hero artwork

`assets/obsidian-engine.jpg` was created with the built-in image generation tool, not the CLI fallback. The original remains in the task's generated-image directory; this local JPEG is the website copy.

Prompt: Premium photoreal CGI mechanical aperture for KRO Studios: interleaved black ceramic and champagne-gold blades, polished chrome edges, subtle dusty-pink reflected light, a large empty opening, almost black backdrop, square composition, tactile high-detail product lighting. No text, logos, phones, UI, watermark, cyan/purple gamer neon, scenery, random debris, or cheap plastic.

Signal Field artwork is a responsive procedural metallic foil sculpture, not a screenshot or stock photograph. The three app choices morph its silhouette. Future Archive uses a CSS spatial exhibition with authentic screenshots.

Signal Field now integrates the phone at the sculpture's shared origin. Rear and foreground ribbon layers wrap its edges while protecting the app screen. The phone floats gently and supports mouse/touch dragging, arrow-key tilt, Home/Escape reset, and a visible reset control. Pause and reduced-motion preferences stop ambient motion and inertia; direct manual rotation remains available. Animations stop when the scene is hidden or offscreen.

The enlarged Signal Field device is an original procedural 3D iPhone 17 Pro Max-style mockup in Cosmic Orange. Its body follows the 78 × 163.4 × 8.75 mm proportions in [Apple's technical specifications](https://support.apple.com/en-la/125091); the aluminium finish follows [Apple's launch reference](https://www.apple.com/newsroom/2025/09/apple-unveils-iphone-17-pro-and-iphone-17-pro-max/). A continuous rounded body, bevels, black glass, Dynamic Island, side controls and antenna seams are rendered as actual 3D geometry with physically based materials and a studio reflection environment. This is original modelled artwork, not an official Apple render. The desktop body remains 384 px wide versus the earlier 184 px, with a 328 px mobile body scaled down only where the viewport requires it. Genuine app captures retain their original proportions as screen textures. The surrounding foil is 18% larger, with a denser surface, stronger travelling folds and subtle flowing light trails. The existing homepage and app landing pages remain unchanged.

`phone3d.js` uses locally vendored Three.js r180 (MIT licensed; see `vendor/`). It is imported only when Signal Field is opened. It draws on demand from the existing phone interaction controller, which handles drag, inertia, pause, visibility and reduced motion. Foreground ribbons use the OLED plane's projected screen corners rather than a flat DOM rectangle. The previous CSS frame is kept as a usable fallback when WebGL is unavailable; no separate animation loop, hosted model, external HDR image or runtime CDN is required.

## Local preview

From the repository root: `python3 -m http.server 4173 --bind 127.0.0.1`, then open `http://127.0.0.1:4173/concepts/`.
