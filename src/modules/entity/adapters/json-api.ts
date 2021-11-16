import { inject } from 'mini-ioc';
import HttpClient, { HttpRequestError } from '../../http';
import { ValidationError } from '../adapter';
import type { IListParams, IListData, IItemParams, IItemData } from '../adapter';
import type IAdapter from '../adapter';

interface IJsonApiListResponse {
	data: IJsonApiItem[];
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
	if (typeof data !== 'object') {
		return false;
	}
	if (!data) {
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
		const key = err.source.pointer.replace(/^\/data\/attributes\//, '');
		if (!fieldErrors[key]) {
			fieldErrors[key] = [];
		}
		fieldErrors[key].push(err.title);
	});
	return new ValidationError(fieldErrors);
}

function adaptItemResponse({ data, included }: IJsonApiItemResponse, relatedItems: IItemData['relatedItems'] = {}, path: string[] = []): IItemData {
	const adapted: IItemData = {
		item: { id: data.id, ...data.attributes },
		relatedItems,
	};

	function addRelatedItem(key: string, item: { type: string; id: string }) {
		if (!adapted.relatedItems[key]) {
			adapted.relatedItems[key] = {};
		}
		const includedItem = included?.find((cmp) => cmp.id === item.id && cmp.type === item.type);
		if (!includedItem) {
			return;
		}
		const fieldPath = path.map((str) => `${str}.`).join('') + key;
		if (!adapted.relatedItems[fieldPath]) {
			adapted.relatedItems[fieldPath] = {};
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
		if (params.offset) {
			urlParams.push(['page[offset]', params.offset.toString()]);
		}
		if (params.limit) {
			urlParams.push(['page[limit]', params.limit.toString()]);
		}
		if (params.filters) {
			Object.entries(params.filters).forEach(([key, value]) => {
				urlParams.push([`filter[${key}]`, `${value}`]);
			});
		}
		const urlParamsString = `?${urlParams.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
		const { body } = await this.http.get<IJsonApiListResponse>(`${endpoint}${urlParamsString.length > 1 ? urlParamsString : ''}`, {
			'Content-Type': 'application/vnd.api+json',
		});
		return {
			items: body.data.map((item) => ({
				id: item.id,
				...item.attributes,
			})),
			// TODO pagination
		};
	}

	async getItem(endpoint: string, { id }: IItemParams): Promise<IItemData> {
		const { body } = await this.http.get<IJsonApiItemResponse>(`${endpoint}/${id}`, {
			'Content-Type': 'application/vnd.api+json',
		});
		return adaptItemResponse(body);
	}

	async deleteItem(endpoint: string, id: string): Promise<void> {
		await this.http.delete(`${endpoint}/${id}`, null, {
			'Content-Type': 'application/vnd.api+json',
		});
	}

	async saveItem(endpoint: string, item: Record<string, unknown>, id?: string): Promise<IItemData> {
		const attributes = { ...item };
		delete attributes.id;
		try {
			const { body } = await this.http.fetch<IJsonApiItemResponse>(
				id ? `${endpoint}/${id}` : endpoint,
				id ? 'PATCH' : 'POST',
				{ data: { attributes } },
				{
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
