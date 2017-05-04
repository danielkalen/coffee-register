Promise = require 'bluebird'
Benchmark = require 'benchmark'
exec = require('child_process').execSync
fs = require 'fs-jetpack'
path = require 'path'
chalk = require 'chalk'
extend = require 'extend'
sample = ()-> path.join __dirname,'samples',arguments...
temp = ()-> path.join __dirname,'temp',arguments...
process.env.CACHE_DIR = CACHE_DIR = temp('.cache')
cleanDirCache = onCycle: ()-> fs.dir(CACHE_DIR, empty:true)

fs.dir temp(),empty:true

NATIVE_REGISTER = "require('coffee-script/register');"
OUR_REGISTER = "require('../../');"


theImporter = null
runClean = (type)->
	deRegister()
	switch type
		when 'native' then require('coffee-script/register')
		when 'ours' then require('../')

	theImporter()


deRegister = ()->
	delete require.extensions['.coffee']
	delete require.extensions['.litcoffee']
	delete require.extensions['.coffee.md']
	delete require.cache[require.resolve('coffee-script/register')]
	delete require.cache[require.resolve('../')]
	samples = fs.list(sample())
	for sampleFile in samples
		delete require.cache[sample(sampleFile)]
	
	cached = fs.list(temp('.cache')) or []
	for cachedFile in cached
		delete require.cache[temp('.cache',cachedFile)]

	return


suite = (name, options)->
	Benchmark.Suite(name, options)
		.on 'start', ()-> console.log chalk.green name
		.on 'cycle', (event)-> console.log chalk.dim '\t'+String(event.target)
		.on 'complete', ()-> console.log "\t#{chalk.red 'Fastest: '} #{this.filter('fastest').map('name').join ', '}"



suite('3 small modules', {
	onComplete: ()-> fs.dir temp(),empty:true
	onStart: ()->
		theImporter = ()->
			require('./samples/small1')
			require('./samples/small2')
			require('./samples/small3')
			return
})
	.add('native', ()->
		runClean('native')
	, cleanDirCache)

	.add('ours (uncached)', ()->
		runClean('ours')
	, cleanDirCache)

	.add('ours (cached)', ()->
		runClean('ours')
	)

	.run()



# suite('6 small modules', {
# 	onComplete: ()-> fs.dir temp(),empty:true
# 	onStart: ()->
# 		createImporters """
# 			require('../samples/small1');
# 			require('../samples/small2');
# 			require('../samples/small3');
# 			require('../samples/small4');
# 			require('../samples/small5');
# 			require('../samples/small6');
# 		"""
# })
# 	.add('native', ()->
# 		exec "node #{temp('native.js')}", {env}
# 	, cleanDirCache)

# 	.add('ours (uncached)', ()->
# 		exec "node #{temp('ours.js')}", {env}
# 	, cleanDirCache)

# 	.add('ours (cached)', ()->
# 		exec "node #{temp('ours.js')}", {env}
# 	)

# 	.run()



# suite('4 medium modules', {
# 	onComplete: ()-> fs.dir temp(),empty:true
# 	onStart: ()->
# 		createImporters """
# 			require('../samples/medium1');
# 			require('../samples/medium2');
# 			require('../samples/medium3');
# 			require('../samples/medium4');
# 		"""
# })
# 	.add('native', ()->
# 		exec "node #{temp('native.js')}", {env}
# 	, cleanDirCache)

# 	.add('ours (uncached)', ()->
# 		exec "node #{temp('ours.js')}", {env}
# 	, cleanDirCache)

# 	.add('ours (cached)', ()->
# 		exec "node #{temp('ours.js')}", {env}
# 	)

# 	.run()



# suite('2 large modules', {
# 	onComplete: ()-> fs.dir temp(),empty:true
# 	onStart: ()->
# 		createImporters """
# 			require('simplyimport/lib/simplyimport');
# 			require('simplywatch/lib/simplywatch');
# 		"""
# })
# 	.add('native', ()->
# 		exec "node #{temp('native.js')}", {env}
# 	, extend {minSamples:10}, cleanDirCache)

# 	.add('ours (uncached)', ()->
# 		exec "node #{temp('ours.js')}", {env}
# 	, extend {minSamples:10}, cleanDirCache)

# 	.add('ours (cached)', ()->
# 		exec "node #{temp('ours.js')}", {env}
# 	, minSamples:10)

# 	.run()
























