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

	// Tests
	try {
		fs.existsSync(path.resolve(process.env.USER_CODE_DIR, 'models/url.js'))
		results.push(true)
	} catch (error) {
		console.log(error)
		results.push(false)
	}

	try {
		await fetch(`${HOST}/short`, { method: 'POST' })
		await delay(10)
		const record = JSON.parse(
			execSync(
				`mongo localhost/codedamn --eval "db.getCollection('shorturls').findOne({}, {_id:0})" --quiet`
			)
				.toString()
				.trim()
		)
		assert(typeof record.full === 'string')
		assert(typeof record.short === 'string')
		assert(typeof record.clicks === 'number')
		results.push(true)
	} catch (error) {
		console.log(error)
		results.push(false)
	}

	fs.writeFileSync(process.env.UNIT_TEST_OUTPUT_FILE, JSON.stringify(results))
	process.exit(0)
})()
