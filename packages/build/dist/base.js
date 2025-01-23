import { builtinModules } from "module";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { getEntryContent } from "./entry/index.js";
const defaultOptions = {
  entry: ["src/index.ts", "./src/index.tsx", "./app/server.ts"],
  output: "index.js",
  outputDir: "./dist",
  external: [],
  minify: true,
  emptyOutDir: false,
  apply: (_config, { command, mode }) => {
    if (command === "build" && mode !== "client") {
      return true;
    }
    return false;
  },
  staticPaths: []
};
const buildPlugin = (options) => {
  const virtualEntryId = "virtual:build-entry-module";
  const resolvedVirtualEntryId = "\0" + virtualEntryId;
  let config;
  const output = options.output ?? defaultOptions.output;
  return {
    name: "@hono/vite-build",
    configResolved: async (resolvedConfig) => {
      config = resolvedConfig;
    },
    resolveId(id) {
      if (id === virtualEntryId) {
        return resolvedVirtualEntryId;
      }
    },
    async load(id) {
      if (id === resolvedVirtualEntryId) {
        let staticPaths = [];
        const direntPaths = [];
        try {
          const publicDirPaths = readdirSync(resolve(config.root, config.publicDir), {
            withFileTypes: true
          });
          direntPaths.push(...publicDirPaths);
          const buildOutDirPaths = readdirSync(resolve(config.root, config.build.outDir), {
            withFileTypes: true
          });
          direntPaths.push(...buildOutDirPaths);
        } catch {
        }
        const uniqueStaticPaths = /* @__PURE__ */ new Set();
        direntPaths.forEach((p) => {
          if (p.isDirectory()) {
            uniqueStaticPaths.add(`/${p.name}/*`);
          } else {
            if (p.name === output) {
              return;
            }
            uniqueStaticPaths.add(`/${p.name}`);
          }
        });
        staticPaths = Array.from(uniqueStaticPaths);
        const entry = options.entry ?? defaultOptions.entry;
        return await getEntryContent({
          entry: Array.isArray(entry) ? entry : [entry],
          entryContentBeforeHooks: options.entryContentBeforeHooks,
          entryContentAfterHooks: options.entryContentAfterHooks,
          entryContentDefaultExportHook: options.entryContentDefaultExportHook,
          staticPaths
        });
      }
    },
    apply: options?.apply ?? defaultOptions.apply,
    config: async () => {
      return {
        ssr: {
          external: options?.external ?? defaultOptions.external,
          noExternal: true,
          target: "webworker"
        },
        build: {
          outDir: options?.outputDir ?? defaultOptions.outputDir,
          emptyOutDir: options?.emptyOutDir ?? defaultOptions.emptyOutDir,
          minify: options?.minify ?? defaultOptions.minify,
          ssr: true,
          rollupOptions: {
            external: [...builtinModules, /^node:/],
            input: virtualEntryId,
            output: {
              entryFileNames: output
            }
          }
        }
      };
    }
  };
};
var base_default = buildPlugin;
export {
  base_default as default,
  defaultOptions
};
