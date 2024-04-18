/* eslint-disable max-classes-per-file */
import collection from '../collection';

export interface IHttpRequest<T = unknown> {
	url: string;
	method: string;
	body: T;
	headers: Record<string, string>;
	metadata: Record<symbol, unknown>;
}

export interface IUploadProgressData {
	loaded: number;
	total: number;
}

export interface IUploadRequest<T extends Blob = Blob> extends IHttpRequest<T> {
	onProgress?(e: IUploadProgressData): void;
}

export interface IHttpResponse<T = unknown> {
	body: T;
	headers: {
		get(key: string): string | null;
		has(key: string): boolean;
	};
	status: number;
	statusText: string;
}

/**
 * HTTP error containing request object and response object if server has answered.
 */
export class HttpRequestError<T> extends Error {
	constructor(
		public req: IHttpRequest,
		public res: IHttpResponse<T> | null,
	) {
		super('HTTP request error');
	}
}

/**
 * Request interceptor.
 * It can modify request object before sending.
 */
export type RequestInterceptor = (req: IHttpRequest) => void;

/**
 * HTTP error handler.
 * It can deal with errors and retry sending request.
 * If retry is called without request argument, same request object will be used.
 */
export type ErrorHandler = (req: HttpRequestError<unknown>, retry: (req?: IHttpRequest) => Promise<IHttpResponse<unknown>>) => Promise<IHttpResponse<unknown> | null>;

function isErrorStatus(status: number) {
	return status === 0 || (status >= 400 && status < 600);
}

export default abstract class HttpClient {
	protected requestInterceptors = collection<RequestInterceptor>();
	protected errorHandlers = collection<ErrorHandler>();

	/**
	 * Actual request sending implementation.
	 * @param req request data object
	 */
	protected abstract sendRequest<T>(req: IHttpRequest): Promise<IHttpResponse<T>>;

	/**
	 * Actual file uploading request implementation.
	 * @param req request data
	 */
	protected abstract sendFile<T>(req: IUploadRequest): Promise<IHttpResponse<T>>;

	private async handleError<T = unknown>(err: HttpRequestError<T>, sendFn: (req: IHttpRequest) => Promise<IHttpResponse<T>>): Promise<IHttpResponse<T>> {
		const next = async (i = 0): Promise<IHttpResponse<T> | null> => {
			if (!this.errorHandlers.items[i]) {
				return null;
			}
			const res = await this.errorHandlers.items[i](err, (newReq) => sendFn(newReq || err.req));
			if (res) {
				return res as IHttpResponse<T>;
			}
			return next(i + 1);
		};
		const fallbackRes = await next();
		if (fallbackRes) {
			return fallbackRes;
		}
		if (err.res && !isErrorStatus(err.res.status)) {
			return err.res;
		}
		throw err;
	}

	private async pipeRequest<R extends IHttpRequest, T>(req: R, sendFn: (req: R) => Promise<IHttpResponse<T>>): Promise<IHttpResponse<T>> {
		this.requestInterceptors.items.forEach((fn) => fn(req));
		try {
			const res = await sendFn(req);
			if (isErrorStatus(res.status)) {
				throw new HttpRequestError(req, res);
			}
			return res;
		} catch (err) {
			if (err instanceof HttpRequestError) {
				return this.handleError(err, (newReq) => this.pipeRequest(newReq as R, sendFn));
			}
			throw err;
		}
	}

	/**
	 * Send HTTP request.
	 * @param url request url
	 * @param method request method
	 * @param body request body
	 * @param headers request headers
	 * @param metadata request metadata (for internal usage, doesn't provide anything meaningful for the request itself)
	 * @returns response object
	 * @throws {HttpRequestError} on 4xx or 5xx status code
	 */
	async fetch<T>(url: string, method: string, body?: unknown, headers?: Record<string, string>, metadata?: Record<symbol, unknown>): Promise<IHttpResponse<T>> {
		return this.pipeRequest({ url, method, body, headers: headers || {}, metadata: metadata || {} }, (req) => this.sendRequest<T>(req));
	}

	/**
	 * Upload file via HTTP.
	 * @param url request url
	 * @param data file (request body)
	 * @param method request method
	 * @param headers request headers
	 * @param metadata request metadata (for internal usage, doesn't provide anything meaningful for the request itself)
	 * @param onProgress upload progress event callback
	 * @returns response object
	 * @throws {HttpRequestError} on 4xx or 5xx status code
	 */
	async upload<T>(
		url: string,
		data: Blob,
		{
			onProgress,
			method = 'POST',
			headers = {},
			metadata = {},
		}: { onProgress?(e: IUploadProgressData): void; method?: string; headers?: Record<string, string>; metadata?: Record<symbol, unknown> } = {},
	): Promise<IHttpResponse<T>> {
		return this.pipeRequest({ url, method, body: data, headers, metadata, onProgress }, (req) => this.sendFile<T>(req));
	}

	/**
	 * Add request interceptor. It can be used to modify request before sending.
	 * You can provide Authorization header here, for example.
	 * @param fn request interceptor
	 * @returns this
	 */
	addRequestInterceptor(fn: RequestInterceptor): this {
		this.requestInterceptors.add(fn);
		return this;
	}

	/**
	 * Remove request interceptor. If there is no interceptor, function silently returns.
	 * @param fn request interceptor
	 * @returns this
	 */
	removeRequestInterceptor(fn: RequestInterceptor): this {
		this.requestInterceptors.remove(fn);
		return this;
	}

	/**
	 * Add HTTP error handler. It can be used for dealing with HTTP errors and optional recovery.
	 * You can try to use refresh/remember token and resend request here, for example.
	 * @param fn error handler, can return new HTTP response which will be returned to client
	 * @returns this
	 */
	addErrorHandler(fn: ErrorHandler): this {
		this.errorHandlers.add(fn);
		return this;
	}

	/**
	 * Remove error handler. If there is no handler, function silently returns.
	 * @param fn error handler
	 * @returns this
	 */
	removeErrorHandler(fn: ErrorHandler): this {
		this.errorHandlers.remove(fn);
		return this;
	}

	get<T>(url: string, headers?: Record<string, string>): Promise<IHttpResponse<T>> {
		return this.fetch(url, 'GET', undefined, headers);
	}

	post<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<IHttpResponse<T>> {
		return this.fetch(url, 'POST', body, headers);
	}

	put<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<IHttpResponse<T>> {
		return this.fetch(url, 'PUT', body, headers);
	}

	patch<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<IHttpResponse<T>> {
		return this.fetch(url, 'PATCH', body, headers);
	}

	delete<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<IHttpResponse<T>> {
		return this.fetch(url, 'DELETE', body, headers);
	}
}
