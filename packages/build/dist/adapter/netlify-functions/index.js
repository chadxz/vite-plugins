import buildPlugin from "../../base.js";
function netlifyFunctionsBuildPlugin(pluginOptions) {
  return {
    ...buildPlugin({
      ...{
        entryContentBeforeHooks: [() => 'import { handle } from "hono/netlify"'],
        entryContentAfterHooks: [() => 'export const config = { path: "/*", preferStatic: true }'],
        entryContentDefaultExportHook: (appName) => `export default handle(${appName})`
      },
      ...pluginOptions
    }),
    name: "@hono/vite-build/netlify-functions"
  };
}
export {
  netlifyFunctionsBuildPlugin as default
};
