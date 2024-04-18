export const DOTS = -1;

export function range(first: number, second: number) {
	const from = Math.min(first, second);
	const to = Math.max(first, second);
	const res = [];
	for (let i = from; i <= to; i += 1) {
		res.push(i);
	}
	return res;
}

export function getPageLinks(currentPage: number, lastPage: number) {
	// show all page buttons
	if (lastPage < 8) {
		return range(1, lastPage);
	}

	// show 1 to 3 segments divided by '...'
	const items = currentPage >= 5 ? [1, DOTS] : [];

	if (currentPage < 3) {
		items.push(...range(1, 3));
	} else if (currentPage < 5) {
		items.push(...range(1, currentPage + 1));
	} else if (currentPage > lastPage - 2) {
		items.push(...range(lastPage - 2, lastPage));
	} else if (currentPage > lastPage - 4) {
		items.push(...range(currentPage - 1, lastPage));
	} else {
		items.push(...range(currentPage - 1, currentPage + 1));
	}

	if (currentPage <= lastPage - 4) {
		items.push(DOTS, lastPage);
	}

	return items;
}

function getUrlPrefixForPage(url: string) {
	const href = url.replace(/([?&])page=[0-9]+&?/, '$1');
	if (href.endsWith('&') || href.endsWith('?')) {
		return href;
	}
	return `${href}${href.includes('?') ? '&' : '?'}`;
}

export function getPageUrlGenerator(url: string) {
	const urlPrefix = getUrlPrefixForPage(url);
	return (page: number) => (page > 1 ? `${urlPrefix}page=${page}` : urlPrefix.slice(0, -1));
}
