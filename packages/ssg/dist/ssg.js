import { toSSG } from "hono/ssg";
import { createServer } from "vite";
import { relative } from "node:path";
const defaultOptions = {
  entry: "./src/index.tsx"
};
const ssgBuild = (options) => {
  const virtualId = "virtual:ssg-void-entry";
  const resolvedVirtualId = "\0" + virtualId;
  const entry = options?.entry ?? defaultOptions.entry;
  let config;
  return {
    name: "@hono/vite-ssg",
    apply: "build",
    async config() {
      return {
        build: {
          rollupOptions: {
            input: [virtualId]
          }
        }
      };
    },
    configResolved(resolved) {
      config = resolved;
    },
    resolveId(id) {
      if (id === virtualId) {
        return resolvedVirtualId;
      }
    },
    load(id) {
      if (id === resolvedVirtualId) {
        return 'console.log("suppress empty chunk message")';
      }
    },
    async generateBundle(_outputOptions, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk" && chunk.moduleIds.includes(resolvedVirtualId)) {
          delete bundle[chunk.fileName];
        }
      }
      const server = await createServer({
        plugins: [],
        build: { ssr: true }
      });
      const module = await server.ssrLoadModule(entry);
      const app = module["default"];
      if (!app) {
        throw new Error(`Failed to find a named export "default" from ${entry}`);
      }
      const outDir = config.build.outDir;
      const result = await toSSG(
        app,
        {
          writeFile: async (path, data) => {
            this.emitFile({
              type: "asset",
              fileName: relative(outDir, path),
              source: data
            });
          },
          async mkdir() {
            return;
          }
        },
        { dir: outDir }
      );
      server.close();
      if (!result.success) {
        throw result.error;
      }
    }
  };
};
export {
  defaultOptions,
  ssgBuild
};
