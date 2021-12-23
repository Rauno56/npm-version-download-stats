import parser from 'yargs-parser'
import { strict as assert } from 'assert';

export const isStringOrNumber = (value) => {
	if (typeof value === 'string') return true;
	if (typeof value === 'number') return true;
	return false;
};

export const sortByDownloads = (a, b) => {
	return a.downloads > b.downloads ? -1 : 1;
};

export const sumDownloads = (stats) => {
	return stats.reduce((acc, el) => {
		return (acc ?? 0) + el.downloads;
	}, 0);
};

export const limitByTotalDownloadCount = (stats, count) => {
	let currentCount = 0;
	return stats.filter((el) => {
		const res = currentCount <= count;
		currentCount += el.downloads;
		return res;
	});
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

export const reverseObject = (obj) => {
	return Object.entries(obj)
		.reduce((acc, [value, key]) => {
			acc[key] = acc[key] || [];
			acc[key].push(value);
			return acc;
		}, {});
};

export const parseCliArgs = () => {
	const opts = parser(process.argv.slice(2), {
		alias: {
			showDeprecated: ['deprecated'],
		},
		boolean: [
			'showDeprecated',
		],
		string: [
			'limitTotal',
			'limit',
			'min',
		],
		default: {
			showDeprecated: true,
		},
		configuration: {
			// remove duplicate key-value pairs from the resulting object
			'strip-dashed': true,
			'strip-aliased': true,
			// to avoid positional args to be parsed into numbers. semver lib doesn't like literal 1.
			'parse-positional-numbers': false,
		},
	});
	const {
		_,
		limit,
		min,
		limitTotal,
		showDeprecated,
		...rest
	} = opts;
	const restKeys = Object.keys(rest);

	if (restKeys.length) {
		throw new Error(`Unrecognized option${restKeys.length > 1 ? 's' : ''}: ${restKeys.join(', ')}.`);
	}

	const [packageName, semverRange] = _;
	return {
		packageName,
		semverRange,
		limit,
		min,
		limitTotal,
		showDeprecated,
	};
};

export const round = (val, dec = 0) => {
	const m = Math.pow(10, dec);
	return Math.round((val + Number.EPSILON) * m) / m;
};
