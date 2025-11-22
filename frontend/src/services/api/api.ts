/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** TenderReviewStatus */
export type TenderReviewStatus =
  | "In Prüfung"
  | "Uninteressant"
  | "In Ausarbeitung"
  | "Abgeschickt"
  | "Abgelehnt";

/** TenderProcessingStatus */
export type TenderProcessingStatus =
  | "queued"
  | "processing"
  | "done"
  | "error"
  | "cancelled";

/** BaseInformation */
export interface BaseInformation {
  /**
   * Value
   * The extracted value for the field
   */
  value?: string | null;
  /**
   * Source File
   * The source file where the information was found
   */
  source_file?: string | null;
  /**
   * Source File Id
   * The source file id where the information was found
   */
  source_file_id?: string | null;
  /**
   * Exact Text
   * The exact text passage from the document
   */
  exact_text?: string | null;
  /**
   * Field Name
   * The field which is extracted
   */
  field_name: string;
  /** Approved */
  approved?: boolean | null;
  /** Note */
  note?: string | null;
  /** Fulfillable */
  fulfillable?: boolean | null;
}

/** Body_create_tender */
export interface BodyCreateTender {
  /** Files */
  files: File[];
  /** Name */
  name: string;
}

/** Document */
export interface Document {
  /**
   * Id
   * @format uuid
   */
  id: string;
  /** Name */
  name: string;
  /**
   * Tender Id
   * @format uuid
   */
  tender_id: string;
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** JobResponse */
export interface JobResponse {
  /** Job Id */
  job_id: string;
  /** Message */
  message: string;
  /** Status */
  status: string;
}

/** StepStatus */
export interface StepStatus {
  /** Name */
  name: string;
  /** Status */
  status: string;
  /** Last Error */
  last_error?: string | null;
}

/** Tender */
export interface Tender {
  /**
   * Id
   * @format uuid
   */
  id: string;
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Base Information */
  base_information: BaseInformation[];
  status: TenderReviewStatus;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
}

/**
 * TenderJob
 * Tender processing job model.
 */
export interface TenderJob {
  /**
   * Id
   * Job ID
   */
  _id?: string | null;
  /**
   * Type
   * Job type
   * @default "tender_processing"
   */
  type?: string;
  /** Tender Id */
  tender_id: string;
  /** Document Ids */
  document_ids: string[];
  /** Pipeline */
  pipeline: string[];
  /** Current Step Index */
  current_step_index: number;
  status: TenderProcessingStatus;
  /** Step Status */
  step_status: StepStatus[];
  /** Attempts */
  attempts: number;
  /** Max Attempts */
  max_attempts: number;
  /** Locked By */
  locked_by?: string | null;
  /** Locked At */
  locked_at?: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
}

/** TenderUpdate */
export interface TenderUpdate {
  /** Title */
  title?: string | null;
  /** Description */
  description?: string | null;
  /** Base Information */
  base_information?: BaseInformation[] | null;
  status?: TenderReviewStatus | null;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title FastAPI
 * @version 0.1.0
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  tenders = {
    /**
     * No description
     *
     * @tags tenders
     * @name GetTenders
     * @summary Get Tenders
     * @request GET:/tenders/
     */
    getTenders: (params: RequestParams = {}) =>
      this.request<Tender[], void>({
        path: `/tenders/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags tenders
     * @name CreateTender
     * @summary Create Tenders
     * @request POST:/tenders/
     */
    createTender: (data: BodyCreateTender, params: RequestParams = {}) =>
      this.request<any, void | HTTPValidationError>({
        path: `/tenders/`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags tenders
     * @name GetTenderById
     * @summary Get Tender By Id
     * @request GET:/tenders/{tender_id}
     */
    getTenderById: (tenderId: string, params: RequestParams = {}) =>
      this.request<Tender | null, void | HTTPValidationError>({
        path: `/tenders/${tenderId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags tenders
     * @name DeleteTender
     * @summary Delete Tender
     * @request DELETE:/tenders/{tender_id}
     */
    deleteTender: (tenderId: string, params: RequestParams = {}) =>
      this.request<any, void | HTTPValidationError>({
        path: `/tenders/${tenderId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags tenders
     * @name UpdateTender
     * @summary Update Tender
     * @request PUT:/tenders/{tender_id}
     */
    updateTender: (
      tenderId: string,
      data: TenderUpdate,
      params: RequestParams = {},
    ) =>
      this.request<any, void | HTTPValidationError>({
        path: `/tenders/${tenderId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags tenders
     * @name GetTenderDocuments
     * @summary Get Tender Documents
     * @request GET:/tenders/{tender_id}/documents
     */
    getTenderDocuments: (tenderId: string, params: RequestParams = {}) =>
      this.request<Document[], void | HTTPValidationError>({
        path: `/tenders/${tenderId}/documents`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  jobs = {
    /**
     * @description Get all tender jobs that are not done.
     *
     * @tags jobs
     * @name GetJobsNotDone
     * @summary Get Jobs Not Done Endpoint
     * @request GET:/jobs/
     */
    getJobsNotDone: (params: RequestParams = {}) =>
      this.request<TenderJob[], void>({
        path: `/jobs/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Restart a job from a specific step (default: step 0, beginning).
     *
     * @tags jobs
     * @name RestartJob
     * @summary Restart Job Endpoint
     * @request POST:/jobs/{job_id}/restart
     */
    restartJob: (
      jobId: string,
      query?: {
        /**
         * Step Index
         * Step index to restart from (0 = beginning)
         * @min 0
         * @default 0
         */
        step_index?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<JobResponse, void | HTTPValidationError>({
        path: `/jobs/${jobId}/restart`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Cancel a job.
     *
     * @tags jobs
     * @name CancelJob
     * @summary Cancel Job Endpoint
     * @request POST:/jobs/{job_id}/cancel
     */
    cancelJob: (jobId: string, params: RequestParams = {}) =>
      this.request<JobResponse, void | HTTPValidationError>({
        path: `/jobs/${jobId}/cancel`,
        method: "POST",
        format: "json",
        ...params,
      }),
  };
}
