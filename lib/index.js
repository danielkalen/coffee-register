var COFFEE_CACHE_DIR, COFFEE_NO_CACHE, child_process, coffeeBinary, fs, getOptions, origFork, path, register, serveCached;

child_process = require('child_process');

fs = require('fs-jetpack');

path = require('path');

COFFEE_CACHE_DIR = process.env.COFFEE_CACHE_DIR ? path.resolve(process.env.COFFEE_CACHE_DIR) : path.join(__dirname, '..', '.cache');

COFFEE_NO_CACHE = process.env.COFFEE_NO_CACHE;

serveCached = !COFFEE_NO_CACHE;

//# ==========================================================================
//# require.extensions patch
//# ========================================================================== 
register = function(extensions = [], options) {
  var cachedFiles, coffeescript, extension, i, len, loadFile, md5, targetExtensions;
  options = getOptions(options);
  md5 = require('md5');
  coffeescript = options.version === 1 ? require('coffee-script') : require('coffeescript');
  targetExtensions = [].concat(extensions, '.coffee');
  fs.dir(COFFEE_CACHE_DIR);
  cachedFiles = fs.list(COFFEE_CACHE_DIR).filter(function(file) {
    return file.slice(-3) === '.js';
  });
  loadFile = function(module, filename) {
    var cachedFile, cachedFilePath, compiledContent, content, hash;
    content = fs.read(filename);
    hash = md5(content);
    cachedFile = `${hash}.js`;
    cachedFilePath = path.join(COFFEE_CACHE_DIR, cachedFile);
    if (serveCached && cachedFiles.indexOf(cachedFile) !== -1) {
      compiledContent = fs.read(cachedFilePath);
    } else {
      compiledContent = coffeescript.compile(content, {
        filename,
        bare: true,
        inlineMap: true
      });
      fs.write(cachedFilePath, compiledContent);
    }
    return module._compile(compiledContent, filename);
  };
  for (i = 0, len = targetExtensions.length; i < len; i++) {
    extension = targetExtensions[i];
    if (extension) {
      Object.defineProperty(require.extensions, extension, {
        writable: !options.lock,
        configurable: true,
        enumerable: true,
        value: loadFile
      });
    }
  }
  return register;
};

getOptions = function(options = {}) {
  if (options.lock == null) {
    options.lock = false;
  }
  if (options.version == null) {
    options.version = 2;
  }
  return options;
};

//# ==========================================================================
//# child_process.fork patch
//# ========================================================================== 
if (child_process) {
  origFork = child_process.fork;
  coffeeBinary = path.resolve('./node_modules/coffeescript/bin/coffee');
  child_process.fork = function(filePath, args, options) {
    if (path.extname(filePath) === '.coffee') {
      if (!Array.isArray(args)) {
        options = args || {};
        args = [];
      }
      args = [filePath].concat(args);
      filePath = coffeeBinary;
    }
    return origFork(filePath, args, options);
  };
}

//# ==========================================================================
//# Source map support (necessary for cached files)
//# ========================================================================== 
/* istanbul ignore next */
if (process.env.SOURCE_MAPS || process.env.SOURCE_MAP) {
  require('@danielkalen/source-map-support').install({
    hookRequire: true
  });
}

module.exports = register();
