fs = require 'fs-jetpack'
Promise = require 'bluebird'
Coffeescript = require 'coffee-script'
md5 = require 'md5'
path = require 'path'
CACHE_FILE = path.resolve '.config','buildcache'

process.exit(0) if process.env.CI
fs.file(CACHE_FILE)

compileCoffee = (srcFile, destFile)->
	Promise.resolve()
		.then ()-> Promise.all [
			fs.readAsync srcFile
			fs.existsAsync destFile
			fs.readAsync(CACHE_FILE).then (cache)-> cache.split '\n'
		]
		.spread (src, destExists, cache)->
			srcHash = md5(src)
			
			return if destExists and cache.includes(srcHash)
			
			Promise.resolve()
				.then ()-> console.log "Building #{srcFile}"
				.then ()-> Coffeescript.compile src, {bare:true}
				.then (output)-> fs.writeAsync destFile, output
				.then ()-> fs.writeAsync CACHE_FILE, cache.concat(srcHash).join '\n'


task 'build', 'compile lib, test, and benchmark files', ()->
	Promise.resolve()
		.then ()-> invoke 'build:lib'
		.then ()-> invoke 'build:test'
		.then ()-> invoke 'build:benchmark'


task 'build:lib', ()->
	compileCoffee 'src/index.coffee', 'lib/index.js'


task 'build:test', ()->
	compileCoffee 'test/test.coffee', 'test/test.js'


task 'build:benchmark', ()->
	compileCoffee 'benchmarks/runner.coffee', 'benchmarks/runner.js'

