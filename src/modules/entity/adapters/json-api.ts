import { inject } from 'mini-ioc';
import HttpClient, { HttpRequestError } from '../../http';
import { ValidationError } from '../adapter';
import type { IListParams, IListData, IItemParams, IItemData } from '../adapter';
import type IAdapter from '../adapter';

interface IJsonApiListResponse {
	data: IJsonApiItem[];
	included?: IJsonApiItem[];
	meta?: Record<string, unknown> & { page?: Record<string, number> };
}

interface IJsonApiRelationshipData {
	id: string;
	type: string;
}

interface IJsonApiItem {
	id: string;
	type: string;
	attributes: Record<string, unknown>;
	relationships?: Record<string, { data: IJsonApiRelationshipData | IJsonApiRelationshipData[] }>;
}

interface IJsonApiItemResponse {
	data: IJsonApiItem;
	included?: IJsonApiItem[];
}

function isValidationMessageError(data: unknown): data is { source: { pointer: string }; title: string } {
	if (typeof data !== 'object' || !data) {
		return false;
	}
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	return !!(data.source?.pointer && data.title);
}

function createValidationError(data: unknown): ValidationError {
	const errors: unknown[] = Array.isArray(data) ? data : [data];
	const fieldErrors: Record<string, string[]> = {};
	errors.filter(isValidationMessageError).forEach((err) => {
		const key = err.source.pointer.replace(/^\/data\/attributes\//, '').replace(/\//g, '.');
		if (!fieldErrors[key]) {
			fieldErrors[key] = [];
		}
		fieldErrors[key].push(err.title);
	});
	return new ValidationError(fieldErrors);
}

function getFirstNumber(...args: unknown[]): number {
	return args.find<number>((arg): arg is number => typeof arg === 'number') ?? NaN;
}

function mixAttrsAndRelations(item: IJsonApiItem, included: IJsonApiListResponse['included'], depth = 0): Record<string, unknown> {
	const mixed: Record<string, unknown> = { id: item.id, ...item.attributes };
	if (!item.relationships || !included?.length || depth > 10) {
		return mixed;
	}
	Object.entries(item.relationships).forEach(([key, value]) => {
		if (Array.isArray(value.data)) {
			const itemValue: Record<string, unknown>[] = [];
			value.data.forEach((relation) => {
				const includedItem = included.find(({ type, id }) => id === relation.id && type === relation.type);
				if (includedItem) {
					itemValue.push(mixAttrsAndRelations(includedItem, included, depth + 1));
				}
			});
			mixed[key] = itemValue;
		} else if (value.data) {
			const relation = value.data;
			const includedItem = included.find(({ type, id }) => id === relation.id && type === relation.type);
			mixed[key] = includedItem ? mixAttrsAndRelations(includedItem, included, depth + 1) : null;
		} else {
			mixed[key] = null;
		}
	});
	return mixed;
}

function adaptListResponse({ data, included, meta }: IJsonApiListResponse): IListData {
	const result: IListData = {
		items: data.map((item) => mixAttrsAndRelations(item, included)),
	};

	if (!meta) {
		return result;
	}

	const total = getFirstNumber(meta.total, meta.totalCount, meta.page?.total, meta.page?.totalCount);
	if (Number.isNaN(total)) {
		return result;
	}
	result.total = total;

	const offset = getFirstNumber(meta.offset, meta.pageOffset, meta.page?.offset, meta.page?.pageOffset);
	if (Number.isNaN(offset)) {
		return result;
	}
	result.offset = offset;

	const limit = getFirstNumber(meta.limit, meta.pageLimit, meta.page?.limit, meta.page?.pageLimit);
	if (Number.isNaN(limit)) {
		return result;
	}
	result.limit = limit;

	return result;
}

function adaptItemResponse({ data, included }: IJsonApiItemResponse, relatedItems: IItemData['relatedItems'] = {}, path: string[] = []): IItemData {
	const adapted: IItemData = {
		item: { id: data.id, ...data.attributes },
		relatedItems,
	};

	function addRelatedItem(key: string, item: { type: string; id: string }) {
		// TODO something less stupid to prevent infinite cyclic links
		if (path.length > 10) {
			return;
		}
		const fieldPath = path.map((str) => `${str}.`).join('') + key;
		if (!adapted.relatedItems[fieldPath]) {
			adapted.relatedItems[fieldPath] = {};
		} else if (adapted.relatedItems[fieldPath][item.id]) {
			return;
		}
		const includedItem = included?.find((cmp) => cmp.id === item.id && cmp.type === item.type);
		if (!includedItem) {
			return;
		}
		adapted.relatedItems[fieldPath][item.id] = adaptItemResponse({ data: includedItem, included }, relatedItems, [...path, key]).item;
	}

	if (data.relationships) {
		Object.entries(data.relationships).forEach(([key, value]) => {
			if (Array.isArray(value.data)) {
				const itemValue: string[] = [];
				value.data.forEach((item) => {
					itemValue.push(item.id);
					addRelatedItem(key, item);
				});
				adapted.item[key] = itemValue;
			} else if (value.data) {
				adapted.item[key] = value.data.id;
				addRelatedItem(key, value.data);
			} else {
				adapted.item[key] = null;
			}
		});
	}

	return adapted;
}

export default class JsonApiAdapter implements IAdapter {
	constructor(protected http = inject(HttpClient)) {}

	async getList(endpoint: string, params: IListParams): Promise<IListData> {
		const urlParams: [string, string][] = [];
		if (params.offset && params.offset > 0) {
			urlParams.push(['page[offset]', params.offset.toString()]);
		}
		if (params.limit && params.limit > 0) {
			urlParams.push(['page[limit]', params.limit.toString()]);
		}
		if (params.filters) {
			Object.entries(params.filters).forEach(([key, value]) => {
				urlParams.push([`filter[${key}]`, `${value}`]);
			});
		}
		if (params.include?.length) {
			urlParams.push(['include', params.include.join(',')]);
		}
		if (params.query) {
			Object.entries(params.query).forEach(([k, v]) => {
				urlParams.push([k, `${v}`]);
			});
		}
		const urlParamsString = `?${urlParams.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
		const { body } = await this.http.get<IJsonApiListResponse>(`${endpoint}${urlParamsString.length > 1 ? urlParamsString : ''}`, {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Content-Type': 'application/vnd.api+json',
		});
		return adaptListResponse(body);
	}

	async getItem(endpoint: string, params: IItemParams): Promise<IItemData> {
		const urlParams: [string, string][] = [];
		if (params.include?.length) {
			urlParams.push(['include', params.include.join(',')]);
		}
		if (params.query) {
			Object.entries(params.query).forEach(([k, v]) => {
				urlParams.push([k, `${v}`]);
			});
		}
		const urlParamsString = urlParams.length ? `?${urlParams.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` : '';
		const { body } = await this.http.get<IJsonApiItemResponse>(`${endpoint}/${params.id}${urlParamsString}`, {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Content-Type': 'application/vnd.api+json',
		});
		return adaptItemResponse(body);
	}

	async deleteItem(endpoint: string, id: string): Promise<void> {
		await this.http.delete(`${endpoint}/${id}`, null, {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Content-Type': 'application/vnd.api+json',
		});
	}

	async saveItem(endpoint: string, item: Record<string, unknown>, id?: string): Promise<IItemData> {
		const attributes = { ...item };
		if (id) {
			delete attributes.id;
		}
		try {
			const { body } = await this.http.fetch<IJsonApiItemResponse>(
				id ? `${endpoint}/${id}` : endpoint,
				id ? 'PATCH' : 'POST',
				{ data: { attributes } },
				{
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'Content-Type': 'application/vnd.api+json',
				},
			);
			return adaptItemResponse(body);
		} catch (err) {
			if (err instanceof HttpRequestError && err.res) {
				throw createValidationError(err.res.body.errors);
			}
			throw err;
		}
	}
}
