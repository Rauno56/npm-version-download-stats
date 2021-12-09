import { strict as assert } from 'assert';

export const sortByDownloads = (a, b) => {
	return a.downloads > b.downloads ? -1 : 1;
};

export const sumDownloads = (stats) => {
	return stats.reduce((acc, el) => {
		return (acc ?? 0) + el.downloads;
	}, 0);
};

export const ensurePositiveNumber = (nr) => {
	if (typeof nr === 'number') {
		return nr;
	}
	if (typeof nr === 'string') {
		return parsePositiveNumber(nr);
	}
};

export const parsePositiveNumber = (nr, upperBound = Infinity) => {
	assert.equal(typeof nr, 'string');
	nr = parseFloat(nr);
	assert.ok(!isNaN(nr), `Parsing positive number failed: ${nr}`);
	assert.ok(nr >= 0, `Number is negative: ${nr}`);
	assert.ok(nr <= upperBound, `Number is out of bound(..${upperBound}): ${nr}`);

	return nr;
};
