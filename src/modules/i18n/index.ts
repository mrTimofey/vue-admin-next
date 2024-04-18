import ReactiveStore from '../reactive-store';

export type LangDefinition = Record<string, string>;

export type LangLoader = () => Promise<LangDefinition | { default: LangDefinition }>;

export interface IState {
	fallbackLang: string;
	lang: string;
	langs: Record<string, LangDefinition>;
}

export default class Translator extends ReactiveStore<IState> {
	langLoaders: Record<string, LangLoader> = {
		en: () => import('./langs/en'),
		ru: () => import('./langs/ru'),
	};

	getInitialState(): IState {
		return {
			fallbackLang: 'en',
			lang: typeof window !== 'undefined' && window.document.documentElement.lang ? window.document.documentElement.lang : 'en',
			langs: {},
		};
	}

	async loadLang(key: string): Promise<void> {
		if (!this.state.langs[key]) {
			const lang = await this.langLoaders[key]();
			this.state.langs[key] = (typeof lang.default === 'object' ? lang.default : lang) as LangDefinition;
		}
	}

	protected ensureLangLoaded(): void {
		[this.state.lang, this.state.fallbackLang].forEach((key) => this.loadLang(key));
	}

	get(key: string): string {
		this.ensureLangLoaded();
		return this.state.langs?.[this.state.lang]?.[key] || this.state.langs?.[this.state.fallbackLang]?.[key] || key;
	}

	set lang(key: string) {
		this.state.lang = key;
	}

	get lang(): string {
		return this.state.lang;
	}

	set fallbackLang(key: string) {
		this.state.fallbackLang = key;
	}

	get fallbackLang(): string {
		return this.state.fallbackLang;
	}

	registerLang(key: string, loader: LangLoader): this {
		this.langLoaders[key] = loader;
		return this;
	}
}
