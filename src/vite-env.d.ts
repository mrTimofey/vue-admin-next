/* eslint-disable @typescript-eslint/naming-convention */
/// <reference types="vite/client" />

interface ImportMetaEnv {
	LOCAL_STORAGE_KEY_PREFIX?: string;

	AUTH_AUTHENTICATE_ENDPOINT?: string;
	AUTH_REFRESH_ENDPOINT?: string;
	AUTH_LOGOUT_ENDPOINT?: string;

	AUTH_ACCESS_TOKEN_KEY?: string;
	AUTH_REFRESH_TOKEN_KEY?: string;
	AUTH_LOGIN_KEY?: string;
	AUTH_PASSWORD_KEY?: string;
	AUTH_REFRESH_TOKEN_REQUEST_KEY?: string;

	NOTIFICATION_DEFAULT_CLOSE_TIMEOUT_MS?: string;
}
