module.exports = (name)->
	job = 'developer'
	user = await createUser(name, job)

	return {user..., status:'active'}



createUser = (name, job)->
	Promise.resolve()
		.then ()-> return {name, job}