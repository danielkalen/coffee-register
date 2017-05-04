var Benchmark, CACHE_DIR, NATIVE_REGISTER, OUR_REGISTER, Promise, chalk, cleanDirCache, deRegister, exec, extend, fs, path, runClean, sample, suite, temp, theImporter,
  slice = [].slice;

Promise = require('bluebird');

Benchmark = require('benchmark');

exec = require('child_process').execSync;

fs = require('fs-jetpack');

path = require('path');

chalk = require('chalk');

extend = require('extend');

sample = function() {
  return path.join.apply(path, [__dirname, 'samples'].concat(slice.call(arguments)));
};

temp = function() {
  return path.join.apply(path, [__dirname, 'temp'].concat(slice.call(arguments)));
};

process.env.CACHE_DIR = CACHE_DIR = temp('.cache');

cleanDirCache = {
  onCycle: function() {
    return fs.dir(CACHE_DIR, {
      empty: true
    });
  }
};

fs.dir(temp(), {
  empty: true
});

NATIVE_REGISTER = "require('coffee-script/register');";

OUR_REGISTER = "require('../../');";

theImporter = null;

runClean = function(type) {
  deRegister();
  switch (type) {
    case 'native':
      require('coffee-script/register');
      break;
    case 'ours':
      require('../');
  }
  return theImporter();
};

deRegister = function() {
  var cached, cachedFile, i, j, len, len1, sampleFile, samples;
  delete require.extensions['.coffee'];
  delete require.extensions['.litcoffee'];
  delete require.extensions['.coffee.md'];
  delete require.cache[require.resolve('coffee-script/register')];
  delete require.cache[require.resolve('../')];
  samples = fs.list(sample());
  for (i = 0, len = samples.length; i < len; i++) {
    sampleFile = samples[i];
    delete require.cache[sample(sampleFile)];
  }
  cached = fs.list(temp('.cache')) || [];
  for (j = 0, len1 = cached.length; j < len1; j++) {
    cachedFile = cached[j];
    delete require.cache[temp('.cache', cachedFile)];
  }
};

suite = function(name, options) {
  return Benchmark.Suite(name, options).on('start', function() {
    return console.log(chalk.green(name));
  }).on('cycle', function(event) {
    return console.log(chalk.dim('\t' + String(event.target)));
  }).on('complete', function() {
    return console.log("\t" + (chalk.red('Fastest: ')) + " " + (this.filter('fastest').map('name').join(', ')));
  });
};

suite('3 small modules', {
  onComplete: function() {
    return fs.dir(temp(), {
      empty: true
    });
  },
  onStart: function() {
    return theImporter = function() {
      require('./samples/small1');
      require('./samples/small2');
      require('./samples/small3');
    };
  }
}).add('ours (uncached)', function() {
  return runClean('ours');
}, cleanDirCache).add('ours (cached)', function() {
  return runClean('ours');
}).run();
