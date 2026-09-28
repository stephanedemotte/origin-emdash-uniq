/**
 * THE ADMIN SIDE of origin-emdash-uniq (see `index.js`): hides "Add New" and
 * "Duplicate" for singleton collections. Nothing to render — the module acts
 * when loaded, since the admin imports every plugin's module up front.
 *
 * The list comes from the plugin's public route (`runtime.js`). "Add New" is a
 * link to `/content/<c>/new`, hidden with CSS. "Duplicate" is a row icon with
 * no link of its own, reachable only by its accessible name (`aria-label`,
 * `title` or text): it is hidden as it renders, on those collections' pages
 * only. The server guard (`middleware.js`) holds anyway.
 */
const DUPLICATE = /^(duplicate|dupliquer)(\s|$)/i;

const load = async () => {
  try {
    const r = await fetch("/_emdash/api/plugins/origin-emdash-uniq/collections", { headers: { Accept: "application/json" } });
    const d = await r.json();
    const list = d?.data?.collections ?? d?.collections;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

if (typeof document !== "undefined") {
  load().then((collections) => {
    if (!collections.length) return;
    const style = document.createElement("style");
    style.dataset.plugin = "origin-emdash-uniq";
    style.textContent = collections.map((c) => `a[href$="/content/${c}/new"], a[href*="/content/${c}/new?"]`).join(",\n") + " { display: none !important; }";
    document.head.append(style);

    const onSingletonPage = () => collections.some((c) => location.pathname.includes(`/content/${c}`));
    const hide = () => {
      if (!onSingletonPage()) return;
      for (const el of document.querySelectorAll('[role="menuitem"], button')) {
        const name = [el.getAttribute("aria-label"), el.getAttribute("title"), el.textContent].map((x) => (x ?? "").trim()).find(Boolean) ?? "";
        if (DUPLICATE.test(name)) el.style.display = "none";
      }
    };
    hide();
    new MutationObserver(hide).observe(document.documentElement, { childList: true, subtree: true });
  });
}

export const fields = {};
