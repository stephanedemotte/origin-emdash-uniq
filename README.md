# origin-emdash-uniq

Singleton collections for [EmDash](https://github.com/emdash-cms/emdash): **one entry per locale** for collections that are really pages (Home, About, Contact, site settings…).

EmDash has no singleton. Every collection gets "Add New", and a second Home entry has no page to render on. For the collections you list, this plugin:

- **refuses on the server**, with a clear message shown in the admin:
  - creating a new entry when the collection already has one;
  - duplicating an entry;
  - restoring a trashed entry when its locale already has a live one;
- **still allows translations**: adding the English version of the French Home works. EmDash itself already refuses two translations in the same locale;
- **hides "Add New" and "Duplicate"** in the admin for those collections.

Requires EmDash 1.x. It is a **native** (trusted) plugin, installed from git: the EmDash registry only takes sandboxed plugins, and the server guard needs a site middleware.

## Install

```bash
bun add github:stephanedemotte/origin-emdash-uniq#v1.0.0
```

```js
// astro.config.mjs
import emdash from "emdash/astro";
import { uniq } from "origin-emdash-uniq";

export const SINGLETONS = ["home", "about", "contact"];
emdash({ plugins: [uniq({ collections: SINGLETONS })] });
```

```js
// src/middleware.js
import { sequence } from "astro:middleware";
import { uniqGuard } from "origin-emdash-uniq/middleware";

const SINGLETONS = ["home", "about", "contact"]; // the same list
export const onRequest = sequence(uniqGuard({ collections: SINGLETONS, lang: "fr" }), yourOtherMiddleware);
```

`lang` picks the language of the refusal messages: `"en"` (the default) or `"fr"`. To compose middleware by hand, `checkSingleton(context, options)` returns the refusal `Response`, or `null`.

## Why a middleware and not a `content:beforeSave` hook

The hook receives the field values only. It doesn't know the entry's locale, nor whether the entry is a translation, so it could not tell "a second Home" from "the English Home". The admin's content API request carries both (`locale`, `translationOf`), so the guard sits in front of it.

## How the admin side works

- **Knowing which collections are singletons.** The admin module fetches the list from the plugin's public route (`/_emdash/api/plugins/origin-emdash-uniq/collections`), because an admin module never sees its plugin's options.
- **Hiding "Add New".** It is a link to `/content/<collection>/new`, hidden with CSS.
- **Hiding "Duplicate".** It is a row icon with no link of its own, hidden as it renders by its accessible name (`aria-label`), on singleton pages only.

This depends on the admin's DOM, which is not a public API. The server guard holds whatever the admin shows.

## Upstream

- Core singleton collections: [emdash-cms/emdash#2631](https://github.com/emdash-cms/emdash/discussions/2631). We added the per-locale case there.
- `locale` and `translationOf` in `content:beforeSave`, which would allow a sandboxed version of this plugin: [emdash-cms/emdash#3560](https://github.com/emdash-cms/emdash/discussions/3560).

## License

MIT
