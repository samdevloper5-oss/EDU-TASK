const path = require("path");
const Module = require("module");

function loadWithMocks(targetPath, mocks) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedMocks = new Map();

  for (const [requestPath, mockExport] of Object.entries(mocks || {})) {
    resolvedMocks.set(path.resolve(requestPath), mockExport);
  }

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    const resolved = Module._resolveFilename(request, parent, isMain);
    if (resolvedMocks.has(resolved)) {
      return resolvedMocks.get(resolved);
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    delete require.cache[resolvedTarget];
    return require(resolvedTarget);
  } finally {
    Module._load = originalLoad;
  }
}

module.exports = {
  loadWithMocks,
};
