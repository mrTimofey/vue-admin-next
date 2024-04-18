import Container, { inject } from 'mini-ioc';
import type { IRegisteredEntity } from '..';
import ReactiveStore from '../../reactive-store';
import type IAdapter from '../adapter';
import adapters from '../adapters';
import EntityAbilityGuard from '../ability-guard';

export type ListItem = Record<string, unknown>;

export interface IState {
	loading: boolean;
	list: ListItem[];
	total: number;
	perPage: number;
	offset: number;
	page: number;
}

export interface IApiOptions {
	page?: number;
	perPage?: number;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export default abstract class EntityBaseStore<T extends object> extends ReactiveStore<T> {
	protected entity: IRegisteredEntity | null = null;

	constructor(
		protected ioc = inject(Container),
		protected abilityGuard = inject(EntityAbilityGuard),
	) {
		super();
	}

	protected async getAdapter(): Promise<IAdapter> {
		if (!this.entity) {
			throw new Error('Entity not set');
		}
		if (!adapters[this.entity.apiType]) {
			throw new Error(`Entity adapter '${this.entity.apiType}' is not registered`);
		}
		return this.ioc.get(await adapters[this.entity.apiType]());
	}

	get entityMeta() {
		return this.entity;
	}

	get abilities(): Record<string, boolean> {
		return {
			create: !!this.entity?.form.fields.length && !this.entity.createDisabled && this.abilityGuard.can('create', this.entity),
			update: !!this.entity?.form.fields.length && !this.entity.updateDisabled && this.abilityGuard.can('update', this.entity),
			delete: !!this.entity && !this.entity.deleteDisabled && this.abilityGuard.can('delete', this.entity),
		};
	}
}
