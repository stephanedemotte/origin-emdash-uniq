/**
 * origin-emdash-uniq — singleton collections for EmDash.
 *
 * EmDash has no singleton: every collection gets an "Add New" button, and a
 * second Home entry has no page to render on. For the collections you list,
 * this plugin allows ONE entry per locale:
 *
 * - SERVER, `uniqGuard()` (`origin-emdash-uniq/middleware`, wired into the
 *   site's `src/middleware.js`): on the admin content API, refuses creating a
 *   NEW entry (not a translation) when the collection already has one,
 *   duplicating an entry, and restoring a trashed entry when its locale
 *   already has a live one. Translations go through — EmDash already refuses
 *   two translations in the same locale.
 *   Why not a `content:beforeSave` hook: it receives the field values only,
 *   neither the locale nor whether the entry is a translation.
 * - ADMIN (`admin.js`): hides "Add New" and "Duplicate" for those collections,
 *   so editors don't run into the refusal.
 */
import { fileURLToPath } from "node:url";

export const PLUGIN_ID = "origin-emdash-uniq";

/** The plugin descriptor, for `emdash({ plugins: [uniq({ collections: ["home", "about"] })] })`. */
export const uniq = ({ collections = [] } = {}) => ({
  id: PLUGIN_ID,
  version: "1.0.0",
  format: "native",
  entrypoint: fileURLToPath(new URL("./runtime.js", import.meta.url)),
  adminEntry: fileURLToPath(new URL("./admin.js", import.meta.url)),
  capabilities: [],
  options: { collections },
});
