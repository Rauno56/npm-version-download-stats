import semver from 'semver';
import got from 'got';
import { strict as assert } from 'assert';
import { parse } from 'node-html-parser';
import vm from 'vm';
import {
	assertOneOf,
	ensurePositiveNumber,
	isStringOrNumber,
	limitByTotalDownloadCount,
	parsePositiveNumber,
	reverseObject,
	sortByDownloads,
	sortByTime,
	sortByVersion,
	sumDownloads,
} from './utils.js';

const sorters = {
	downloads: sortByDownloads,
	time: sortByTime,
	version: sortByVersion,
};

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
const parseFromHtml = (parsedBody) => {
	const root = parsedBody.querySelectorAll('#tabpanel-versions > div > ul > li');
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
const fromJsonData = (parsedBody) => {
	const root = parsedBody.querySelector('script[integrity]');
	const script = new vm.Script(root.rawText);
	const context = { window: {} };
	script.runInNewContext(context);
	const data = context.window.__context__?.context;
	const downloads = data?.versionsDownloads ?? {};
	const tags = reverseObject(data?.packument?.distTags || {});

	return (data?.packument?.versions || [])
		.map(({ version, date, dist, deprecated, ...el }) => {
			return {
				version,
				isDeprecated: !!deprecated,
				time: new Date(date.ts),
				tags: tags[version] ?? [],
				downloads: downloads[version] ?? 0,
			};
		});
};
const fetch = async (packageName) => {
	assert(packageName, 'Package name required');
	console.error('Fetching stats for', packageName);
	const { body } = await got(`https://www.npmjs.com/package/${packageName}?activeTab=versions`);
	const root = parse(body);
	const fromJson = fromJsonData(root);
	if (fromJson && fromJson.length) {
		return fromJson;
	}
	// fall back to parsing from HTML
	const fromHtml = parseFromHtml(root);
	if (fromHtml && fromHtml.length) {
		return fromHtml;
	}
	console.error('failed to parse');
	return [];
};

export const minFilterGen = (minimum, totalSum) => {
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
	const minFilter = minFilterGen(options.min, sum);

	stats = stats.filter((el) => {
		if (!options.showDeprecated && el.isDeprecated) {
			return false;
		}
		if (options.semverRange && !semver.satisfies(el.version, options.semverRange)) {
			return false;
		}
		if (minFilter && !minFilter(el)) {
			return false;
		}
		return true;
	});

	options.sort = options.sort ?? 'downloads';
	if (options.sort) {
		assertOneOf(options.sort, Object.keys(sorters));
		stats.sort(sorters[options.sort]);
	}
	if (isStringOrNumber(options.limit)) {
		stats = stats.slice(0, ensurePositiveNumber(options.limit));
	}
	if (isStringOrNumber(options.limitTotal)) {
		assert(options.limitTotal.endsWith('%'), '"limitTotal" is expected to be an percentage');
		const required = sum * parsePositiveNumber(options.limitTotal.slice(0, -1), 100) / 100;
		stats = limitByTotalDownloadCount(stats, required);
	}
	return stats;
};
export const fetchAndFilter = async (packageName, options) => {
	return filter(await fetch(packageName), options);
};

export default fetch;
