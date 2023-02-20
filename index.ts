import type { z } from "zod";
import { apiCall } from "./api";
import { generateWaybillPDF } from "./api/custom-waybill.server";
import { generateWaybillsPDF } from "./api/custom-waybills.server";
import type { NinjaWebhookEvent, NinjaWebhookEventType } from "./api/webhooks";
import {
  isNinjaWebhookEventType,
  verifyNinjaWebhookSignature,
} from "./api/webhooks";
import type {
  CreateOrderInput,
  CustomWaybillInput,
  WrapperArgsInput,
} from "./schemas";
import {
  TrackOrder,
  TrackOrderNinjaResponse,
  TrackOrders,
  TrackOrdersNinjaResponse,
  CancelOrder,
  CancelOrderNinjaResponse,
  CreateOrder,
  CreateOrderNinjaResponse,
  GenerateWaybill,
  GenerateWaybillNinjaResponse,
  GetToken,
  GetTokenNinjaResponse,
  validWrapperArgs,
} from "./schemas";
import type { Mock } from "./types";
import {
  capitalize,
  getNinjaBufferPathFromCache,
  getNinjaTokenFromCache,
  jsonParse,
  logger as pinoLogger,
  logsMessages as ms,
  upsertNinjaBufferIntoCache,
  upsertNinjaTokenIntoCache,
} from "./utils";

/**
 * @description - A Wrapper around ninjavan `API`s
 */
function ninjavan(args: WrapperArgsInput, mock?: Mock, logger?: boolean) {
  /** 1. initialize conditional logger */
  const _logger = pinoLogger(logger);
  const info = (log: string, child?: object) =>
    _logger.child(child ?? {}).info(log);
  const error = (log: string, child?: object) =>
    _logger.child(child ?? {}).error(log);

  /** 2. validate wrapper args */
  // logs
  info(ms.initializingWrapper, { args, mock });

  // runtime validation
  info(ms.validatingWrapperArgs);
  const _args = validWrapperArgs(args);
  if (typeof _args === "string") {
    error(ms.invalidWrapperArgs, { error: _args });
    throw new Error(ms.invalidWrapperArgs + " " + _args);
  }
  info(ms.validWrapperArgs, { args: _args });

  // spread args
  const { clientId, clientSecret, baseUrl, countryCode } = _args;
  info(ms.initializedWrapper);

  /** 3. initialize wrapper dependencies */
  /**
   * @see https://api-docs.ninjavan.co/en#tag/OAuth-API
   *
   * @description - gets a valid ninjavan token from their api if it's not already cached
   */
  async function getToken() {
    info(ms.runGetToken);

    // prepare dependencies
    const url = `${baseUrl}/${countryCode}/2.0/oauth/access_token`;
    const key = `${baseUrl}/${countryCode}?client_id=${clientId}`;

    // handle mock
    if (mock) return handleMock(mock, "get.token", { key, url }) as string;

    // get token
    // from cache
    info(ms.gettingToken, { key, url });
    const cachedToken = await getNinjaTokenFromCache(key);
    if (cachedToken) {
      info(ms.tokenFromCache, { token: cachedToken });
      return cachedToken;
    }
    info(ms.tokenNotInCache, { key, url });

    // from api
    try {
      const data = (
        await apiCall(
          GetToken,
          GetTokenNinjaResponse,
          {
            url,
            input: {
              client_id: clientId,
              client_secret: clientSecret,
            },
          },
          (args) =>
            fetch(args.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(args.input),
            }),
          info,
          error
        )
      )(GetTokenNinjaResponse);

      const authHeaderValue = `${capitalize(data.token_type)} ${
        data.access_token
      }`;

      const cachingResponse = await upsertNinjaTokenIntoCache(key, {
        token: data.access_token,
        tokenType: capitalize(data.token_type),
        expiresIn: data.expires_in,
      });

      if (cachingResponse) {
        info(ms.tokenCached, { key, url, value: authHeaderValue });
      } else {
        error(ms.tokenNotCached, { key, url, value: authHeaderValue });
        console.log(`❌ token caching failed, figure this out`);
      }

      return authHeaderValue;
    } catch (err) {
      // extra report to close getToken() logs
      error(ms.getTokenError, { error: (err as Error).message });
      throw error;
    }
  }

  /** 4. return wrapper's public API */
  const methods = {
    /**
     *
     * @param {CreateOrderInput["input"]} args - the input args for ninja
     * create order api
     * @param {string} token - if you want to provide the token yourself
     * @returns - the response of ninja create order api
     */
    async createOrder(args: CreateOrderInput["input"], token?: string) {
      info(ms.runCreateOrder);

      // prepare dependencies
      const url = `${baseUrl}/${countryCode}/4.0/orders`;
      const _token = token ?? ((await getToken()) as string);

      // handle mock
      if (mock)
        return handleMock(mock, "create.order", {
          url,
          token: _token,
          args,
        }) as z.infer<typeof CreateOrderNinjaResponse>;

      // call api
      try {
        const data = (
          await apiCall(
            CreateOrder,
            CreateOrderNinjaResponse,
            {
              url,
              input: args,
            },
            (args) =>
              fetch(args.url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: _token,
                },
                body: JSON.stringify(args.input),
              }),
            info,
            error
          )
        )(CreateOrderNinjaResponse);

        return data;
      } catch (err) {
        // extra report to close createOrder() logs
        error(ms.createOrderError, { error: (err as Error).message });
        throw err;
      }
    },
    /**
     *
     * @param args - array of the input args for ninja create order api
     * @param token - if you want to provide the token yourself
     * @param logger - if true, this function will use its own logger
     * instead of the wrapper's logger, so you can disable the wrapper's
     * logger focus on this function's logs. @default false
     * @param strict - if true, the function either create all orders or
     * none, this happens by cancelling all successful orders if one
     * failed, if cancelation fails, you should get a response that tells
     * you what to do. @default false
     *
     * @description - this function is a parallel version of many createOrder()
     * calls, it generates its own token for a better performance
     * @returns
     */
    async createOrders(
      args: Array<CreateOrderInput["input"]>,
      token?: string,
      _logger?: boolean,
      strict?: boolean
    ) {
      if (typeof strict === "undefined") strict = false;

      // prepare logger
      const loggerEnabled = _logger ?? logger ?? false;
      const __logger = pinoLogger(loggerEnabled);
      const _info = (log: string, child?: object) =>
        __logger.child(child ?? {}).info(log);
      const _error = (log: string, child?: object) =>
        __logger.child(child ?? {}).error(log);

      _info(ms.runCreateOrders);

      /** 0. get token */
      _info(ms.gettingToken);
      const _token = token ?? ((await getToken()) as string);
      //    ^^^^ this will throw an error if it fails, b ready 2 catchit

      /** 1. create all orders */
      _info(ms.creatingOrders, { total: args.length, strict });

      // prepare promises
      const promises = args.map((x) => methods.createOrder(x, _token));

      // wait for all promises to settle
      const r = await Promise.allSettled(promises);

      // check if any failed
      const hasFailed = r.some((x) => x.status === "rejected");

      // no failed orders
      if (!hasFailed) {
        _info(ms.allOrdersCreated, { total: r.length });

        // return all fulfilled orders, as part of stats
        return {
          ok: true,
          stats: {
            total: r.length,
            success: r.length,
            failed: 0,
          },
          // this filter for types inference
          data: r.filter(isFulfilled).map((x) => x.value),
          error: null,
          cancelation: undefined,
        };
      }

      /** 2. has some failed orders */
      _error(ms.someOrdersFailed, {
        total: r.length,
        failed: r.filter(isRejected).length,
      });

      // if strict is false, we return all orders, as part of stats
      // with errors' details
      if (!strict) {
        return {
          ok: false,
          stats: {
            total: r.length,
            success: r.filter(isFulfilled).length,
            failed: r.filter(isRejected).length,
          },
          data: r.filter(isFulfilled).map((x) => x.value),
          error: r.filter(isRejected).map((x) => getErrorMessage(x.reason)),
          cancelation: undefined,
        };
      }

      /** 3. reverse orders creation */

      // strict is `true` and there are failed orders, we cancel

      // start cancelling all successful orders

      // extract tracking numbers
      const successfulOrders = r.filter(isFulfilled).map((x) => x.value);

      const idsToCancel = successfulOrders.map((x) => x.tracking_number);

      // reverse create orders
      const cancelation = await methods.cancelOrders(
        idsToCancel,
        _token,
        loggerEnabled
      );
      return {
        ok: false,
        stats: {
          total: r.length,
          success: r.filter(isFulfilled).length,
          failed: r.filter(isRejected).length,
        },
        data: r.filter(isFulfilled).map((x) => x.value),
        error: r.filter(isRejected).map((x) => getErrorMessage(x.reason)),
        cancelation: {
          ...cancelation,
        },
      };
    },
    /**
     *
     * @param args - the input args for ninja cancel order api
     * @param {string} token - if you want to provide the token yourself
     * @returns - the response of ninja cancel order api
     */
    async cancelOrder(args: { trackingNumber: string }, token?: string) {
      info(ms.runCancelOrder);

      // prepare dependencies
      const url = `${baseUrl}/${countryCode}/2.2/orders/${args.trackingNumber}`;
      const _token = token ?? ((await getToken()) as string);

      // handle mock
      if (mock)
        return handleMock(mock, "cancel.order", {
          url,
          token: _token,
          args,
        }) satisfies any;

      // call api
      try {
        const data = (
          await apiCall(
            CancelOrder,
            CancelOrderNinjaResponse,
            {
              url,
            },
            (args) =>
              fetch(args.url, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: _token,
                },
              }),
            info,
            error
          )
        )(CancelOrderNinjaResponse);

        return data;
      } catch (err) {
        // extra report to close cancelOrder() logs
        error(ms.cancelOrderError, { error: (err as Error).message });
        throw err;
      }
    },
    /**
     *
     * @param args - array of ids to cancel
     * @param logger - if true, this function will use its own logger
     * instead of the wrapper's logger, so you can disable the wrapper's
     * logger focus on this function's logs. @default false
     * @returns
     * @description - this function is a parallel version of many cancelOrder()
     * calls, it generates its own token for a better performance
     * @returns
     */
    async cancelOrders(args: string[], token?: string, _logger?: boolean) {
      // prepare logger
      const loggerEnabled = _logger ?? logger ?? false;
      const __logger = pinoLogger(loggerEnabled);
      const _info = (log: string, child?: object) =>
        __logger.child(child ?? {}).info(log);
      const _error = (log: string, child?: object) =>
        __logger.child(child ?? {}).error(log);

      _info(ms.runCancelOrders);

      // prepare dependencies
      const _token = token ?? ((await getToken()) as string);

      // prepare canceling promises
      const cancelPromises = args.map((x) =>
        methods.cancelOrder(
          {
            trackingNumber: x,
          },
          _token
        )
      );

      // wait for all canceling promises to settle
      _info(ms.cancelingSuccessfulOrders, {
        total: args.length,
        canceling: args,
      });
      const cancelResults = await Promise.allSettled(cancelPromises);

      // check if any canceling failed
      const hasCancelFailed = cancelResults.some(
        (x) => x.status === "rejected"
      );

      // no failed canceling
      if (!hasCancelFailed) {
        _info(ms.allSuccessfulOrdersCanceled, { total: cancelResults.length });

        return {
          ok: true,
          stats: {
            total: cancelResults.length,
            success: cancelResults.length,
            failed: 0,
          },
          data: cancelResults.filter(isFulfilled).map((x) => x.value),
          error: null,
        };
      }

      _error(ms.someCancelationFailed, {
        total: cancelResults.length,
        failed: cancelResults.filter(isRejected).length,
      });

      // TODO: handle cancelation failed. i.e retry cancelation or something

      // for now we'll just inform the user that some cancelation failed

      return {
        ok: false,
        stats: {
          total: cancelResults.length,
          success: cancelResults.filter(isFulfilled).length,
          failed: cancelResults.filter(isRejected).length,
        },
        // this filter for types inference
        data: cancelResults.filter(isFulfilled).map((x) => x.value),
        error: cancelResults
          .filter(isRejected)
          .map((x) => getErrorMessage(x.reason)),
      };
    },
    /**
     * @note You shouldn't call this api directly after creating an order
     * @see https://api-docs.ninjavan.co/en#tag/Order-API/paths/~1%7BcountryCode%7D~12.0~1reports~1waybill/get
     *
     * @note - ninja's generate waybill api is rate limited, cache the response always
     *
     * @param trackingNumber - the tracking number of the order
     * @param showShipperDetails - whether to show the shipper details or not
     * @returns the response of ninja generate waybill api
     */
    async generateWaybill(args: {
      trackingNumber: string;
      showShipperDetails?: boolean;
    }) {
      info(ms.runGenerateWaybill);

      // prepare dependencies
      const name = `waybill-${args.trackingNumber}`;
      /**
       * A flag for hiding shipper's details, such as contact information, on the waybill. If no flag is provided with the query, the details are hidden. To explicitly hide the details, set to 1. To show the details, set to 0.
       */
      const h = args.showShipperDetails ? 0 : 1;
      /**
       * The tracking_number as generated by the Order API.
       */
      const tids = args.trackingNumber;
      const url = `${baseUrl}/${countryCode}/2.0/reports/waybill?h=${h}&tids=${tids}`;
      const token = (await getToken()) as string;

      // handle mock
      if (mock)
        return handleMock(mock, "generate.waybill", {
          url,
          token,
          name,
          args,
        }) as z.infer<typeof GenerateWaybillNinjaResponse>;

      // check cache
      info(ms.gettingWaybill, { name, url });
      const cachedAirwaybill = await getNinjaBufferPathFromCache(name);
      if (cachedAirwaybill) {
        info(ms.waybillFromCache, { waybill: cachedAirwaybill });
        return cachedAirwaybill;
      }
      info(ms.waybillNotInCache, { name, url });

      // call api
      try {
        const data = (
          await apiCall(
            GenerateWaybill,
            GenerateWaybillNinjaResponse,
            {
              url,
            },
            (args) =>
              fetch(args.url, {
                method: "GET",
                headers: {
                  "Content-Type": "application/pdf",
                  Authorization: token,
                },
                redirect: "follow",
              }),
            info,
            error,
            // ignore the output validation
            true
          )
        )(GenerateWaybillNinjaResponse);

        info(`
        🔥 You can generate a waybill only for an order that is \n
        successfully processed. After an order creation request \n
        is accepted by the order creation endpoint, the order \n
        goes into a queue for further processing. When it's fully \n
        processed, the platform generates a Pending Pickup webhook \n
        (see Sample webhook payloads). This webhook gives your \n
        system an indication that a waybill can be generated.\n\n
        🔕 So Basically this api returns nothing, if the order is\n
        not yet processed.
        `);

        const cachingResponse = await upsertNinjaBufferIntoCache(
          // bufferArray coming from parsing the response
          data,
          name
        );

        if (cachingResponse) {
          info(ms.waybillCached, { value: cachingResponse });
        } else {
          error(ms.waybillNotCached, { value: cachingResponse });
          console.log(`❌ waybill caching failed, figure this out`);
        }

        const _ = cachingResponse
          ? cachingResponse
          : {
              path: null,
              buffer: Buffer.from(data),
            };

        return _;
      } catch (err) {
        // extra report to close generateWaybill() logs
        error(ms.generateWaybillError, { error: (err as Error).message });
        throw err;
      }
    },
    /**
     * - You shouldn't rely on this api to track orders, instead
     *   subscribe to ninjavan webhooks per event
     *
     * @returns the response of ninja api
     */
    async trackOrder(args: { trackingNumber: string }) {
      info(ms.runTrackOrder);

      // prepare dependencies
      const url = `${baseUrl}/${countryCode}/1.0/orders/tracking-events/${args.trackingNumber}`;
      const token = (await getToken()) as string;

      // handle mock
      if (mock)
        return handleMock(mock, "track.order", {
          url,
          args,
        }) as z.infer<typeof TrackOrderNinjaResponse>;

      // call api
      try {
        const data = (
          await apiCall(
            TrackOrder,
            TrackOrderNinjaResponse,
            {
              url,
            },
            (args) =>
              fetch(args.url, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: token,
                },
              }),
            info,
            error
          )
        )(TrackOrderNinjaResponse);

        return data;
      } catch (err) {
        error(ms.trackOrderError, { error: (err as Error).message });
        throw err;
      }
    },
    /**
     * - You shouldn't rely on this api to track orders, instead
     *   subscribe to ninjavan webhooks per event
     *
     * @returns the response of ninja api
     */
    async trackOrders(args: { trackingNumbers: string[] }) {
      info(ms.runTrackOrders);

      // prepare dependencies
      const _url = new URL(
        `${baseUrl}/${countryCode}/1.0/orders/tracking-events`
      );
      // add tracking numbers to url as searchParams
      args.trackingNumbers.forEach((trackingNumber) => {
        _url.searchParams.append("tracking_number", trackingNumber);
      });
      const url = _url.toString();
      const token = (await getToken()) as string;

      // handle mock
      if (mock)
        return handleMock(mock, "track.orders", {
          url,
          args,
        }) as z.infer<typeof TrackOrdersNinjaResponse>;

      // call api
      try {
        const data = (
          await apiCall(
            TrackOrders,
            TrackOrdersNinjaResponse,
            {
              url,
            },
            (args) =>
              fetch(args.url, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: token,
                },
              }),
            info,
            error
          )
        )(TrackOrdersNinjaResponse);

        return data;
      } catch (err) {
        error(ms.trackOrdersError, { error: (err as Error).message });
        throw err;
      }
    },
    /**
     * we're using external api to generate the waybill
     *
     * @description generate a custom waybill for a single order
     *
     * @param args see CustomNinjaWaybillInput type
     * @returns url: Path to the stored generated PDF
     */
    async customWaybill(args: CustomWaybillInput) {
      info(ms.runCustomWaybill);

      return await generateWaybillPDF(args);
    },
    /**
     * we're using external api to generate the waybill
     *
     * @description generate custom waybills for multiple orders
     * be careful when using this function, you better cache the generated
     * waybill path somewhere and use it instead of generating a new one
     * every time you want to
     *
     * this function is limited to 100 waybills at a time by default
     *
     * @param args see CustomNinjaWaybillInput type
     * @returns url: Path to the stored generated PDF
     */
    async customWaybills(args: CustomWaybillInput[], limitless?: boolean) {
      info(ms.runCustomWaybills);

      const isLimitless = limitless ?? false;

      if (!isLimitless && args.length > 100)
        throw new Error(
          "You can only generate 100 waybills at a time, use the limitless option to bypass this limit"
        );

      return await generateWaybillsPDF(args);
    },
    /**
     * @note Webhook Strategy:
     * Some apis, maybe ninjavan disable your webhook endpoint if
     * it returns a non 200 status code more than `n` number of times,
     * to solve this
     * - You always return `200: success` from your webhook endpoint
     *   to NinjaVan [unless a fatal error occurs], if so it's better to
     *   get your webhook endpoint disabled than to miss an important
     *   event
     * - You report normal errors to handle them later
     * - You report fatal errors to handle them urgently
     *
     * @note Error Codes: <-- You can choose which error is fatal or not
     * - Initialization Errors:
     *  - 9900: Invalid args (you should test this as part of the setup)
     * - Signature Errors:
     *  - 9901: No signature header found
     *  - 9902: Invalid signature
     * - Payload Errors:
     *  - 9903: No event type found
     *  - 9904: Not registered event type
     *  - 9905: Invalid event type
     *
     * @note How to use
     * - it's all about how you initialize the wrapper
     *   in a multi-tenant app you can either create an endpoint for each
     *   tenant, or go more dynamic `example.com/webhook/:tenantId`, then
     *   your users can register the number of webhooks you require
     * - @see how-to-use below the function
     *
     * @param args {
     *  request: Request, we use this to get the request body and headers
     * }
     * @param failureCallback - callback to run when the webhook fails
     * usually to report fetal error
     * @param successCallback - callback to run when the webhook succeeds
     *
     * @returns {
     *  event: string,
     *  payload: the original payload, [UNTYPED]
     * }
     */
    async receiveWebhook(
      args: {
        request: Request;
        registeredEvents: Array<NinjaWebhookEventType | "*">;
      },
      failureCallback?: (
        err: { code: number; message: string },
        data?: { body: string | object } | object
      ) => void,
      successCallback?: (data: {
        event: NinjaWebhookEventType;
        [index: string | number]: any;
      }) => void
    ) {
      info(ms.runReceiveWebhook);

      const signatureHeaderName = "X-Ninjavan-Hmac-Sha256";
      if (!successCallback) successCallback = () => undefined;
      if (!failureCallback) failureCallback = () => undefined;

      // 1. Extract information from the request
      info(ms.extractingPayload);
      const body = await args.request.text();
      const signatureHeader = args.request.headers.get(signatureHeaderName);
      info(ms.extractedPayload, { body, signatureHeader });

      if (!signatureHeader) {
        error(ms.noSignatureHeader);
        return failureCallback(
          {
            code: 9901,
            message: `No signature header found`,
          },
          { body: jsonParse(body) ?? "Couldn't parse body" }
        );
      }

      // 2. Make sure the webhook is coming from ninjavan
      try {
        const validSignature = verifyNinjaWebhookSignature({
          signature: signatureHeader,
          body,
          secret: clientSecret,
        });
        if (!validSignature) {
          error(ms.invalidSignature);
          return failureCallback(
            {
              code: 9902,
              message: `Invalid signature`,
            },
            { body: jsonParse(body) ?? "Couldn't parse body" }
          );
        }

        info(ms.validSignature);
      } catch (err) {
        error(ms.invalidSignature, { error: (err as Error).message });
        return failureCallback(
          {
            code: 9902,
            message: `Invalid signature: ${(err as Error).message}`,
          },
          { body: jsonParse(body) ?? "Couldn't parse body" }
        );
      }

      // 3. Extract the event
      info(ms.extractingEvent);
      const event = jsonParse(body) as NinjaWebhookEvent;
      const eventType = event.status;
      info(ms.extractedEvent, { event });

      if (!eventType) {
        error(ms.noEventType);
        return failureCallback(
          {
            code: 9903,
            message: `No event type found`,
          },
          { body: jsonParse(body) ?? "Couldn't parse body" }
        );
      }

      // 4. Handle the event
      if (isNinjaWebhookEventType(eventType)) {
        info(ms.validEventType, { eventType });

        if (
          args.registeredEvents.includes(eventType) ||
          args.registeredEvents.includes("*")
        ) {
          info(ms.registeredEventType, { eventType });
          return successCallback({ event: eventType, ...event });
        }

        error(ms.notRegisteredEventType, { eventType });
        return failureCallback(
          {
            code: 9904,
            message: `Event type not registered: ${eventType}`,
          },
          {
            event: eventType,
            ...event,
          }
        );
      } else {
        error(ms.invalidEventType, { eventType });
        return failureCallback(
          {
            code: 9905,
            message: `Invalid event type: ${eventType}`,
          },
          { body: jsonParse(body) ?? "Couldn't parse body" }
        );
      }
    },
    /**
     * @description - takes care of the whole process of creating order/s
     * 1. Creates the order/s
     * 2. Generates the waybill/s
     *
     * @recommended - provide your own `tracking_id`s, this function will
     * make sure that ninjavan api used 'em to create orders
     *
     *
     * @note - if you're using `requested_tracking_number` you need
     * to know that when ninja cancels an order of yours, it reserves the
     * tracking number used to create the order, so you won't be able
     * to use it again. i.e you need to generate new ones every time you're
     * using this function and keep those in sync with your system
     *
     * @param trackingNumbersPrefix - if you want to use `requested_tracking_number`
     * you must provide your account prefix.
     * @param logger - if true, this function will use its own logger
     * instead of the wrapper's logger, so you can disable the wrapper's
     * logger focus on this function's logs. @default false
     * @param showSenderDetails - if true, this function will print sender
     * details on the waybill, @default false
     */
    async express(
      args: Array<CreateOrderInput["input"] & { comments?: string }>,
      trackingNumbersPrefix?: string,
      showSenderDetails?: boolean,
      _logger?: boolean
    ) {
      // prepare logger
      const loggerEnabled = _logger ?? logger ?? false;
      const __logger = pinoLogger(loggerEnabled);
      const _info = (log: string, child?: object) =>
        __logger.child(child ?? {}).info(log);
      const _error = (log: string, child?: object) =>
        __logger.child(child ?? {}).error(log);

      if (!showSenderDetails) showSenderDetails = false;

      _info(ms.runExpress);

      // prepare dependencies
      const _token = (await getToken()) as string;

      // map requested trackingNumber to trackingNumbers ninja generated
      const map = new Map<string, string | undefined>();
      const wantsTrackingNumber = args.some(
        (arg, index) => !!arg.requested_tracking_number
      );

      if (wantsTrackingNumber) {
        if (!trackingNumbersPrefix) {
          throw new Error(ms.noTrackingNumbersPrefix);
        }

        args.forEach((arg, index) => {
          if (arg.requested_tracking_number) {
            map.set(arg.requested_tracking_number, " ");
          }
        });
      }

      _info(ms.wantTrackingNumber, { total: args.length, for: map.size });

      // 1. Create the order/s
      try {
        const _ = await methods.createOrders(
          args,
          // strict mode, all or none get created
          _token,
          loggerEnabled,
          true
        );

        // failed to create all orders
        if (!_.ok) {
          // failed to cancel all successfully created orders
          if (!_.cancelation || !_.cancelation?.ok) {
            throw new Error(`
            💀 Ops! This is bad, we failed to cancel orders that we created!!
            🔥 Failed to create orders: ${_.error?.join(", ")},
            🔥 Failed to cancel orders: ${_.cancelation?.error?.join(", ")},
            🔥 Try to cancel the orders that were just created 😅 one by one.
            `);
          }
          throw new Error(_.error?.join(", "));
        }

        /**
         *
         * @description - cancels all orders that were created
         * @returns
         */
        const reverseCreation = async () => {
          // prepare ids to cancel
          const ids = _.data.map((order) => order.tracking_number);

          // cancel all orders
          return await methods.cancelOrders(ids, _token, loggerEnabled);
        };

        // make sure ninja used the provided trackingNumber/s
        if (wantsTrackingNumber) {
          for (const order of _.data) {
            if (order.requested_tracking_number) {
              const item = map.get(order.requested_tracking_number);

              _info("view", {
                map: [...map.entries()],
                item,
              });

              if (!item) {
                _error(ms.unexpectedTrackingNumber, {
                  requested:
                    trackingNumbersPrefix + order.requested_tracking_number,
                  used: order.tracking_number,
                });

                const { ok, error } = await reverseCreation();
                throw new Error(
                  `This should never happen ${
                    !ok
                      ? "unable to cancel some created orders" +
                        error?.join(", ")
                      : ""
                  }`
                );
              }

              map.set(
                trackingNumbersPrefix + order.requested_tracking_number,
                order.tracking_number
              );
              map.delete(order.requested_tracking_number);
            }
          }

          // make sure all trackingNumber/s were used
          for (const [key, value] of map) {
            // _info("view", {
            //   map: [...map.entries()],
            //   key,
            //   value,
            // });

            if (!value) {
              _error(ms.unusedTrackingNumber, {
                requested: key,
              });

              const { ok, error } = await reverseCreation();
              throw new Error(
                `Ninja didn't use the trackingNumber ${key} that you provided ${
                  !ok
                    ? "unable to cancel some created orders" + error?.join(", ")
                    : ""
                }`
              );
            }
            if (value !== key) {
              _error(ms.differentTrackingNumber, {
                requested: key,
                used: value,
              });

              const { ok, error } = await reverseCreation();
              throw new Error(
                `Ninja used a different trackingNumber ${value} instead of ${key} ${
                  !ok
                    ? "unable to cancel some created orders" + error?.join(", ")
                    : ""
                }`
              );
            }
          }
        }

        const mergeAddress = (address: any, isSender: boolean) => {
          const postcode =
            address?.postcode ??
            args.find((arg) =>
              isSender
                ? arg.from.address.address1 === address?.address1
                : arg.to.address.address1 === address?.address1
            )?.[isSender ? "from" : "to"]?.address?.postcode;

          return `${address?.address1}${address?.address2}, ${
            address?.country
          } ${postcode ?? ""}`;
        };

        // 2. Generate the waybill/s
        const waybills = await methods.customWaybills(
          _.data.map((order) => ({
            trackingId: order?.tracking_number!,
            // if we require `requested_tracking_number` we better  use it
            comments: order?.parcel_job?.delivery_instructions,
            cod: {
              amount: order?.parcel_job?.cash_on_delivery ?? 0,
              currency: "",
            },
            deliveryDate: `${
              // i want to transform this '2023-02-20' to '22 Feb 2023'
              new Date(
                order?.parcel_job?.delivery_start_date ?? ""
              ).toLocaleDateString(
                "en-" + (order?.to?.address?.country ?? "SG"),
                {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }
              )
            } ${
              order?.parcel_job?.delivery_timeslot.start_time +
              " - " +
              order?.parcel_job?.delivery_timeslot.end_time
            }`,
            sender: {
              name: order?.from?.name!,
              contact: showSenderDetails
                ? order?.from?.phone_number ?? order?.from?.email
                : undefined,
              address: showSenderDetails
                ? mergeAddress(order?.from?.address, true)
                : undefined,
            },
            receiver: {
              name: order?.to?.name!,
              contact: order?.to?.phone_number! ?? order?.to?.email,
              address: mergeAddress(order?.to?.address, false),
            },
            type: order?.service_type!,
            weight: order?.parcel_job?.dimensions.weight!,
          }))
        );

        return {
          // we return a url to the waybill/s
          waybills,
          // we return the stats and ninja api response
          ..._,
        };
      } catch (error) {
        _error(ms.failedToCreateOrders, { error: (error as Error).message });

        throw error;
      }
    },
  };
  return { ...methods };
}

export { ninjavan };

function handleMock(
  mock: string,
  fn: string,
  data: any
):
  | z.infer<typeof CreateOrderNinjaResponse>
  | z.infer<typeof CancelOrderNinjaResponse>
  | z.infer<typeof TrackOrderNinjaResponse>
  | z.infer<typeof TrackOrdersNinjaResponse>
  | string {
  return "";
}

/**
 * @description - type guard to check if a promise has been fulfilled
 */
function isFulfilled<T>(
  val: PromiseSettledResult<T>
): val is PromiseFulfilledResult<T> {
  return val.status === "fulfilled";
}
/**
 * @description - type guard to check if a promise has been rejected
 */
function isRejected<T>(
  val: PromiseSettledResult<T>
): val is PromiseRejectedResult {
  return val.status === "rejected";
}

function getErrorMessage(err: unknown) {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
