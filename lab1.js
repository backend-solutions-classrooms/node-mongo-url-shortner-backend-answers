const fs = require('fs')
const assert = require('assert')
const fetch = require('node-fetch')
const { spawn, spawnSync } = require('child_process')

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
	const child = spawnSync(`lsof -a -i tcp:${port} -c node`)
	if (child.status !== 0) throw 'Not Ready'
}

;(async () => {
	const results = []

	// start server
	spawn('bash', ['-c', `cd ${process.env.USER_CODE_DIR} && yarn install && yarn start`])
	// wait for app to attach port
	await retry(() => waitForPort(process.env.PUBLIC_PORT), 500)

	// Tests
	try {
		const data = await fetch(`http://localhost:${process.env.PUBLIC_PORT}/short`)
		assert(data.status >= 200 && data.status < 300)
		results.push(true)
	} catch (error) {
		results.push(false)
	}

	try {
		const data = await fetch(`http://localhost:${process.env.PUBLIC_PORT}/short`).then((t) =>
			t.text()
		)
		assert(data.trim().toLowerCase() === 'hello from short')
		results.push(true)
	} catch (error) {
		results.push(false)
	}

	fs.writeFileSync(process.env.UNIT_TEST_OUTPUT_FILE, JSON.stringify(results))
	process.exit(0)
})()
