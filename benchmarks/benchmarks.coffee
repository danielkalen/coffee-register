Promise = require 'bluebird'
Benchmark = require 'benchmark'
suite = Benchmark.Suite
exec = require('child_process').execSync
fs = require 'fs-jetpack'
path = require 'path'
sample = ()-> path.join __dirname,'samples',arguments...
temp = ()-> path.join __dirname,'temp',arguments...
env = CACHE_DIR:temp('.cache')
cleanDirCache = onCycle: ()-> fs.dir(temp('.cache'), empty:true)

fs.dir temp(),empty:true

NATIVE_REGISTER = "require('coffee-script/register');"
OUR_REGISTER = "require('../../');"
createImporters = (src)->
	fs.write temp('native.js'), "#{NATIVE_REGISTER}\n#{src}"
	fs.write temp('ours.js'), "#{OUR_REGISTER}\n#{src}"



suite('3 small modules', {
	onComplete: ()-> fs.dir temp(),empty:true
	onStart: ()->
		createImporters """
			require('fs');
			require('../samples/small1');
			require('../samples/small2');
			require('../samples/small3');
		"""
})
	.add('native', ()->
		exec "node #{temp('native.js')}", {env}
	, cleanDirCache)

	.add('ours (uncached)', ()->
		exec "node #{temp('ours.js')}", {env}
	, cleanDirCache)

	.add('ours (cached)', ()->
		exec "node #{temp('ours.js')}", {env}
	)

	# .add 'native 3rd run', ()->
	# 	exec "node #{temp('native.js')}", {env}

	# .add 'ours 1st run', ()->
	# 	exec "node #{temp('ours.js')}", {env}

	# .add 'ours 2st run', ()->
	# 	exec "node #{temp('ours.js')}", {env}

	# .add 'ours 3rd run', ()->
	# 	exec "node #{temp('ours.js')}", {env}
	

	# .on 'cycle', (event)-> console.log String(event.target)
	# .on 'complete', ()-> console.log 'Fastest:', String this.filter('fastest').map('name')
	.on 'complete', ()-> console.log this[0].stats
	.run()
























