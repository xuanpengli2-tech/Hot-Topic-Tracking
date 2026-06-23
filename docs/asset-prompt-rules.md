# BS Asset Prompt Rules

These rules define how trend cards should generate AI image prompts for Bloodstrike-style resources.

Use only these four resource directions in trend cards:

- character skin
- weapon skin
- emote
- finisher

## Core Principle

Trend adaptation does not mean forcing every meme into a purely hard-surface military skin. Match the visual treatment to the meme:

- Cute animal or cartoon memes can become cute, humorous, stylized skins.
- Fashion, music, sports, festival, and local culture trends can become cooler premium sci-fi skins.
- Dark anime or street aesthetics can be dramatic, but must not become horror.

The final result must still feel like a Bloodstrike game asset: polished, readable, tactical, high-quality, and suitable for a shooter.

## Hard Limits

Every role/weapon prompt should avoid:

- ugly, scary, horror, gore, rotten, disgusting, gross, body horror
- Cthulhu, tentacles, cult symbols, eldritch monsters
- dirty organic flesh, exposed teeth, mouth-shaped gun parts, wet creature skin
- copyrighted logos, real team marks, real artist likeness, existing toy/IP duplication
- shapes that break the weapon silhouette or make the asset unreadable in mobile UI

## Weapon Skin Prompt Pattern

Weapon prompts should be more than a flat decal idea. They can use more than one view. Prefer:

- main side-on full weapon render
- 2-4 small detail callouts: receiver, barrel, magazine, muzzle VFX, material panel, inspection animation frame
- dark blue/black studio background
- realistic weapon base with premium stylized overlays
- clear material language: PBR gunmetal, enamel, chrome, carbon fiber, glass, resin, leather, fabric insert
- readable silhouette, decorative panels, decals, energy inlays, charms, animated VFX hints
- 3D geometry changes such as raised armor shells, transparent core windows, animated rails, custom magazine, reactive muzzle, kill effect, reload effect, or inspect animation

For cute memes, allow:

- rounded mascot decals
- toy-like mascot parts integrated as clean accessories or micro 3D badges
- soft color accents
- cute cartoon stickers
- playful muzzle or reload VFX

But keep the gun clean, premium, and game-ready.

## Character Skin Prompt Pattern

Character prompts should use:

- two full-body character views only: front view and back view on one clean concept-art canvas
- no auxiliary detail panels, no UI labels, no text blocks, no material swatch boxes, no cropped close-ups
- tactical silhouette first, trend details second
- stylized but polished materials
- build on the existing Bloodstrike base character skeleton and original skin proportions first, then add theme-specific armor, clothing, accessories, VFX, and material changes
- avoid changing the character into a completely different creature or mascot unless the request is explicitly for a companion/mascot asset
- use one strong silhouette idea, one dominant material family, one accent color family, and one memorable motif from the trend
- make the outfit bolder than a basic tactical suit, but keep the visual hierarchy clean and readable
- avoid scattering many tiny references across gloves, backpacks, knees, charms, patches, and shoes at the same time
- prefer premium fashion/game-skin composition: large readable clothing shape, controlled ornament, refined trim, clear face/helmet area, strong back silhouette

Cute or humorous character skins are allowed, such as shark, duck, capybara, or mascot-inspired skins, as long as they are not childish pajamas and still fit a shooter. Add enough gear structure so the skin feels like combat equipment, not cosplay clothing only.

## Emote / Finisher Pattern

Emotes and finishers can carry more direct meme energy than weapon and character skins:

- emotes can be funnier, more exaggerated, and more cartoon
- finishers mean the short execution sequence after the player knocks down an enemy
- finishers should turn the meme into a readable 2-4 second combat beat after knockdown
- finishers can use VFX, camera cuts, impact frames, or a short prop/mascot appearance
- finishers must avoid gore and horror even when the meme is dark

Still avoid horror, disgust, real logos, and copied IP.

## Prompt Quality Checklist

Before adding a prompt, check:

- Does someone understand the asset type immediately?
- Is it attractive rather than just accurate to the meme?
- Does the meme element feel intentional, not pasted randomly?
- Does it keep BS's premium shooter style?
- Would it still look good as a store thumbnail?
- Does it include negative constraints when a meme could become ugly or organic?
