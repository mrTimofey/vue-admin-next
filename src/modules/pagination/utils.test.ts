import { describe, test, expect } from 'vitest';
import { DOTS, range, getPageLinks, getPageUrlGenerator } from './utils';

describe('range function', () => {
	const cases = [
		[-5, 3],
		[0, 7],
		[100, 105],
	];

	function testRangeResult(result: ReturnType<typeof range>, from: number, to: number) {
		expect(result.length).toStrictEqual(to - from + 1);
		expect(result[0]).toStrictEqual(from);
		expect(result[result.length - 1]).toStrictEqual(to);
		for (let i = 1; i < result.length; i += 1) {
			expect(result[i] - result[i - 1]).toStrictEqual(1);
		}
	}

	test.each(cases)('from %s to %s', (from, to) => {
		testRangeResult(range(from, to), from, to);
	});

	test.each(cases)('from %s to %s in reversed order', (from, to) => {
		testRangeResult(range(to, from), from, to);
	});

	test('single item array when both arguments are same', () => {
		const num = 1;
		const result = range(num, num);
		expect(result.length).toStrictEqual(1);
		expect(result[0]).toStrictEqual(num);
	});
});

describe('getPageLinks function', () => {
	test.each([
		// for 1-7 page count
		...range(1, 7).map<[number[], number, number]>((lastPage) => [range(1, lastPage), 1, lastPage]),

		// for 8 pages
		[[1, 2, 3, DOTS, 8], 1, 8],
		[[1, 2, 3, DOTS, 8], 2, 8],
		[[1, 2, 3, 4, DOTS, 8], 3, 8],
		[[1, 2, 3, 4, 5, DOTS, 8], 4, 8],
		[[1, DOTS, 4, 5, 6, 7, 8], 5, 8],
		[[1, DOTS, 5, 6, 7, 8], 6, 8],
		[[1, DOTS, 6, 7, 8], 7, 8],
		[[1, DOTS, 6, 7, 8], 8, 8],

		// for 100 pages
		[[1, DOTS, 9, 10, 11, DOTS, 100], 10, 100],
		[[1, DOTS, 98, 99, 100], 99, 100],
	])('links are %s when current page is %s and page count is %s', (expectedLinks, currentPage, lastPage) => {
		const links = getPageLinks(currentPage, lastPage);
		expect(links.length).toStrictEqual(expectedLinks.length);
		expectedLinks.forEach((expected, i) => {
			expect(links[i]).toStrictEqual(expected);
		});
	});

	// TODO: more tests
});

describe('getPageUrlGenerator function', () => {
	const baseCases = ['', '/', '/some/page', '/some/page?with=param', '/some/page?with=param&page=10', '/some/page?page=10&with=param'];
	const casesWithHost = baseCases.map((url) => `https://example.com${url}`);

	describe.each([...baseCases, ...casesWithHost])('when current URL is "%s"', (url) => {
		const gen = getPageUrlGenerator(url);
		const urlWithoutPage = gen(1);

		test('should remove page=1 param', () => {
			expect(urlWithoutPage).not.toContain('page=');
		});

		test('should add page=N param', () => {
			expect(gen(3)).toContain('page=3');
		});
	});
});
