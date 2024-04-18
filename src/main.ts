import { createApp } from 'vue';
import type { RouteLocationRaw, Router, RouteRecordRaw, RouterHistory } from 'vue-router';
import { createRouter, createWebHistory, createWebHashHistory, createMemoryHistory } from 'vue-router';
import Container from 'mini-ioc';
import { injectKey } from 'mini-ioc-vue';
import routes from './routes';
import type { AppProps } from './app.vue';
import App from './app.vue';
import HttpClient from './modules/http';
import FetchJsonClient from './modules/http/fetch-json-client';
import AuthProvider from './modules/auth/provider';
import PublicAuthProvider from './modules/auth/providers/public';
import TemplateEngine from './modules/template';
import Translator from './modules/i18n';
import EntityManager from './modules/entity';
import FormFields from './modules/form/fields';

// ensure that every module is bundled
import.meta.glob(['./modules/**.ts', '!**.test.ts', '!**.spec.ts']);

export const enum HistoryMode {
	/**
	 * The application fully controls URL to persist its state.
	 */
	Spa = 'spa',
	/**
	 * The application uses URL hash to persist its state.
	 */
	Hash = 'hash',
	/**
	 * The application doesn't persist its state.
	 */
	Memory = 'memory',
}

export default class VueAdminApp {
	protected container = new Container();
	protected routes = [...routes];
	protected router: Router | null = null;
	protected historyMode = HistoryMode.Spa;
	protected basePath?: string = undefined;

	constructor() {
		// set default implementations
		this.container.bind(HttpClient, FetchJsonClient);
		this.container.bind(AuthProvider, PublicAuthProvider);
		// make container itself resolvable
		this.container.registerResolver(Container, () => this.container);
		this.container.registerResolver(TemplateEngine, () => {
			const engine = new TemplateEngine();
			this.registerTemplateHelpers(engine);
			return engine;
		});
		this.container.registerResolver(FormFields, () => {
			const formFields = new FormFields();
			this.registerFieldResolvers(formFields);
			return formFields;
		});
	}

	protected registerTemplateHelpers(engine: TemplateEngine): void {
		engine.registerHelper('trans', (key: string): string => this.container.get(Translator).get(key));
		engine.registerHelper('route', (route: RouteLocationRaw): string => this.router?.resolve(route).href ?? route.toString());
	}

	protected registerFieldResolvers(formFields: FormFields): void {
		formFields.addComponentResolver(this.container.get(EntityManager).formFieldsResolver);
	}

	protected createVueRouterHistory(): RouterHistory {
		switch (this.historyMode) {
			case HistoryMode.Memory:
				return createMemoryHistory(this.basePath);
			case HistoryMode.Hash:
				return createWebHashHistory(this.basePath);
			case HistoryMode.Spa:
			default:
				return createWebHistory(this.basePath);
		}
	}

	protected createVueRouter(): Router {
		return createRouter({
			history: this.createVueRouterHistory(),
			routes: this.routes,
		});
	}

	/**
	 * Sets navigation state management type. SPA mode is default.
	 * @see HistoryMode
	 * @param mode mode
	 */
	setHistoryMode(mode: HistoryMode): this {
		this.historyMode = mode;
		return this;
	}

	/**
	 * Sets base path. Base path is used as a prefix for navigation links.
	 * @param path base path
	 */
	setBasePath(path: string): this {
		this.basePath = path;
		return this;
	}

	/**
	 * Add route to the app Vue router instance.
	 * @param route route definition
	 */
	addRoute(route: RouteRecordRaw): this {
		this.routes.push(route);
		return this;
	}

	/**
	 * Returns IoC container. This is the entry point for anything you wish to customize.
	 */
	getIocContainer(): Container {
		return this.container;
	}

	/**
	 * Mount administration panel app to a DOM element.
	 * @param target CSS selector or DOM element
	 */
	mount(target: string | Element, props?: AppProps): void {
		this.router = this.createVueRouter();
		createApp(App, props).use(this.router).provide(injectKey, this.container).mount(target);
	}
}
