import type { RouteRecordRaw } from 'vue-router';

export default [
	{
		name: 'index',
		path: '/',
		component: () => import('./pages/index.vue'),
	},
	{
		name: 'uiKit',
		path: '/ui-kit',
		component: () => import('./pages/ui-kit.vue'),
	},
	{
		name: 'entityView',
		path: '/entity/view/:entity/:view?',
		props: true,
		component: () => import('./pages/entity-view.vue'),
	},
	{
		name: 'entityItem',
		path: '/entity/item/:entity/:id?',
		props: true,
		component: () => import('./pages/entity-item.vue'),
	},
] as RouteRecordRaw[];
