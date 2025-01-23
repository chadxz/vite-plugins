"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var dev_server_exports = {};
__export(dev_server_exports, {
  defaultOptions: () => defaultOptions,
  devServer: () => devServer
});
module.exports = __toCommonJS(dev_server_exports);
var import_node_server = require("@hono/node-server");
var import_minimatch = require("minimatch");
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
const defaultOptions = {
  entry: "./src/index.ts",
  export: "default",
  injectClientScript: true,
  exclude: [
    /.*\.css$/,
    /.*\.ts$/,
    /.*\.tsx$/,
    /^\/@.+$/,
    /\?t\=\d+$/,
    /^\/favicon\.ico$/,
    /^\/static\/.+/,
    /^\/node_modules\/.*/
  ],
  ignoreWatching: [/\.wrangler/, /\.mf/]
};
function devServer(options) {
  let publicDirPath = "";
  const entry = options?.entry ?? defaultOptions.entry;
  const plugin = {
    name: "@hono/vite-dev-server",
    configResolved(config) {
      publicDirPath = config.publicDir;
    },
    configureServer: async (server) => {
      async function createMiddleware(server2) {
        return async function(req, res, next) {
          if (req.url) {
            const filePath = import_path.default.join(publicDirPath, req.url);
            try {
              if (import_fs.default.existsSync(filePath) && import_fs.default.statSync(filePath).isFile()) {
                return next();
              }
            } catch {
            }
          }
          const exclude = options?.exclude ?? defaultOptions.exclude;
          for (const pattern of exclude) {
            if (req.url) {
              if (pattern instanceof RegExp) {
                if (pattern.test(req.url)) {
                  return next();
                }
              } else if ((0, import_minimatch.minimatch)(req.url?.toString(), pattern)) {
                return next();
              }
            }
          }
          let loadModule;
          if (options?.loadModule) {
            loadModule = options.loadModule;
          } else {
            loadModule = async (server3, entry2) => {
              const appModule = await server3.ssrLoadModule(entry2);
              const exportName = options?.export ?? defaultOptions.export;
              const app2 = appModule[exportName];
              if (!app2) {
                throw new Error(`Failed to find a named export "${exportName}" from ${entry2}`);
              }
              return app2;
            };
          }
          let app;
          try {
            app = await loadModule(server2, entry);
          } catch (e) {
            return next(e);
          }
          (0, import_node_server.getRequestListener)(
            async (request) => {
              let env = {};
              if (options?.env) {
                if (typeof options.env === "function") {
                  env = { ...env, ...await options.env() };
                } else {
                  env = { ...env, ...options.env };
                }
              }
              const adapter = await getAdapterFromOptions(options);
              if (adapter?.env) {
                env = { ...env, ...adapter.env };
              }
              const executionContext = adapter?.executionContext ?? {
                waitUntil: async (fn) => fn,
                passThroughOnException: () => {
                  throw new Error("`passThroughOnException` is not supported");
                }
              };
              const response = await app.fetch(request, env, executionContext);
              if (!(response instanceof Response)) {
                throw response;
              }
              if (options?.injectClientScript !== false && response.headers.get("content-type")?.match(/^text\/html/)) {
                const nonce = response.headers.get("content-security-policy")?.match(/'nonce-([^']+)'/)?.[1];
                const script = `<script${nonce ? ` nonce="${nonce}"` : ""}>import("/@vite/client")</script>`;
                return injectStringToResponse(response, script) ?? response;
              }
              return response;
            },
            {
              overrideGlobalObjects: false,
              errorHandler: (e) => {
                let err;
                if (e instanceof Error) {
                  err = e;
                  server2.ssrFixStacktrace(err);
                } else if (typeof e === "string") {
                  err = new Error(`The response is not an instance of "Response", but: ${e}`);
                } else {
                  err = new Error(`Unknown error: ${e}`);
                }
                next(err);
              }
            }
          )(req, res);
        };
      }
      server.middlewares.use(await createMiddleware(server));
      server.httpServer?.on("close", async () => {
        const adapter = await getAdapterFromOptions(options);
        if (adapter?.onServerClose) {
          await adapter.onServerClose();
        }
      });
    },
    config: () => {
      return {
        server: {
          watch: {
            ignored: options?.ignoreWatching ?? defaultOptions.ignoreWatching
          }
        }
      };
    }
  };
  return plugin;
}
const getAdapterFromOptions = async (options) => {
  let adapter = options?.adapter;
  if (typeof adapter === "function") {
    adapter = adapter();
  }
  if (adapter instanceof Promise) {
    adapter = await adapter;
  }
  return adapter;
};
function injectStringToResponse(response, content) {
  const stream = response.body;
  const newContent = new TextEncoder().encode(content);
  if (!stream) {
    return null;
  }
  const reader = stream.getReader();
  const newContentReader = new ReadableStream({
    start(controller) {
      controller.enqueue(newContent);
      controller.close();
    }
  }).getReader();
  const combinedStream = new ReadableStream({
    async start(controller) {
      for (; ; ) {
        const [existingResult, newContentResult] = await Promise.all([
          reader.read(),
          newContentReader.read()
        ]);
        if (existingResult.done && newContentResult.done) {
          controller.close();
          break;
        }
        if (!existingResult.done) {
          controller.enqueue(existingResult.value);
        }
        if (!newContentResult.done) {
          controller.enqueue(newContentResult.value);
        }
      }
    }
  });
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(combinedStream, {
    headers,
    status: response.status
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  defaultOptions,
  devServer
});
