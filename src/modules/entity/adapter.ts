export interface IListParams {
	offset: number;
	limit?: number;
	filters?: Record<string, unknown>;
	include?: string[];
	query?: Record<string, string>;
}

export interface IListData {
	items: Record<string, unknown>[];
	offset?: number;
	limit?: number;
	total?: number;
}

export interface IItemParams {
	id: string;
	include?: string[];
	query?: Record<string, string>;
}

export interface IItemData {
	item: Record<string, unknown>;
	relatedItems: Record<string, Record<string, Record<string, unknown>>>;
}

export class ValidationError extends TypeError {
	constructor(
		public fieldErrors: Record<string, string[]>,
		message = 'Validation error',
	) {
		super(message);
	}

	get fieldErrorsText() {
		return Object.entries(this.fieldErrors)
			.map(([, messages]) => messages.join('; '))
			.join('. ');
	}

	toString() {
		return this.fieldErrorsText;
	}
}

export default interface IAdapter {
	getList(endpoint: string, params: IListParams): Promise<IListData>;
	getItem(endpoint: string, params: IItemParams): Promise<IItemData>;
	deleteItem(endpoint: string, id: string): Promise<void>;

	/**
	 * Save entity item.
	 * @param endpoint entity endpoint
	 * @param item entity item object
	 * @param id entity identifier (omit to create)
	 * @throws {ValidationError} when validation failed
	 */
	saveItem(endpoint: string, item: Record<string, unknown>, id?: string): Promise<IItemData>;
}
