# Aswadh Shyma Sajeevan, research website (v3)

Everything the page needs is inside `index.html`: styles, the animation library, the script and every image (embedded as data URIs). It renders completely even when the single file is opened from a download folder. The `assets/img/` folder holds the original image files for reference and future edits.

```
index.html          the whole site
assets/img/         graphical abstracts, journal covers, lab images
.nojekyll           tells GitHub Pages to serve files as they are
README.md
```

To replace an image, drop the new file in `assets/img/` and re-embed it, or simply point the `src` at the file path (`assets/img/name.jpg`) and upload the folder alongside `index.html`.

## Publishing on GitHub Pages

1. Create a public repository named `<username>.github.io`. With your existing GitHub account that is `asajeevan.github.io`, and the site will live at https://asajeevan.github.io, alongside the Cell Current Planner at https://asajeevan.github.io/cell-current-planner/.
2. Upload `index.html`, `README.md`, `.nojekyll` and the whole `assets` folder (drag the folder in; GitHub keeps the structure).
3. Settings, Pages: Source "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
4. The site is live at `https://<username>.github.io` within a couple of minutes.

## Visitor counter

The footer can show a live visitor count. It needs a tiny backend because GitHub Pages is static: the `counter/` folder has a Cloudflare Worker (free) and a step-by-step README. Once deployed, paste the Worker URL into `COUNTER_URL` in `index.html`. Until then the line stays hidden.

## Mobile

Below 900 px the navigation collapses into a menu button with a full-screen list; the hero particle field is switched off on touch devices to save battery; the scroll rail is hidden; diagrams move above their text; tap targets are at least 44 px; a back-to-top button appears after one screen of scrolling; safe-area insets are respected on notched phones; images open in a full-screen viewer that closes on tap outside.

## Printing

The page has a print stylesheet: white background, single column, all expandable sections opened, navigation and buttons hidden. Use the browser's Print, A4 or Letter, and enable "background graphics" so the diagrams keep their fills.

## What is on the page

Hero with an animated cell cross-section and a drifting ion field; About with the development chain; four Featured Research scenes with animated schematics and the graphical abstracts of the related papers; nine additional projects; experience timeline with a location map; a gallery (micro-coaxial battery schematic, IISc thin-film devices, the super-electron-donor graphical abstract, the IISER group photo); publications with journal covers and graphical abstracts; techniques; conferences; awards, mentoring, training and career interests; LinkedIn-only contact.

## Privacy and rights

No CV download, email, phone, address, date of birth, nationality, referees, unpublished conditions or availability claims, per the master content document. Journal cover images belong to the publishers and are shown as small thumbnails linking to the articles; the group photograph shows other people, so check they are comfortable with it being public.

## Pending items

- Project management and risk training: title and year not confirmed, so not listed.
- GFECI 2024 is listed as Dourdan (September 2026 CV). The older CV said Paris.
- When the Small article is online, replace the preprint DOI with the journal DOI and swap the generic Small cover for the issue cover if you want.
