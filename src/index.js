import semver from 'semver';
import got from 'got';
import { strict as assert } from 'assert';
import { parse } from 'node-html-parser';
import {
	ensurePositiveNumber,
	isStringOrNumber,
	limitByTotalDownloadCount,
	parsePositiveNumber,
	sortByDownloads,
	sumDownloads,
} from './utils.js';

const parseListItem = (htmlElement) => {
	const time = htmlElement.querySelector('time')?.getAttribute('dateTime');
	const tag = time ? null : htmlElement.querySelector('ul li code')?.rawText;

	return {
		version: htmlElement.querySelector('a')?.rawText,
		downloads: parseInt(htmlElement.querySelector('.downloads')?.rawText.replace(',', '')),
		time: time && new Date(time) || undefined,
		tag,
		tags: [],
		isTagEntry: !!tag,
	};
};
const fetch = async (packageName) => {
	assert(packageName, 'Package name required');
	const { body } = await got(`https://www.npmjs.com/package/${packageName}?activeTab=versions`);
	const root = parse(body).querySelectorAll('#tabpanel-versions > div > ul > li');
	const tags = new Map();
	const stats = root.map((el) => {
		const parsed = parseListItem(el);
		// if it's a tag entry store it for later and forget
		if (parsed.isTagEntry) {
			if (!tags.has(parsed.version)) {
				tags.set(parsed.version, []);
			}
			tags.get(parsed.version).push(parsed);
			return false;
		}
		// if not a tag entry, but was unable to parse time then it's probably header
		if (!parsed.time) {
			return false;
		}
		// if there's a previously stored tag entry for that version entry, add tags to this one
		if (tags.has(parsed.version)) {
			const tagNames = tags.get(parsed.version)
				.map((parsedTagEntry) => {
					return parsedTagEntry.tag;
				});

			tags.delete(parsed.version);

			parsed.tags.push(...tagNames);
		}

		// remap to clean unnecessary properties
		return {
			version: parsed.version,
			downloads: parsed.downloads,
			time: parsed.time,
			tags: parsed.tags,
		};
	}).filter(Boolean);

	// make sure all tags are mapped
	assert.equal(tags.size, 0);

	return stats;
};

const minFilterGen = (minimum, totalSum) => {
	if (!minimum) {
		return null;
	}
	if (typeof minimum === 'number') {
		return (el) => el.downloads >= minimum;
	}
	if (typeof minimum === 'string') {
		if (minimum.endsWith('%')) {
			assert(typeof totalSum === 'number', `totalSum not a number: ${totalSum}`);
			minimum = totalSum * parsePositiveNumber(minimum.slice(0, -1), 100) / 100;
			return minFilterGen(minimum);
		}
		return minFilterGen(parsePositiveNumber(minimum));
	}
	assert.fail(`Invalid minimum: ${minimum}`);
};
export const filter = (stats, options = {}) => {
	const sum = sumDownloads(stats);
	const minFilter = minFilterGen(options?.min, sum);

	stats = stats.filter((el) => {
		if (options?.semverRange && !semver.satisfies(el.version, options.semverRange)) {
			return false;
		}
		if (minFilter && !minFilter(el)) {
			return false;
		}
		return true;
	});
	if (options?.sort ?? true) {
		stats.sort(sortByDownloads);
	}
	if (isStringOrNumber(options?.limit)) {
		stats = stats.slice(0, ensurePositiveNumber(options.limit));
	}
	if (isStringOrNumber(options?.limitTotal)) {
		assert(options.limitTotal.endsWith('%'), '"limitTotal" is expected to be an percentage');
		const required = sum * parsePositiveNumber(options.limitTotal.slice(0, -1), 100) / 100;
		stats = limitByTotalDownloadCount(stats, required);
	}
	return stats;
};
export const fetchAndFilter = async (packageName, options) => {
	return filter(await fetch(packageName), options);
};


// semver check
assert.deepEqual(
	filter([{ version: '1.2.3' }, { version: '2.2.4' }]),
	[{ version: '1.2.3' }, { version: '2.2.4' }],
);
assert.deepEqual(
	filter([{ version: '1.2.3' }, { version: '2.2.4' }], { semverRange: '1' }),
	[{ version: '1.2.3' }],
);
assert.deepEqual(
	filter([{ version: '1.2.3' }, { version: '2.2.4' }], { semverRange: '1.2.3 || 2.2.4' }),
	[{ version: '1.2.3' }, { version: '2.2.4' }],
);

// sort
assert.deepEqual(
	filter([{ downloads: 10 }, { downloads: 100 }]),
	[{ downloads: 100 }, { downloads: 10 }],
);
assert.deepEqual(
	filter([{ downloads: 10 }, { downloads: 100 }], { sort: true }),
	[{ downloads: 100 }, { downloads: 10 }],
);
assert.deepEqual(
	filter([{ downloads: 10 }, { downloads: 100 }], { sort: false }),
	[{ downloads: 10 }, { downloads: 100 }],
);

// minFilterGen
assert.equal(minFilterGen(), null);
assert.equal(minFilterGen(10)({ downloads: 11 }), true);
assert.equal(minFilterGen(10)({ downloads: 10 }), true);
assert.equal(minFilterGen(10)({ downloads:  9 }), false);
assert.equal(minFilterGen('10')({ downloads: 11 }), true);
assert.equal(minFilterGen('10')({ downloads: 10 }), true);
assert.equal(minFilterGen('10')({ downloads:  9 }), false);
assert.equal(minFilterGen('10%', 100)({ downloads: 11 }), true);
assert.equal(minFilterGen('10%', 100)({ downloads: 10 }), true);
assert.equal(minFilterGen('10%', 100)({ downloads:  9 }), false);

assert.equal(minFilterGen('10.1%', 999)({ downloads: 102 }), true);
assert.equal(minFilterGen('10.1%', 999)({ downloads: 101 }), true);
assert.equal(minFilterGen('10.1%', 999)({ downloads: 100 }), false);

assert.throws(() => minFilterGen('110%', 100), /bound/);
assert.throws(() => minFilterGen('-10', 100), /negative/);
assert.throws(() => minFilterGen('-10%', 100), /negative/);

// min nr
assert.deepEqual(
	filter([{ downloads: 100 }, { downloads: 10 }], { min: 12 }),
	[{ downloads: 100 }],
);
assert.deepEqual(
	filter([{ downloads: 100 }, { downloads: 10 }], { min: '12' }),
	[{ downloads: 100 }],
);
assert.deepEqual(
	filter([{ downloads: 100 }, { downloads: 10 }], { min: '10%' }),
	[{ downloads: 100 }],
);

// limit
assert.deepEqual(
	filter([{ downloads: 100 }, { downloads: 10 }], { limit: 3 }),
	[{ downloads: 100 }, { downloads: 10 }],
);
assert.deepEqual(
	filter([{ downloads: 100 }, { downloads: 10 }], { limit: 1 }),
	[{ downloads: 100 }],
);
assert.deepEqual(
	filter([{ downloads: 100 }, { downloads: 10 }], { limit: 0 }),
	[],
);

// limitTotal
assert.deepEqual(
	filter([{ downloads: 90 }, { downloads: 10 }], { limitTotal: '100%' }),
	[{ downloads: 90 }, { downloads: 10 }],
);
assert.deepEqual(
	filter([{ downloads: 90 }, { downloads: 10 }], { limitTotal: '89%' }),
	[{ downloads: 90 }],
);


export default fetch;
