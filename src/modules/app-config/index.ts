import { inject } from 'mini-ioc';
import type { RouteLocationRaw } from 'vue-router';
import Translator from '../i18n';
import ReactiveStore from '../reactive-store';

export interface INavItemBadge {
	content: string;
	tooltip?: string;
}

export interface INavItem {
	title: string;
	href?: string;
	to?: RouteLocationRaw;
	iconClass?: string;
	badges?: INavItemBadge[];
	children?: INavItem[];
}

export interface IState {
	title: string;
	homeLink: string;
	mainNav: INavItem[];
}

export default class AppConfig extends ReactiveStore<IState> {
	constructor(protected trans = inject(Translator)) {
		super();
	}

	getInitialState(): IState {
		return {
			title: 'AdminPanel',
			homeLink: '/',
			mainNav: [],
		};
	}

	setConfig(config: Partial<IState> & Partial<{ lang: string; fallbackLang: string }>): this {
		// TODO refactor
		if (config.lang) {
			this.trans.lang = config.lang;
		}
		if (config.fallbackLang) {
			this.trans.fallbackLang = config.fallbackLang;
		}
		const newState = { ...config };
		delete config.lang;
		delete config.fallbackLang;
		Object.assign(this.state, newState);
		return this;
	}

	get appTitle(): string {
		return this.state.title;
	}

	get appHomeLink(): string {
		return this.state.homeLink;
	}

	get mainNav(): INavItem[] {
		return this.state.mainNav;
	}

	get lang(): string {
		return this.trans.lang;
	}

	get fallbackLang(): string {
		return this.trans.fallbackLang;
	}
}
