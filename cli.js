#!/usr/bin/env node

import { strict as assert } from 'assert';
import * as util from 'util';
import getStats, { filter } from './src/index.js';
import {
	parseCliArgs,
	round,
	sumDownloads,
} from './src/utils.js';

const options = parseCliArgs();
assert.equal(typeof options.packageName, 'string', 'Package name required');

console.log(`Loading stats for ${options.packageName}`);
let stats = (await getStats(options.packageName));
const sum = sumDownloads(stats);
stats = stats.map((entry) => {
	return {
		...entry,
		get 'ratio(%)'() {
			return round(100 * entry.downloads / sum, 1);
		}
	};
});

const show = (subset, totalSum) => {
	const tableSum = sumDownloads(subset);
	const noDeprecated = !subset.some((entry) => {
		return entry.isDeprecated;
	});
	const formatted = subset.map((entry) => {
		const { ...rest } = entry;
		rest.time = rest.time.toISOString().substr(0, 10);
		return rest;
	});

	if (noDeprecated) {
		console.table(formatted, ['version', 'time', 'tags', 'downloads', 'ratio(%)']);
	} else {
		console.table(formatted, ['version', 'isDeprecated', 'time', 'tags', 'downloads', 'ratio(%)']);
	}

	console.log(`Ratio of downloads through versions shown in the table: ${round(100 * tableSum / totalSum, 2)}%`);
	console.log(`Total weekly downloads: ${totalSum.toLocaleString('en-US')}`);
};

console.log(options);
show(filter(stats, options), sum);
