/**
 * The runtime of origin-emdash-uniq. Its only job: tell the admin module which
 * collections are singletons, through a public route — an admin module never
 * sees its plugin's options. (The server guard is a middleware, see
 * `middleware.js`.)
 */
import { definePlugin } from "emdash";
import { PLUGIN_ID } from "./index.js";

export function createPlugin(options = {}) {
  const collections = Array.isArray(options.collections) ? options.collections : [];
  return definePlugin({
    id: PLUGIN_ID,
    version: "1.0.0",
    capabilities: [],
    routes: {
      collections: { public: true, handler: async () => ({ collections }) },
    },
  });
}
