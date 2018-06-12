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

runClean = (fn)->
	deRegister()
	fn()


deRegister = ()->
	delete require.extensions['.coffee']
	delete require.extensions['.litcoffee']
	delete require.extensions['.coffee.md']
	delete require.cache[require.resolve('coffee-script/register')]
	delete require.cache[require.resolve('coffee-script/lib/coffee-script/register')]
	delete require.cache[require.resolve('../')]
	samples = fs.list(sample())
	for sampleFile in samples
		delete require.cache[sample(sampleFile)]
	
	cached = fs.list(temp('.cache'))
	for cachedFile in cached
		delete require.cache[temp('.cache',cachedFile)]

	return


suite "coffee-register", ()->
	suiteTeardown ()-> fs.removeAsync temp()
	suiteSetup ()-> fs.dirAsync temp()
	setup ()-> fs.dirAsync temp('.cache'), empty:true


	test "basic register", ()->
		src = ()->
			require('../')
			require('./samples/all.coffee')
		
		Promise.resolve()
			.then ()-> runClean(src)
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')


	test "index.coffee require", ()->
		src = ()->
			require('../')
			require('./samples/index')

		Promise.resolve()
			.then ()-> runClean(src)
			.then (result)-> expect(result).to.equal('theIndex')


	test "dir require", ()->
		src = ()->
			require('../')
			require('./samples')

		Promise.resolve()
			.then ()-> runClean(src)
			.then (result)-> expect(result).to.equal('theIndex')


	test "cached result", ()->
		src = ()->
			require('../')
			require('./samples/all.coffee')

		Promise.resolve()
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list).to.eql []
			.then ()-> runClean(src)
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

			.then ()-> runClean(src)
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.tap (list)-> expect(list.length).to.equal 4
			.then (list)-> fs.writeAsync temp('.cache',"#{hashB}.js"), fs.read(temp('.cache',"#{hashB}.js")).replace("'sample", "'SAMPLE")
			.then ()-> runClean(src)
			.then (result)-> expect(result).to.equal('sampleA-SAMPLEB-sampleC')


	test "cached result deletion", ()->
		src = ()->
			require('../')
			require('./samples/all.coffee')

		Promise.resolve()
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list).to.eql []
			.then ()-> runClean(src)
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.tap (list)-> expect(list.length).to.equal 4
			.then (list)-> fs.removeAsync temp('.cache',list[1])
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list.length).to.equal 3
			.then ()-> runClean(src)
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list.length).to.equal 4


	test "cached result update/change", ()->
		src = ()->
			require('../')
			require('./samples/all.coffee')

		origContents = null
		Promise.resolve()
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list).to.eql []
			.then ()-> runClean(src)
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list.length).to.equal 4
			.then ()-> fs.read sample('all.coffee')
			.tap (contents)-> origContents = contents
			.then (contents)-> fs.write sample('all.coffee'), contents+' '
			.then ()-> runClean(src)
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list.length).to.equal 5
			.then ()-> runClean(src)
			.then (result)-> expect(result).to.equal('sampleA-sampleB-sampleC')
			.then ()-> listDir temp('.cache')
			.then (list)-> expect(list.length).to.equal 5
			.finally ()-> fs.write sample('all.coffee'), origContents






