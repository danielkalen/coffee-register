var Promise, chai, deRegister, exec, expect, fs, listDir, md5, mocha, path, runClean, sample, temp, vm,
  slice = [].slice;

Promise = require('bluebird');

exec = require('child_process').execSync;

md5 = require('md5');

fs = require('fs-jetpack');

vm = require('vm');

path = require('path');

mocha = require('mocha');

chai = require('chai');

expect = chai.expect;

listDir = function(dir) {
  return fs.listAsync(dir).then(function(files) {
    return files.filter(function(file) {
      return file[0] !== '.';
    });
  });
};

sample = function() {
  return path.join.apply(path, [__dirname, 'samples'].concat(slice.call(arguments)));
};

temp = function() {
  return path.join.apply(path, [__dirname, 'temp'].concat(slice.call(arguments)));
};

process.env.COFFEE_CACHE_DIR = temp('.cache');

runClean = function(fn) {
  deRegister();
  return fn();
};

deRegister = function() {
  var cached, cachedFile, i, j, len, len1, sampleFile, samples;
  delete require.extensions['.coffee'];
  delete require.extensions['.litcoffee'];
  delete require.extensions['.coffee.md'];
  delete require.cache[require.resolve('coffee-script/register')];
  delete require.cache[require.resolve('coffee-script/lib/coffee-script/register')];
  delete require.cache[require.resolve('../')];
  samples = fs.list(sample());
  for (i = 0, len = samples.length; i < len; i++) {
    sampleFile = samples[i];
    delete require.cache[sample(sampleFile)];
  }
  cached = fs.list(temp('.cache'));
  for (j = 0, len1 = cached.length; j < len1; j++) {
    cachedFile = cached[j];
    delete require.cache[temp('.cache', cachedFile)];
  }
};

suite("coffee-register", function() {
  suiteTeardown(function() {
    return fs.removeAsync(temp());
  });
  suiteSetup(function() {
    return fs.dirAsync(temp());
  });
  setup(function() {
    return fs.dirAsync(temp('.cache'), {
      empty: true
    });
  });
  test("basic register", function() {
    var src;
    src = function() {
      require('../');
      return require('./samples/all.coffee');
    };
    return Promise.resolve().then(function() {
      return runClean(src);
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    });
  });
  test("index.coffee require", function() {
    var src;
    src = function() {
      require('../');
      return require('./samples/index');
    };
    return Promise.resolve().then(function() {
      return runClean(src);
    }).then(function(result) {
      return expect(result).to.equal('theIndex');
    });
  });
  test("dir require", function() {
    var src;
    src = function() {
      require('../');
      return require('./samples');
    };
    return Promise.resolve().then(function() {
      return runClean(src);
    }).then(function(result) {
      return expect(result).to.equal('theIndex');
    });
  });
  test("cached result", function() {
    var src;
    src = function() {
      require('../');
      return require('./samples/all.coffee');
    };
    return Promise.resolve().then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list).to.eql([]);
    }).then(function() {
      return runClean(src);
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    }).then(function() {
      return listDir(temp('.cache'));
    }).tap(function(list) {
      return expect(list.length).to.equal(4);
    }).then(function(list) {
      var hashA, hashAll, hashB, hashC;
      hashA = md5(fs.read(sample('sampleA.coffee')));
      hashB = md5(fs.read(sample('.sampleB.coffee')));
      hashC = md5(fs.read(sample('sampleC.extension.coffee')));
      hashAll = md5(fs.read(sample('all.coffee')));
      global.hashB = hashB;
      expect(list).to.contain(hashA + ".js");
      expect(list).to.contain(hashB + ".js");
      expect(list).to.contain(hashC + ".js");
      return expect(list).to.contain(hashAll + ".js");
    }).then(function() {
      return runClean(src);
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    }).then(function() {
      return listDir(temp('.cache'));
    }).tap(function(list) {
      return expect(list.length).to.equal(4);
    }).then(function(list) {
      return fs.writeAsync(temp('.cache', hashB + ".js"), fs.read(temp('.cache', hashB + ".js")).replace("'sample", "'SAMPLE"));
    }).then(function() {
      return runClean(src);
    }).then(function(result) {
      return expect(result).to.equal('sampleA-SAMPLEB-sampleC');
    });
  });
  test("cached result deletion", function() {
    var src;
    src = function() {
      require('../');
      return require('./samples/all.coffee');
    };
    return Promise.resolve().then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list).to.eql([]);
    }).then(function() {
      return runClean(src);
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    }).then(function() {
      return listDir(temp('.cache'));
    }).tap(function(list) {
      return expect(list.length).to.equal(4);
    }).then(function(list) {
      return fs.removeAsync(temp('.cache', list[1]));
    }).then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list.length).to.equal(3);
    }).then(function() {
      return runClean(src);
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    }).then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list.length).to.equal(4);
    });
  });
  return test("cached result update/change", function() {
    var origContents, src;
    src = function() {
      require('../');
      return require('./samples/all.coffee');
    };
    origContents = null;
    return Promise.resolve().then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list).to.eql([]);
    }).then(function() {
      return runClean(src);
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    }).then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list.length).to.equal(4);
    }).then(function() {
      return fs.read(sample('all.coffee'));
    }).tap(function(contents) {
      return origContents = contents;
    }).then(function(contents) {
      return fs.write(sample('all.coffee'), contents + ' ');
    }).then(function() {
      return runClean(src);
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    }).then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list.length).to.equal(5);
    }).then(function() {
      return runClean(src);
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    }).then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list.length).to.equal(5);
    })["finally"](function() {
      return fs.write(sample('all.coffee'), origContents);
    });
  });
});
