import { defineAsyncComponent } from 'vue';
import type { Component, AsyncComponentLoader } from 'vue';
import type { Resolver } from '../form/fields';

type PossiblyAsyncComponent = Component | AsyncComponentLoader;

export interface IField {
	// human readable field title
	label?: string;
	// entity item object property key (some fields don't require it)
	key?: string;
	// hidden field will be sent to API but is never shown on forms
	hidden?: boolean;
	// field type (string, boolean, array...)
	type?: string;
	// default value for new items
	default?: unknown;
	// field component properties (based on type)
	props?: Record<string, unknown>;
	// properties for creating only
	createProps?: Record<string, unknown>;
	// properties for update only
	updateProps?: Record<string, unknown>;
	// show field on create form only
	createOnly?: boolean;
	// show field on update form only
	updateOnly?: boolean;
}

export interface IView {
	// view type (table, list, tree...)
	type?: string;
	// human readable view title
	title?: string;
	// fields used as filters for this view
	filters?: IField[];
	// always use these filters for the list request
	staticFilters?: Record<string, unknown>;
	// add include query to fetch related entities
	include?: string[];
	// custom query parameters
	query?: Record<string, string>;
	// view component properties (based on type)
	props?: Record<string, unknown>;
	// items per page
	perPage?: number;
	// per page selector options
	perPageOptions?: number[];
}

export interface IForm {
	// form fields
	fields: IField[];
	// fields layout config
	layout?: PossiblyAsyncComponent;
	// add include query to fetch related entities
	include?: string[];
	// custom query parameters
	query?: Record<string, string>;
	// list of related items path to replace related item id's with the related objects
	inlineRelated?: string[];
}

export interface IEntityMeta {
	// entity object property name, used for entity instance identification and as a URL path segment
	itemUrlKey?: string;
	// human readable entity name
	title?: string;
	// API type (rest, graphql, grpc...)
	apiType?: string;
	// API endpoint
	apiEndpoint: string;
	// how this entity can be viewed (table, list, tree...)
	views: Record<string, IView>;
	// how this entity instances can be created/edited
	form?: IForm;
	createButtonText?: string;
	createPageTitle?: string;
	editPageTitle?: string;
	deleteDisabled?: boolean;
	createDisabled?: boolean;
	updateDisabled?: boolean;
}

export const entityMetaDefaults: Partial<IEntityMeta> = {
	itemUrlKey: 'id',
	apiType: 'jsonApi',
	createPageTitle: '{{=h.trans("newItem")}}',
	editPageTitle: '{{=h.trans("item")}} #{{=it.id}}',
	deleteDisabled: false,
	createDisabled: false,
	updateDisabled: false,
};

export const viewDefaults: Partial<IView> = {
	type: 'table',
	perPage: 25,
	perPageOptions: [5, 10, 25, 50, 100],
	include: [],
	query: {},
	staticFilters: {},
};

export const fieldDefaults: Partial<IField> = {
	key: '',
	type: 'text',
	props: {},
	createProps: {},
	updateProps: {},
	default: undefined,
	hidden: false,
};

export const formDefaults: Partial<IForm> = {
	layout: defineAsyncComponent(() => import('./forms/simple.vue')),
	fields: [],
	include: [],
	query: {},
	inlineRelated: [],
};

export interface IViewType {
	component: PossiblyAsyncComponent;
}

export interface IDisplayType {
	component: PossiblyAsyncComponent;
}

export interface IFieldType {
	component: PossiblyAsyncComponent;
}

export interface IRegisteredEntity extends Required<IEntityMeta> {
	slug: string;
	views: Record<string, Required<IView & { filters: Required<IField>[] }>>;
	form: Required<IForm> & { fields: Required<IField>[] };
}

function fillFields(fields: IField[]) {
	return fields.slice().map((field) => {
		const newField = { ...fieldDefaults, ...field };
		if (newField.key && newField.label == null) {
			newField.label = newField.key.split(/[-_\s]+/).join(' ');
			newField.label = newField.label.substring(0, 1).toUpperCase() + newField.label.substring(1);
		}
		return newField;
	});
}

const fields: { [name: string]: Component } = {};
Object.entries(import.meta.glob('./fields/*.vue')).forEach(([path, importFn]) => {
	// remove './fields' and '.vue' parts
	fields[path.slice(9, -4)] = defineAsyncComponent(importFn as AsyncComponentLoader);
});

export default class EntityManager {
	protected entities: Record<string, IRegisteredEntity> = {};
	protected viewTypes: Record<string, IViewType> = {};
	protected displayTypes: Record<string, IDisplayType> = {};
	protected fieldTypes: Record<string, IFieldType> = {};

	public readonly formFieldsResolver: Resolver = (name) => fields[name] || null;

	public registerEntity(slug: string, entity: IEntityMeta): this {
		const entityWithDefaults = { ...entityMetaDefaults, ...entity, slug };
		const views = { ...entityWithDefaults.views };
		Object.entries(entityWithDefaults.views).forEach(([key, view]) => {
			views[key] = { ...viewDefaults, ...view, filters: view.filters ? fillFields(view.filters) : [] } as Required<IView>;
		});
		entityWithDefaults.views = views;
		const form = { ...formDefaults, ...entityWithDefaults.form } as IForm;
		form.fields = fillFields(form.fields);
		entityWithDefaults.form = form;
		this.entities[slug] = entityWithDefaults as IRegisteredEntity;
		return this;
	}

	public getEntity(key: string): IRegisteredEntity | null {
		return this.entities[key] || null;
	}

	public registerViewType(key: string, view: IViewType): this {
		this.viewTypes[key] = view;
		return this;
	}

	public getViewType(key: string): IViewType | null {
		return this.viewTypes[key] || null;
	}

	public registerDisplayType(key: string, display: IDisplayType): this {
		this.displayTypes[key] = display;
		return this;
	}

	public getDisplayType(key: string): IDisplayType | null {
		return this.displayTypes[key] || null;
	}

	constructor() {
		this.registerViewType('table', {
			component: defineAsyncComponent(() => import('./views/table.vue')),
		});
		this.registerViewType('list', {
			component: defineAsyncComponent(() => import('./views/list.vue')),
		});
		this.registerViewType('tree', {
			component: defineAsyncComponent(() => import('./views/tree.vue')),
		});
		this.registerDisplayType('text', {
			component: defineAsyncComponent(() => import('./displays/text.vue')),
		});
		this.registerDisplayType('html', {
			component: defineAsyncComponent(() => import('./displays/html.vue')),
		});
		this.registerDisplayType('index', {
			component: defineAsyncComponent(() => import('./displays/index.vue')),
		});
		this.registerDisplayType('image', {
			component: defineAsyncComponent(() => import('./displays/image.vue')),
		});
		this.registerDisplayType('field', {
			component: defineAsyncComponent(() => import('./displays/field.vue')),
		});
		this.registerDisplayType('boolean', {
			component: defineAsyncComponent(() => import('./displays/boolean.vue')),
		});
	}
}
