/**
 * THE SERVER GUARD. Call it from the site's `src/middleware.js`, before EmDash
 * handles the request:
 *
 *   import { sequence } from "astro:middleware";
 *   import { uniqGuard } from "origin-emdash-uniq/middleware";
 *   export const onRequest = sequence(uniqGuard({ collections: ["home", "about"] }), yourMiddleware);
 *
 * Use the SAME list as `uniq({ collections })`.
 *
 * Three admin API requests make an entry:
 *   POST /_emdash/api/content/<c>                  create (or translate)
 *   POST /_emdash/api/content/<c>/<id>/duplicate   copy
 *   POST /_emdash/api/content/<c>/<id>/restore     out of the trash
 * A refusal is a 409 in EmDash's error shape (`{ error: { code, message } }`),
 * which the admin displays.
 *
 * The database comes from `locals.emdash.db`, which EmDash sets for an
 * authenticated admin session — every content-API write is one. Without it
 * (not logged in) the request goes through, and EmDash refuses it anyway.
 * (Not `emdash/runtime`'s `getDb()`: imported from a package outside Vite,
 * it would load EmDash's virtual modules through Node and fail.)
 */
const PATH = /^\/_emdash\/api\/content\/([a-z][a-z0-9_]*)(?:\/([^/]+)\/(duplicate|restore))?\/?$/;

const MESSAGES = {
  en: {
    exists: "This page is a singleton and already exists: edit it, or add a translation from the existing entry.",
    duplicate: "This page is a singleton: it cannot be duplicated. Edit the existing entry.",
    restore: (l) => `This page already exists in "${l}": restoring the old one would make two.`,
  },
  fr: {
    exists: "Cette page est unique et existe déjà : modifiez-la, ou ajoutez-en une traduction depuis l'entrée existante.",
    duplicate: "Cette page est unique : elle ne se duplique pas. Modifiez l'entrée existante.",
    restore: (l) => `Cette page existe déjà en « ${l} » : restaurer l'ancienne en ferait deux.`,
  },
};

const refuse = (message) =>
  new Response(JSON.stringify({ error: { code: "SINGLETON", message } }), {
    status: 409,
    headers: { "content-type": "application/json", "cache-control": "private, no-store" },
  });

/** Live (not trashed) entries of a collection, in one locale or all. */
const liveEntries = async (db, collection, locale) => {
  let q = db
    .selectFrom(`ec_${collection}`)
    .select((eb) => eb.fn.countAll().as("n"))
    .where("deleted_at", "is", null);
  if (locale) q = q.where("locale", "=", locale);
  return Number((await q.executeTakeFirst())?.n ?? 0);
};

/**
 * The check alone: a refusal `Response`, or `null` to let the request through.
 * For sites that compose middleware by hand.
 */
export const checkSingleton = async ({ request, url, locals }, { collections = [], lang = "en" } = {}) => {
  if (request.method !== "POST") return null;
  const m = url.pathname.match(PATH);
  if (!m || !collections.includes(m[1])) return null;
  const db = locals?.emdash?.db;
  if (!db) return null;
  const t = MESSAGES[lang] ?? MESSAGES.en;
  const [, collection, id, action] = m;

  if (action === "duplicate") return refuse(t.duplicate);

  if (action === "restore") {
    const e = await db.selectFrom(`ec_${collection}`).select(["locale"]).where("id", "=", id).executeTakeFirst();
    if (e && (await liveEntries(db, collection, e.locale)) > 0) return refuse(t.restore(e.locale));
    return null;
  }

  const body = await request
    .clone()
    .json()
    .catch(() => null);
  if (body?.translationOf) return null; // EmDash itself refuses a duplicate locale
  if ((await liveEntries(db, collection)) > 0) return refuse(t.exists);
  return null;
};

/** An Astro middleware: `(context, next)`. `lang`: "en" (default) or "fr" for the refusal messages. */
export const uniqGuard = (options = {}) => async (context, next) => {
  if (context.url.pathname.startsWith("/_emdash/api/content/")) {
    const refusal = await checkSingleton(context, options);
    if (refusal) return refusal;
  }
  return next();
};
