var Promise, chai, clearCache, deRegister, deRegisterCache, deRegisterSamples, exec, expect, fs, listDir, loadCleanly, md5, mocha, path, sample, temp, vm;

Promise = require('bluebird');

// Promise.config longStackTraces:true
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
  return path.join(__dirname, 'samples', ...arguments);
};

temp = function() {
  return path.join(__dirname, 'temp', ...arguments);
};

process.env.COFFEE_CACHE_DIR = temp('.cache');

loadCleanly = function(target, options, deleteCache) {
  deRegister();
  if (deleteCache) {
    clearCache();
  }
  require('../')(null, options);
  return require(target);
};

deRegister = function() {
  delete require.extensions['.coffee'];
  delete require.extensions['.litcoffee'];
  delete require.extensions['.coffee.md'];
  delete require.cache[require.resolve('coffee-script/register')];
  delete require.cache[require.resolve('coffee-script/lib/coffee-script/register')];
  delete require.cache[require.resolve('../')];
  deRegisterSamples();
  deRegisterCache();
};

deRegisterSamples = function() {
  var i, len, results, sampleFile, samples;
  samples = fs.list(sample());
  results = [];
  for (i = 0, len = samples.length; i < len; i++) {
    sampleFile = samples[i];
    results.push(delete require.cache[sample(sampleFile)]);
  }
  return results;
};

deRegisterCache = function() {
  var cached, cachedFile, i, len, results;
  cached = fs.list(temp('.cache'));
  results = [];
  for (i = 0, len = cached.length; i < len; i++) {
    cachedFile = cached[i];
    results.push(delete require.cache[temp('.cache', cachedFile)]);
  }
  return results;
};

clearCache = function() {
  return fs.dir(temp('.cache'), {
    empty: true
  });
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
    return Promise.resolve().then(function() {
      return loadCleanly('./samples/all.coffee');
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    });
  });
  test("index.coffee require", function() {
    return Promise.resolve().then(function() {
      return loadCleanly('./samples/index');
    }).then(function(result) {
      return expect(result).to.equal('theIndex');
    });
  });
  test("dir require", function() {
    return Promise.resolve().then(function() {
      return loadCleanly('./samples');
    }).then(function(result) {
      return expect(result).to.equal('theIndex');
    });
  });
  test("cached result", function() {
    return Promise.resolve().then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list).to.eql([]);
    }).then(function() {
      return loadCleanly('./samples/all.coffee');
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
      expect(list).to.contain(`${hashA}.js`);
      expect(list).to.contain(`${hashB}.js`);
      expect(list).to.contain(`${hashC}.js`);
      return expect(list).to.contain(`${hashAll}.js`);
    }).then(function() {
      return loadCleanly('./samples/all.coffee');
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    }).then(function() {
      return listDir(temp('.cache'));
    }).tap(function(list) {
      return expect(list.length).to.equal(4);
    }).then(function(list) {
      return fs.writeAsync(temp('.cache', `${hashB}.js`), fs.read(temp('.cache', `${hashB}.js`)).replace("'sample", "'SAMPLE"));
    }).then(function() {
      return loadCleanly('./samples/all.coffee');
    }).then(function(result) {
      return expect(result).to.equal('sampleA-SAMPLEB-sampleC');
    });
  });
  test("cached result deletion", function() {
    return Promise.resolve().then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list).to.eql([]);
    }).then(function() {
      return loadCleanly('./samples/all.coffee');
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
      return loadCleanly('./samples/all.coffee');
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    }).then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list.length).to.equal(4);
    });
  });
  test("cached result update/change", function() {
    var origContents;
    origContents = null;
    return Promise.resolve().then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list).to.eql([]);
    }).then(function() {
      return loadCleanly('./samples/all.coffee');
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
      return loadCleanly('./samples/all.coffee');
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    }).then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list.length).to.equal(5);
    }).then(function() {
      return loadCleanly('./samples/all.coffee');
    }).then(function(result) {
      return expect(result).to.equal('sampleA-sampleB-sampleC');
    }).then(function() {
      return listDir(temp('.cache'));
    }).then(function(list) {
      return expect(list.length).to.equal(5);
    }).finally(function() {
      return fs.write(sample('all.coffee'), origContents);
    });
  });
  test("es2015", function() {
    return Promise.resolve().then(function() {
      return loadCleanly('./samples/es2015.coffee');
    }).tap(function(result) {
      return expect(typeof result).to.equal('function');
    }).then(function(result) {
      return result('daniel');
    }).then(function(result) {
      return expect(result).to.eql({
        name: 'daniel',
        job: 'developer',
        status: 'active'
      });
    });
  });
  return suite("options", function() {
    var fakeLoader;
    fakeLoader = function(module, filename) {
      return module._compile('module.exports = "overwrite"', filename);
    };
    test("version", function() {
      expect(function() {
        return loadCleanly('./samples/es2015.coffee', {
          version: 2
        }, true)('daniel');
      }).not.to.throw();
      return expect(function() {
        return loadCleanly('./samples/es2015.coffee', {
          version: 1
        }, true)('daniel');
      }).to.throw();
    });
    return test("lock", function() {
      deRegister();
      require('../')(null, {
        lock: false
      });
      expect(require('./samples')).to.equal('theIndex');
      deRegisterSamples();
      require.extensions['.coffee'] = fakeLoader;
      expect(require('./samples')).to.equal('overwrite');
      deRegister();
      require('../')(null, {
        lock: true
      });
      expect(require('./samples')).to.equal('theIndex');
      deRegisterSamples();
      require.extensions['.coffee'] = fakeLoader;
      return expect(require('./samples')).to.equal('theIndex');
    });
  });
});
