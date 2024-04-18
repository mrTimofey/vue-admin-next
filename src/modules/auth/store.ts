import { inject } from 'mini-ioc';
import ReactiveStore from '../reactive-store';
import AuthProvider, { WrongCredentialsError } from './provider';
import type { ICredentials, IAuthenticationResult } from './provider';
import Translator from '../i18n';
import KeyValueStorage from '../key-value-storage';

interface IState {
	authenticating: boolean;
	authenticationError: string;
	userId: string;
	userName: string;
	accessToken: string;
	refreshToken: string;
}

export default class AuthStore extends ReactiveStore<IState> {
	constructor(
		protected provider = inject(AuthProvider),
		protected trans = inject(Translator),
		protected persistentStorage = inject(KeyValueStorage),
	) {
		super();
		this.onTokensUpdate = this.onTokensUpdate.bind(this);
	}

	getInitialState(): IState {
		return {
			authenticating: false,
			authenticationError: '',
			userId: '',
			userName: '',
			accessToken: '',
			refreshToken: '',
		};
	}

	onTokensUpdate(tokens: IAuthenticationResult) {
		Object.assign(this.state, tokens);
		this.saveToStorage();
	}

	get isAuthorized(): boolean {
		return !!this.state.accessToken;
	}

	get isAuthenticating(): boolean {
		return this.state.authenticating;
	}

	get error(): string {
		return this.state.authenticationError;
	}

	get userName(): string {
		return this.state.userName;
	}

	private syncWithProvider() {
		this.provider.removeTokensUpdateListener(this.onTokensUpdate);
		this.provider.addTokensUpdateListener(this.onTokensUpdate);
		this.provider.authorizeHttpRequests(this.state.accessToken, this.state.refreshToken);
	}

	async authenticate(credentials: ICredentials): Promise<void> {
		this.state.authenticating = true;
		this.state.authenticationError = '';
		try {
			this.onTokensUpdate(await this.provider.authenticate(credentials));
		} catch (err) {
			if (err instanceof WrongCredentialsError) {
				this.state.authenticationError = err.message || this.trans.get('wrongCredentials');
			} else {
				throw err;
			}
		} finally {
			this.state.authenticating = false;
		}
	}

	recoverAccessToken(): Promise<unknown> {
		return this.provider.waitRecoveredAccessToken(this.state.refreshToken);
	}

	logout(): void {
		this.resetState();
		this.provider.logout();
		this.saveToStorage();
	}

	saveToStorage(): void {
		this.persistentStorage.set('accessToken', this.state.accessToken);
		this.persistentStorage.set('refreshToken', this.state.refreshToken);
	}

	loadFromStorage(): void {
		this.state.accessToken = this.persistentStorage.get('accessToken') || '';
		this.state.refreshToken = this.persistentStorage.get('refreshToken') || '';
		this.syncWithProvider();
	}
}
