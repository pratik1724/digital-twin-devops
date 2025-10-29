/*
  Reduce webpack memory usage for CRA dev/build by disabling source maps
  and limiting heavy optimizations. This mirrors a common fix for OOM.
*/
module.exports = {
  webpack: {
    configure: (webpackConfig, { env }) => {
      // Disable source maps (big memory saver)
      webpackConfig.devtool = false;

      // Tweak performance hints off
      webpackConfig.performance = webpackConfig.performance || {};
      webpackConfig.performance.hints = false;

      // Keep splitChunks as-is; CRA handles it
      return webpackConfig;
    },
  },
};