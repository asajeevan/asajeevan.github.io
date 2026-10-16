# Search engines and sharing: what is in place and how to keep it right

## Built automatically by `tools/build_course.py`

- Every page: keyword title, description, canonical link, Open Graph and Twitter tags with a
  1200x630 share image, citation and Dublin Core tags, and JSON-LD (Article and LearningResource with
  image, datePublished and dateModified, plus a breadcrumb; the hub is a Course).
- Every author entry points at the Person `https://asajeevan.github.io/#person` on the home page.
- The home page JSON-LD (WebSite, ProfilePage, Person, one ScholarlyArticle per published paper) is
  regenerated from the page by `tools/home_seo.py` on every build. Edit the Publications list in
  `index.html` and rebuild; the structured data follows. Manuscripts without a journal and DOI are skipped.
  An embedded video becomes a VideoObject from the `data-video-*` attributes of its `figure.shot.video`
  (id, date, name, description); give a new video the same attributes.
- `sitemap.xml` with each page's real last-change date (`tools/lastmod.json`).
- `404.html` with links to every chapter (not indexed).

## Run by hand when titles, questions or the page list change

```
NODE_PATH=/opt/node22/lib/node_modules node tools/share_images.js   # redraws assets/img/share/*.png
```
The build prints `note: no share image for ...` when a page has none.

## Files at the site root

- `robots.txt` keeps crawlers out of `/src/`, `/docs/`, `/tools/`, `/tests/` and `/counter/`
  (sources and notes that would otherwise compete with the built pages as duplicates).
- `favicon.ico`, `favicon.svg`, `assets/img/apple-touch-icon.png`, `site.webmanifest`: Google shows a
  site's icon beside its results only when the icon is a crawlable file, not a data URI.

## Speed

- Fonts are self-hosted (`assets/css/fonts.css`, `assets/fonts/`, SIL Open Font Licence) instead of
  Google Fonts: no third-party request before first paint, and no visitor data sent to Google.
- Course scripts load with `defer`; order and behaviour are unchanged.
- Home page images are WebP; publication thumbnails are small files and carry the full image in
  `data-full`, which the lightbox in `assets/js/home.js` opens.

## Only the owner can do these (off-site)

1. Google Search Console (already verified): submit `https://asajeevan.github.io/sitemap.xml`, then use
   URL Inspection and "Request indexing" for the home page, `/batteries/` and the main chapters.
2. Bing Webmaster Tools: sign in and choose "Import from Google Search Console". Yahoo and DuckDuckGo
   draw largely on Bing's results, so this reaches them too. (Or paste the `msvalidate.01` tag where the
   comment in `index.html` says.)
3. Links from profiles that search engines already trust: the website field on ORCID, Google Scholar,
   LinkedIn and GitHub (profile README), and the lab or university pages that list you.
4. Share chapters where students and researchers ask questions (LinkedIn posts, course forums,
   Reddit r/batteries or r/electrochemistry, teaching colleagues). Each link now shows its own preview image.
