const { flatRoutes } = require("remix-flat-routes")
/**
 * @type {import('@remix-run/dev').AppConfig}
 */

module.exports = {
  postcss: true,
  cacheDirectory: "./node_modules/.cache/remix",
  ignoredRouteFiles: ["**/*"],
  serverModuleFormat: "cjs",
  browserNodeBuiltinsPolyfill: { modules: { path: true } },
  routes: async (defineRoutes) => {
    return flatRoutes("routes", defineRoutes, {
      ignoredRouteFiles: [
        ".*",
        "**/*.css",
        "**/*.test.{js,jsx,ts,tsx}",
        "**/__*.*",
      ],
    })
  },
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",ni
  // serverBuildPath: "api/index.js",
  // publicPath: "/build/",
}
