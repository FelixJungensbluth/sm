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

/** RequirementType */
export type RequirementType =
  | "Business"
  | "Zu erarbeiten"
  | "Referenzprojekt"
  | "Nachweis Zertifikat"
  | "Nachweis Personal"
  | "Sonstiges";

/** RequirementStatus */
export type RequirementStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "deleted"
  | "duplicate";

/** BaseInformationStatus */
export type BaseInformationStatus = "approved" | "rejected" | "pending";

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
  /** @default "pending" */
  status?: BaseInformationStatus;
  /** Note */
  note?: string | null;
  /** Fulfillable */
  fulfillable?: boolean | null;
}

/** Body_create_tender */
export interface BodyCreateTender {
  /**
   * Files
   * Files to upload for the tender
   */
  files: File[];
  /**
   * Name
   * Name/title of the tender
   */
  name: string;
}

/** ChatConversation */
export interface ChatConversation {
  /**
   * Id
   * @format uuid
   */
  id: string;
  /** Title */
  title: string;
  /** Messages */
  messages: ChatMessage[];
  /** Tender Id */
  tender_id?: string | null;
  /**
   * Context Type
   * @default "none"
   */
  context_type?: string;
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

/** ChatMessage */
export interface ChatMessage {
  /**
   * Id
   * @format uuid
   */
  id: string;
  /** Role */
  role: string;
  /** Content */
  content: string;
  /**
   * Timestamp
   * @format date-time
   */
  timestamp: string;
}

/** ChatRequest */
export interface ChatRequest {
  /** Message */
  message: string;
  /** Conversation Id */
  conversation_id?: string | null;
  /** Tender Id */
  tender_id?: string | null;
  /**
   * Context Type
   * @default "none"
   */
  context_type?: string;
}

/**
 * ChatTenderListResponse
 * Response model for chat tender list.
 */
export interface ChatTenderListResponse {
  /** Tenders */
  tenders: Record<string, any>[];
}

/**
 * ConversationListResponse
 * Response model for a list of conversations.
 */
export interface ConversationListResponse {
  /** Conversations */
  conversations: ChatConversation[];
}

/**
 * ConversationResponse
 * Response model for a single conversation.
 */
export interface ConversationResponse {
  conversation: ChatConversation;
}

/**
 * CreateConversationResponse
 * Response model for conversation creation.
 */
export interface CreateConversationResponse {
  conversation: ChatConversation;
}

/**
 * CreateTenderResponse
 * Response model for tender creation.
 */
export interface CreateTenderResponse {
  /** Tender Id */
  tender_id: string;
  /** Job Id */
  job_id: string;
  /** Status */
  status: string;
}

/**
 * DeleteConversationResponse
 * Response model for deleting a conversation.
 */
export interface DeleteConversationResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/**
 * JobListResponse
 * Response model for a list of jobs.
 */
export interface JobListResponse {
  /** Jobs */
  jobs: TenderJob[];
}

/**
 * JobResponse
 * Response model for job operations.
 */
export interface JobResponse {
  /** Job Id */
  job_id: string;
  /** Message */
  message: string;
  /** Status */
  status: string;
}

/** Requirement */
export interface Requirement {
  /**
   * Id
   * @format uuid
   */
  id: string;
  /** Name */
  name: string;
  /** Source */
  source: string;
  /** Category */
  category: string;
  type: RequirementType;
  /** File */
  file: string;
  /** @default "pending" */
  status?: RequirementStatus;
  /** Note */
  note?: string | null;
  /**
   * Tender Id
   * @format uuid
   */
  tender_id: string;
}

/**
 * RequirementListResponse
 * Response model for a list of requirements.
 */
export interface RequirementListResponse {
  /** Requirements */
  requirements: Requirement[];
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
  /** Generated Title */
  generated_title: string;
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
 * TenderDocumentListResponse
 * Response model for tender documents.
 */
export interface TenderDocumentListResponse {
  /** Documents */
  documents: Record<string, any>[];
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

/**
 * TenderListResponse
 * Response model for a list of tenders.
 */
export interface TenderListResponse {
  /** Tenders */
  tenders: Tender[];
}

/**
 * TenderResponse
 * Response model for a single tender.
 */
export interface TenderResponse {
  tender: Tender;
}

/** TenderUpdate */
export interface TenderUpdate {
  /** Title */
  title?: string | null;
  /** Generated Title */
  generated_title?: string | null;
  /** Description */
  description?: string | null;
  /** Base Information */
  base_information?: BaseInformation[] | null;
  status?: TenderReviewStatus | null;
}

/**
 * UpdateConversationTitleResponse
 * Response model for updating conversation title.
 */
export interface UpdateConversationTitleResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
}

/**
 * UpdateRequirementStatusResponse
 * Response model for updating requirement status.
 */
export interface UpdateRequirementStatusResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
}

/**
 * UpdateTenderBaseInformationStatusResponse
 * Response model for updating tender base information status.
 */
export interface UpdateTenderBaseInformationStatusResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
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
 * @title SkillMatch API
 * @version 0.1.0
 *
 * API for managing tenders, requirements, and chat conversations
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  health = {
    /**
     * @description Health check endpoint to verify the API is running.
     *
     * @tags health
     * @name HealthCheckHealthGet
     * @summary Health check endpoint
     * @request GET:/health
     */
    healthCheckHealthGet: (params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/health`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  tenders = {
    /**
     * @description Retrieve all tenders that have completed processing.
     *
     * @tags tenders
     * @name GetTenders
     * @summary Get all completed tenders
     * @request GET:/tenders/
     */
    getTenders: (params: RequestParams = {}) =>
      this.request<TenderListResponse, void>({
        path: `/tenders/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Create a new tender with uploaded files. Files are uploaded to MinIO and a processing job is queued.
     *
     * @tags tenders
     * @name CreateTender
     * @summary Create a new tender
     * @request POST:/tenders/
     */
    createTender: (data: BodyCreateTender, params: RequestParams = {}) =>
      this.request<CreateTenderResponse, void | HTTPValidationError>({
        path: `/tenders/`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * @description Retrieve a specific tender by its ID.
     *
     * @tags tenders
     * @name GetTenderById
     * @summary Get tender by ID
     * @request GET:/tenders/{tender_id}
     */
    getTenderById: (tenderId: string, params: RequestParams = {}) =>
      this.request<TenderResponse, void | HTTPValidationError>({
        path: `/tenders/${tenderId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a tender by its ID.
     *
     * @tags tenders
     * @name DeleteTender
     * @summary Delete a tender
     * @request DELETE:/tenders/{tender_id}
     */
    deleteTender: (tenderId: string, params: RequestParams = {}) =>
      this.request<void, void | HTTPValidationError>({
        path: `/tenders/${tenderId}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Update tender fields such as title, description, status, or base information.
     *
     * @tags tenders
     * @name UpdateTender
     * @summary Update a tender
     * @request PUT:/tenders/{tender_id}
     */
    updateTender: (
      tenderId: string,
      data: TenderUpdate,
      params: RequestParams = {},
    ) =>
      this.request<TenderResponse, void | HTTPValidationError>({
        path: `/tenders/${tenderId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Retrieve all documents associated with a tender.
     *
     * @tags tenders
     * @name GetTenderDocuments
     * @summary Get tender documents
     * @request GET:/tenders/{tender_id}/documents
     */
    getTenderDocuments: (tenderId: string, params: RequestParams = {}) =>
      this.request<TenderDocumentListResponse, void | HTTPValidationError>({
        path: `/tenders/${tenderId}/documents`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Update the status of a specific base information field for a tender.
     *
     * @tags tenders
     * @name UpdateTenderBaseInformationStatus
     * @summary Update tender base information status
     * @request PUT:/tenders/{tender_id}/base_information_status
     */
    updateTenderBaseInformationStatus: (
      tenderId: string,
      query: {
        /**
         * Field Name
         * Name of the base information field to update
         */
        field_name: string;
        /** New status for the field */
        base_information_status: BaseInformationStatus;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        UpdateTenderBaseInformationStatusResponse,
        void | HTTPValidationError
      >({
        path: `/tenders/${tenderId}/base_information_status`,
        method: "PUT",
        query: query,
        format: "json",
        ...params,
      }),
  };
  jobs = {
    /**
     * @description Retrieve all tender processing jobs that are not yet completed.
     *
     * @tags jobs
     * @name GetJobsNotDone
     * @summary Get all incomplete jobs
     * @request GET:/jobs/
     */
    getJobsNotDone: (params: RequestParams = {}) =>
      this.request<JobListResponse, void>({
        path: `/jobs/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Restart a tender processing job from a specific step. Default is to restart from the beginning (step 0).
     *
     * @tags jobs
     * @name RestartJob
     * @summary Restart a job
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
     * @description Cancel a tender processing job.
     *
     * @tags jobs
     * @name CancelJob
     * @summary Cancel a job
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
  requirements = {
    /**
     * @description Retrieve all requirements associated with a specific tender.
     *
     * @tags requirements
     * @name GetRequirementsForTender
     * @summary Get requirements for a tender
     * @request GET:/requirements/{tender_id}
     */
    getRequirementsForTender: (tenderId: string, params: RequestParams = {}) =>
      this.request<RequirementListResponse, void | HTTPValidationError>({
        path: `/requirements/${tenderId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Update the status of a specific requirement (e.g., approved, rejected, pending).
     *
     * @tags requirements
     * @name UpdateRequirementStatus
     * @summary Update requirement status
     * @request PUT:/requirements/{requirement_id}/status
     */
    updateRequirementStatus: (
      requirementId: string,
      query: {
        requirement_status: RequirementStatus;
      },
      params: RequestParams = {},
    ) =>
      this.request<UpdateRequirementStatusResponse, void | HTTPValidationError>(
        {
          path: `/requirements/${requirementId}/status`,
          method: "PUT",
          query: query,
          format: "json",
          ...params,
        },
      ),
  };
  chat = {
    /**
     * @description Create a new chat conversation with an optional tender context.
     *
     * @tags chat
     * @name CreateConversation
     * @summary Create a new conversation
     * @request POST:/chat/conversations
     */
    createConversation: (
      query: {
        /**
         * Title
         * Title of the conversation
         */
        title: string;
        /**
         * Tender Id
         * Optional tender ID for context
         */
        tender_id?: string | null;
        /**
         * Context Type
         * Context type: 'none', 'global', or 'tender'
         * @default "none"
         */
        context_type?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<CreateConversationResponse, void | HTTPValidationError>({
        path: `/chat/conversations`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Retrieve all chat conversations, ordered by most recently updated.
     *
     * @tags chat
     * @name GetConversations
     * @summary Get all conversations
     * @request GET:/chat/conversations
     */
    getConversations: (params: RequestParams = {}) =>
      this.request<ConversationListResponse, void>({
        path: `/chat/conversations`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Retrieve a specific conversation with all its messages.
     *
     * @tags chat
     * @name GetConversation
     * @summary Get a conversation by ID
     * @request GET:/chat/conversations/{conversation_id}
     */
    getConversation: (conversationId: string, params: RequestParams = {}) =>
      this.request<ConversationResponse, void | HTTPValidationError>({
        path: `/chat/conversations/${conversationId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a conversation and all its messages.
     *
     * @tags chat
     * @name DeleteConversation
     * @summary Delete a conversation
     * @request DELETE:/chat/conversations/{conversation_id}
     */
    deleteConversation: (conversationId: string, params: RequestParams = {}) =>
      this.request<DeleteConversationResponse, void | HTTPValidationError>({
        path: `/chat/conversations/${conversationId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * @description Update the title of a conversation.
     *
     * @tags chat
     * @name UpdateConversationTitle
     * @summary Update conversation title
     * @request PUT:/chat/conversations/{conversation_id}/title
     */
    updateConversationTitle: (
      conversationId: string,
      query: {
        /**
         * Title
         * New title for the conversation
         */
        title: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<UpdateConversationTitleResponse, void | HTTPValidationError>(
        {
          path: `/chat/conversations/${conversationId}/title`,
          method: "PUT",
          query: query,
          format: "json",
          ...params,
        },
      ),

    /**
     * @description Send a message in a conversation and stream the AI response. Creates a new conversation if conversation_id is not provided.
     *
     * @tags chat
     * @name SendMessage
     * @summary Send a chat message
     * @request POST:/chat/messages
     */
    sendMessage: (data: ChatRequest, params: RequestParams = {}) =>
      this.request<any, void | HTTPValidationError>({
        path: `/chat/messages`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Retrieve a simplified list of tenders for use in chat context selection.
     *
     * @tags chat
     * @name GetChatTenders
     * @summary Get list of tenders for chat context
     * @request GET:/chat/tenders
     */
    getChatTenders: (params: RequestParams = {}) =>
      this.request<ChatTenderListResponse, void>({
        path: `/chat/tenders`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
}
