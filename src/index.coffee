Coffeescript = require 'coffee-script'
child_process = require 'child_process'
fs = require 'fs-jetpack'
path = require 'path'
md5 = require 'md5'
CACHE_DIR = if process.env.CACHE_DIR then path.resolve(process.env.CACHE_DIR) else path.join __dirname,'..','.cache'


## ==========================================================================
## require.extensions patch
## ========================================================================== 
register = (extensions)->
	targetExtensions = [].concat(extensions, '.coffee')
	fs.dir(CACHE_DIR)
	cachedFiles = fs.list(CACHE_DIR).filter (file)-> file.slice(-3) is '.js'

	loadFile = (module, filename)->
		content = fs.read(filename)
		hash = md5(content)
		cachedFile = "#{hash}.js"
		cachedFilePath = path.join CACHE_DIR,cachedFile
		
		if cachedFiles.indexOf(cachedFile) isnt -1
			compiledContent = fs.read cachedFilePath
		else
			compiledContent = Coffeescript.compile content, {filename, bare:true, inlineMap:true}
			fs.write cachedFilePath, compiledContent
		
		module._compile compiledContent, filename


	for extension in targetExtensions when extension
		require.extensions[extension] = loadFile
		# Object.defineProperty require.extensions, '.coffee', value:loadFile

	return




## ==========================================================================
## child_process.fork patch
## ========================================================================== 
if child_process
	origFork = child_process.fork
	coffeeBinary = path.resolve './node_modules/coffee-script/bin/coffee'

	child_process.fork = (filePath, args, options)->
		if path.extname(filePath) is '.coffee'
			unless Array.isArray(args)
				options = args or {}
				args = []
			
			args = [filePath].concat args
			filePath = coffeeBinary
		
		origFork filePath, args, options




register()
module.exports = register



