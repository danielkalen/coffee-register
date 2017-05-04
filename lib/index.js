var CACHE_DIR, Coffeescript, child_process, coffeeBinary, fs, md5, origFork, path, register;

Coffeescript = require('coffee-script');

child_process = require('child_process');

fs = require('fs-jetpack');

path = require('path');

md5 = require('md5');

CACHE_DIR = process.env.CACHE_DIR ? path.resolve(process.env.CACHE_DIR) : path.join(__dirname, '..', '.cache');

register = function(extensions) {
  var cachedFiles, extension, i, len, loadFile, targetExtensions;
  targetExtensions = [].concat(extensions, '.coffee');
  fs.dir(CACHE_DIR);
  cachedFiles = fs.list(CACHE_DIR).filter(function(file) {
    return file.slice(-3) === '.js';
  });
  loadFile = function(module, filename) {
    var cachedFile, cachedFilePath, compiledContent, content, hash;
    content = fs.read(filename);
    hash = md5(content);
    cachedFile = hash + ".js";
    cachedFilePath = path.join(CACHE_DIR, cachedFile);
    if (cachedFiles.indexOf(cachedFile) !== -1) {
      compiledContent = fs.read(cachedFilePath);
    } else {
      compiledContent = Coffeescript.compile(content, {
        filename: filename,
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
      require.extensions[extension] = loadFile;
    }
  }
};

if (child_process) {
  origFork = child_process.fork;
  coffeeBinary = path.resolve('./node_modules/coffee-script/bin/coffee');
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

register();

module.exports = register;
