const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @zxing/library's ESM build ("module" field) has import paths Metro can't
// resolve (e.g. "./core/oned/rss/RSS14Reader") even though the files exist
// on disk — a known Metro/ESM-package-tree incompatibility, not a real
// missing file. Its CJS build ("main" field) resolves fine, so prefer
// "main" over "module" for this one package only rather than reordering
// resolution globally (other packages may rely on "module" for tree-shaking
// on web).
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@zxing/library' || moduleName.startsWith('@zxing/library/')) {
    // Force the "main" (CJS) entry instead of "module" (ESM) for this one
    // package. Its own internal relative requires then resolve as plain
    // CJS/Node module lookups, which sidesteps the ESM-tree issue entirely
    // — this only has to redirect the top-level entry point.
    return context.resolveRequest(
      { ...context, resolverMainFields: ['main'] },
      moduleName,
      platform
    );
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
