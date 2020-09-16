const fs = require('fs')
const assert = require('assert')
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

;(async () => {
	const results = []

	// start server
	spawn('bash', ['-c', `cd ${process.env.USER_CODE_DIR} && yarn install && yarn start`])
	// wait for app to attach port
	await retry(() => waitForPort(process.env.PUBLIC_PORT), 500)

	// Tests
	try {
		const res = await fetch(`http://localhost:${process.env.PUBLIC_PORT}/`)
		assert(res.status >= 200 && res.status < 300)
		const txt = await res.text()
		assert(!txt.includes('Mehul'))
		results.push(true)
	} catch (error) {
		results.push(false)
	}

	fs.writeFileSync(process.env.UNIT_TEST_OUTPUT_FILE, JSON.stringify(results))
	process.exit(0)
})()
