import { normalize } from "node:path";
const normalizePaths = (paths) => {
  return paths.map((p) => {
    let normalizedPath = normalize(p).replace(/\\/g, "/");
    if (normalizedPath.startsWith("./")) {
      normalizedPath = normalizedPath.substring(2);
    }
    return "/" + normalizedPath;
  });
};
const getEntryContent = async (options) => {
  const staticPaths = options.staticPaths ?? [""];
  const globStr = normalizePaths(options.entry).map((e) => `'${e}'`).join(",");
  const hooksToString = async (appName, hooks) => {
    if (hooks) {
      const str = (await Promise.all(
        hooks.map((hook) => {
          return hook(appName, {
            staticPaths
          });
        })
      )).join("\n");
      return str;
    }
    return "";
  };
  const appStr = `const modules = import.meta.glob([${globStr}], { import: 'default', eager: true })
      let added = false
      for (const [, app] of Object.entries(modules)) {
        if (app) {
          mainApp.route('/', app)
          mainApp.notFound((c) => {
            let executionCtx
            try {
              executionCtx = c.executionCtx
            } catch {}
            return app.fetch(c.req.raw, c.env, executionCtx)
          })
          added = true
        }
      }
      if (!added) {
        throw new Error("Can't import modules from [${globStr}]")
      }`;
  const defaultExportHook = options.entryContentDefaultExportHook ?? (() => "export default mainApp");
  return `import { Hono } from 'hono'
const mainApp = new Hono()

${await hooksToString("mainApp", options.entryContentBeforeHooks)}

${appStr}

${await hooksToString("mainApp", options.entryContentAfterHooks)}

${await hooksToString("mainApp", [defaultExportHook])}`;
};
export {
  getEntryContent
};
