import type { IRegisteredEntity } from '..';
import type IAdapter from '../adapter';
import adapters from '../adapters';
import EntityBaseStore from './base';

export type ListItem = Record<string, unknown>;

export interface IState {
	loading: boolean;
	list: ListItem[];
	loadingItems: Set<ListItem>;
	total: number;
	perPage: number;
	offset: number;
	page: number;
	error: Error | null;
}

export interface IApiOptions {
	page?: number;
	perPage?: number;
	filters?: Record<string, unknown>;
}

export default class EntityListStore extends EntityBaseStore<IState> {
	protected entity: IRegisteredEntity | null = null;

	protected getInitialState(): IState {
		return {
			loading: false,
			loadingItems: new Set(),
			list: [],
			total: -1,
			perPage: 0,
			offset: -1,
			page: 1,
			error: null,
		};
	}

	protected async itemAction(item: ListItem, fn: (args: { entity: IRegisteredEntity; adapter: IAdapter; itemKey: string }) => Promise<unknown>) {
		if (!this.entity) {
			return;
		}
		const itemKey = (item as unknown as Record<string, string>)[this.entity.itemUrlKey];
		if (!itemKey) {
			return;
		}
		this.state.loadingItems.add(item);
		try {
			const adapter = await this.getAdapter();
			await fn({ entity: this.entity, adapter, itemKey });
		} finally {
			this.state.loadingItems.delete(item);
		}
	}

	public async reload({ page = 1, perPage, filters }: IApiOptions = {}): Promise<void> {
		if (!this.entity) {
			return;
		}
		this.state.loading = true;
		this.state.page = page;
		if (perPage) {
			this.state.perPage = perPage;
		}
		try {
			const adapter = await this.getAdapter();
			const res = await adapter.getList(this.entity.apiEndpoint, {
				offset: perPage ? perPage * (page - 1) : 0,
				limit: perPage,
				filters,
			});
			this.state.list = res.items;
			this.state.offset = res.offset || -1;
			this.state.perPage = res.limit || -1;
			this.state.page = this.state.perPage > 0 ? Math.ceil(this.state.offset / this.state.perPage) + 1 : 1;
			this.state.total = res.total || this.state.list.length;
		} catch (err) {
			this.state.error = err instanceof Error ? err : new Error(`${err}`);
		} finally {
			this.state.loading = false;
		}
	}

	public patchItem(item: ListItem, newValues: Record<string, unknown>) {
		return this.itemAction(item, ({ entity, adapter, itemKey }) => adapter.saveItem(entity.apiEndpoint, newValues, itemKey));
	}

	public async deleteItem(item: ListItem): Promise<void> {
		return this.itemAction(item, ({ entity, adapter, itemKey }) => adapter.deleteItem(entity.apiEndpoint, itemKey));
	}

	public setEntity(entity: IRegisteredEntity | null): void {
		if (this.entity === entity) {
			return;
		}
		this.entity = entity;
		this.resetState();
		if (entity) {
			adapters[entity.apiType]();
		}
	}

	get loading(): boolean {
		return this.state.loading;
	}

	get total(): number {
		return this.state.total;
	}

	get items(): ListItem[] {
		return this.state.list;
	}

	get page(): number {
		return this.state.page;
	}

	get lastPage(): number {
		return this.state.perPage > 0 ? Math.ceil(this.state.total / this.state.perPage) : 1;
	}

	get perPage(): number {
		return this.state.perPage;
	}

	get offset(): number {
		return this.state.offset;
	}

	get hasPagination(): boolean {
		return this.state.perPage > 0;
	}

	get abilities(): Record<string, boolean> {
		// TODO abilities
		return {
			create: !!this.entity?.form.fields.length,
			edit: !!this.entity?.form.fields.length,
			delete: !!this.entity,
		};
	}

	get loadingItems(): Set<ListItem> {
		return this.state.loadingItems;
	}

	get error(): Error | null {
		return this.state.error;
	}
}
