Promise = require 'bluebird'
# Promise.config longStackTraces:true
exec = require('child_process').execSync
md5 = require 'md5'
fs = require 'fs-jetpack'
vm = require 'vm'
path = require 'path'
mocha = require 'mocha'
chai = require 'chai'
expect = chai.expect
listDir = (dir)-> fs.listAsync(dir).then (files)-> files.filter (file)-> file[0] isnt '.'
sample = ()-> path.join __dirname,'samples',arguments...
temp = ()-> path.join __dirname,'temp',arguments...
process.env.COFFEE_CACHE_DIR = temp('.cache')

loadCleanly = (target, options, deleteCache)->
	deRegister()
	clearCache() if deleteCache
	require('../')(null, options)
	require(target)


deRegister = ()->
	delete require.extensions['.coffee']
	delete require.extensions['.litcoffee']
	delete require.extensions['.coffee.md']
	delete require.cache[require.resolve('coffee-script/register')]
	delete require.cache[require.resolve('coffee-script/lib/coffee-script/register')]
	delete require.cache[require.resolve('../')]
	deRegisterSamples()
	deRegisterCache()

	return
	
deRegisterSamples = ()->
	samples = fs.list(sample())
	for sampleFile in samples
		delete require.cache[sample(sampleFile)]

deRegisterCache = ()->
	cached = fs.list(temp('.cache'))
	for cachedFile in cached
		delete require.cache[temp('.cache',cachedFile)]

clearCache = ()->
	fs.dir(temp('.cache'), empty:true)


suite "coffee-register", ()->
	suiteTeardown ()-> fs.removeAsync temp()
	suiteSetup ()-> fs.dirAsync temp()
	setup ()-> fs.dirAsync temp('.cache'), empty:true


	test "basic register", ()->		
		Promise.resolve()
			.then ()-> loadCleanly('./samples/all.coffee')
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')


	test "index.coffee require", ()->
		Promise.resolve()
			.then ()-> loadCleanly('./samples/index')
			.then (result)-> expect(result).to.equal('theIndex')


	test "dir require", ()->
		Promise.resolve()
			.then ()-> loadCleanly('./samples')
			.then (result)-> expect(result).to.equal('theIndex')


	test "cached result", ()->
		Promise.resolve()
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list).to.eql []
			.then ()-> loadCleanly('./samples/all.coffee')
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.tap (list)-> expect(list.length).to.equal 4
			.then (list)->
				hashA = md5 fs.read sample('sampleA.coffee')
				hashB = md5 fs.read sample('.sampleB.coffee')
				hashC = md5 fs.read sample('sampleC.extension.coffee')
				hashAll = md5 fs.read sample('all.coffee')
				global.hashB = hashB

				expect(list).to.contain "#{hashA}.js"
				expect(list).to.contain "#{hashB}.js"
				expect(list).to.contain "#{hashC}.js"
				expect(list).to.contain "#{hashAll}.js"

			.then ()-> loadCleanly('./samples/all.coffee')
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.tap (list)-> expect(list.length).to.equal 4
			.then (list)-> fs.writeAsync temp('.cache',"#{hashB}.js"), fs.read(temp('.cache',"#{hashB}.js")).replace("'sample", "'SAMPLE")
			.then ()-> loadCleanly('./samples/all.coffee')
			.then (result)-> expect(result).to.equal('sampleA-SAMPLEB-sampleC')


	test "cached result deletion", ()->
		Promise.resolve()
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list).to.eql []
			.then ()-> loadCleanly('./samples/all.coffee')
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.tap (list)-> expect(list.length).to.equal 4
			.then (list)-> fs.removeAsync temp('.cache',list[1])
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list.length).to.equal 3
			.then ()-> loadCleanly('./samples/all.coffee')
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list.length).to.equal 4


	test "cached result update/change", ()->
		origContents = null
		Promise.resolve()
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list).to.eql []
			.then ()-> loadCleanly('./samples/all.coffee')
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list.length).to.equal 4
			.then ()-> fs.read sample('all.coffee')
			.tap (contents)-> origContents = contents
			.then (contents)-> fs.write sample('all.coffee'), contents+' '
			.then ()-> loadCleanly('./samples/all.coffee')
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list.length).to.equal 5
			.then ()-> loadCleanly('./samples/all.coffee')
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list.length).to.equal 5
			.finally ()-> fs.write sample('all.coffee'), origContents


	test "es2015", ()->		
		Promise.resolve()
			.then ()-> loadCleanly('./samples/es2015.coffee')
			.tap (result)-> expect(typeof result).to.equal 'function'
			.then (result)-> result('daniel')
			.then (result)-> expect(result).to.eql
				name: 'daniel'
				job: 'developer'
				status: 'active'

	suite "options", ()->
		fakeLoader = (module, filename)->
			module._compile('module.exports = "overwrite"', filename)

		test "version", ()->
			expect(()->
				loadCleanly('./samples/es2015.coffee', version:2, true)('daniel')
			).not.to.throw()
			
			expect(()->
				loadCleanly('./samples/es2015.coffee', version:1, true)('daniel')
			).to.throw()
		
		test "lock", ()->
			deRegister()
			require('../')(null, lock:false)
			expect(require('./samples')).to.equal 'theIndex'

			deRegisterSamples()
			require.extensions['.coffee'] = fakeLoader
			expect(require('./samples')).to.equal 'overwrite'

			
			deRegister()
			require('../')(null, lock:true)
			expect(require('./samples')).to.equal 'theIndex'
			
			deRegisterSamples()
			require.extensions['.coffee'] = fakeLoader
			expect(require('./samples')).to.equal 'theIndex'






