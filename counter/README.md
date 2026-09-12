# Visitor counter, setup in about ten minutes

The site is static, so the number has to live somewhere else. This uses a Cloudflare Worker with a KV store: free, no credit card, no database to run, and the count belongs to you.

## 1. Create the store
1. Sign up at https://dash.cloudflare.com (free plan).
2. Left menu: Storage & Databases, KV. Create a namespace called `VISITS`.

## 2. Create the Worker
1. Left menu: Compute (Workers), Create, then "Start with Hello World", name it `visitor-counter`, Deploy.
2. Open the Worker, Edit code, replace everything with the contents of `worker.js`, Deploy.
3. Settings, Bindings, Add: KV namespace, variable name `VISITS`, select the `VISITS` namespace.
4. Settings, Variables and Secrets, Add: name `ALLOWED_ORIGIN`, value `https://<username>.github.io` (no trailing slash). Deploy.
5. Copy the Worker URL, it looks like `https://visitor-counter.<account>.workers.dev`.

Test it: open `<worker url>/count` in a browser. You should see `{"count":0}`.

## 3. Connect the site
In `index.html`, find the line

    var COUNTER_URL = '';

and put the Worker URL between the quotes. Upload the file. The footer now shows "Visitors: n".

## How counting works
- One count per browser session: the page calls `/hit` once, then remembers in `sessionStorage` that it has been counted and only reads `/count` on reloads and further page views in that session.
- Known crawlers are ignored by user agent.
- The Worker refuses requests from other origins, so nobody else can inflate or read your counter from their page (the number is still public on your own site, which is the point).
- If the Worker is down or the URL is empty, the footer line simply does not appear.

## Resetting or adjusting the number
Storage & Databases, KV, `VISITS`, edit the `total` key.
