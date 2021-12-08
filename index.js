import got from 'got';
import { strict as assert } from 'assert';
import { parse } from 'node-html-parser';

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

export default fetch;
