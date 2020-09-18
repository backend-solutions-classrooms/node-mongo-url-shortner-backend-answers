const fs = require('fs')
const assert = require('assert')
const path = require('path')
const fetch = require('node-fetch')
const { spawn, execSync } = require('child_process')

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function retry(fn, ms) {
	try {
		await fn()
	} catch (error) {
		await delay(ms)
		return await retry(fn, ms)
	}
}

function waitForPort(port) {
	execSync(`lsof -a -i tcp:${port} -c node`)
	// if execSync doesn't throw, it was successful
	return true
}

const HOST = 'http://localhost:' + process.env.PUBLIC_PORT

;(async () => {
	const results = []

	// start server
	spawn('bash', ['-c', `cd ${process.env.USER_CODE_DIR} && yarn install && yarn start`])
	// wait for app to attach port
	await retry(() => waitForPort(process.env.PUBLIC_PORT), 500)

	try {
		const res = await fetch(`${HOST}/sdjfhjdskfhjdsf`)
		assert(res.statusCode === 404)
		results.push(true)
	} catch (error) {
		results.push(false)
	}

	try {
		const res = await fetch(`${HOST}/5xr`)
		const location = res.headers.get('Location')
		assert(res.redirected)
		assert(location.includes('google.com'))

		results.push(true)
	} catch (error) {
		results.push(false)
	}

	try {
		const res = await fetch(`${HOST}/5xr`)
		const record = JSON.parse(
			execSync(
				`mongo localhost/codedamn --eval "db.getCollection('shorturls').findOne({ short: '5xr' }, {_id:0})" --quiet`
			)
				.toString()
				.trim()
		)
		assert(record.clicks === 2)
		results.push(true)
	} catch (error) {
		results.push(false)
	}

	fs.writeFileSync(process.env.UNIT_TEST_OUTPUT_FILE, JSON.stringify(results))
	process.exit(0)
})()
