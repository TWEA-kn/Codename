# Pixel Codenames demo

Build scope approved in conversation: a working local demo following design/pixel-mockups-v2, including the latest title and subtitle edits. No hearts or botanical decoration. Keep both teams on the left, board center, game log right.

Implementation plan:
- React/Vite frontend with local persistence for profile, preferences and imported word packs.
- Isolated pure game engine for clue validation, 25 unique words, 9/8/7/1 identities, normal/zero/infinite clue limits, turn switching and win/loss.
- Data-driven word packs: JSON files plus registry, searchable pack picker and text/JSON import. Reject packs with fewer than 25 unique valid words; combine selected packs with global deduplication. Never execute imported content.
- Entry, local room lobby, spymaster and operative views, contextual guide, rules, settings, result modal. Explicit demo view switch; no claim of real network multiplayer.
- Pixel fonts and icon library; generated nine-avatar sprite sheet without hearts/plants.
- Verify engine and word-pack validation with Node tests, production build, browser end-to-end flow and visual inspection.

Important limits: frontend stores identities, so this is not a secure multiplayer implementation. Room codes are local demo identifiers. JSON vocabulary modules can later be loaded by a server without coupling vocabulary to UI or engine.
