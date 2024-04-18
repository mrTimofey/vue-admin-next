import type { AsyncComponentLoader, Component } from 'vue';
import { defineAsyncComponent } from 'vue';

const fields: { [name: string]: Component } = {};
Object.entries(import.meta.glob('./*.vue')).forEach(([path, importFn]) => {
	// remove './' and '.vue' parts
	fields[path.slice(2, -4)] = defineAsyncComponent(importFn as AsyncComponentLoader);
});

export type Resolver = (name: string) => Component | null;

export default class FormFields {
	private resolvers: Resolver[] = [(name) => fields[name] || null];

	getComponent(name: string): Component | null {
		for (const resolve of this.resolvers) {
			const component = resolve(name);
			if (component) {
				return component;
			}
		}
		return null;
	}

	addComponentResolver(resolver: Resolver) {
		if (this.resolvers.includes(resolver)) {
			throw new TypeError('This resolver is already added');
		}
		this.resolvers.push(resolver);
	}
}
