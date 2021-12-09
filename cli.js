#!/usr/bin/env node

import { strict as assert } from 'assert';
import * as util from 'util';
import getStats, { filter } from './src/index.js';
import { sumDownloads } from './src/utils.js';

const popArg = (argv, arg) => {
	assert(Array.isArray(argv));
	assert.equal(typeof arg, 'string');
	const idx = argv.indexOf(arg);
	if (~idx) {
		const [, value] = argv.splice(idx, 2);
		return value;
	}
	return undefined;
};

const options = {
	limit: popArg(process.argv, '--limit'),
	min: popArg(process.argv, '--min'),
	limitTotal: popArg(process.argv, '--limit-total'),
};
const [,, PACKAGE, semverRange] = process.argv;
assert.equal(typeof PACKAGE, 'string', 'Package name required');

const round = (val, dec = 0) => {
	const m = Math.pow(10, dec);
	return Math.round((val + Number.EPSILON) * m) / m;
};

console.log(`Loading stats for ${PACKAGE}`);
let stats = (await getStats(PACKAGE))
const sum = sumDownloads(stats);
stats = stats.map((entry) => {
		return {
			...entry,
			get 'ratio(%)'() {
				return round(100 * entry.downloads / sum, 1);
			}
		}
	});

const show = (subset, totalSum) => {
	const tableSum = sumDownloads(subset);
	console.table(subset);

	console.log(`Ratio of downloads through versions shown in the table: ${round(100 * tableSum / totalSum, 2)}%`);
	console.log(`Total weekly downloads: ${totalSum.toLocaleString('en-US')}`);
};

show(filter(stats, { ...options, semverRange }), sum);
