import pino from "pino";
// @ts-ignore: no available type definitions
import noLogger from "abstract-logging";
import { breakCamelCaseString } from "./other";

noLogger.child = () => noLogger;

const pinoLogger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

// in case you're on windows, you need to activate code page: 65001
// https://getpino.io/#/docs/help?id=windows
// otherwise you'll see weird characters instead of emojis

const logger = (enable: boolean = false) =>
  enable ? pinoLogger : (noLogger as unknown as typeof pinoLogger);

const logsMessages = {
  // wrapper
  initializingWrapper: "Initialized Wrapper",
  validatingWrapperArgs: "Validating Wrapper Args",
  invalidWrapperArgs: "Invalid Wrapper Args",
  validWrapperArgs: "Valid Wrapper Args",
  initializedWrapper: "Initialized Wrapper",

  // getToken
  runGetToken: "Running getToken",
  gettingToken: "Getting token from cache first",
  tokenFromCache: "Got token from cache",
  tokenNotInCache: "Token not in cache",
  tokenCached: breakCamelCaseString("tokenCached"),
  tokenNotCached: breakCamelCaseString("tokenNotCached"),
  getTokenError: breakCamelCaseString("getTokenError"),

  // createOrder
  runCreateOrder: breakCamelCaseString("runCreateOrder"),
  createOrderError: breakCamelCaseString("createOrderError"),
  // createOrders
  runCreateOrders: breakCamelCaseString("runCreateOrders"),
  createOrderErrors: breakCamelCaseString("createOrderErrors"),
  creatingOrders: breakCamelCaseString("creatingOrders"),
  allOrdersCreated: breakCamelCaseString("allOrdersCreated"),
  someOrdersFailed: breakCamelCaseString("someOrdersFailed"),

  // cancelOrder
  runCancelOrder: breakCamelCaseString("runCancelOrder"),
  cancelOrderError: breakCamelCaseString("cancelOrderError"),
  // cancelOrders
  runCancelOrders: breakCamelCaseString("runCancelOrders"),
  cancelingSuccessfulOrders: breakCamelCaseString("cancelingSuccessfulOrders"),
  allSuccessfulOrdersCanceled: breakCamelCaseString(
    "allSuccessfulOrdersCanceled"
  ),
  someCancelationFailed: breakCamelCaseString("someCancelationFailed"),

  // generateWaybill
  runGenerateWaybill: breakCamelCaseString("runGenerateWaybill"),
  gettingWaybill: "Getting waybill from cache first",
  waybillFromCache: "Got token from cache",
  waybillNotInCache: "Token not in cache",
  waybillCached: breakCamelCaseString("tokenCached"),
  waybillNotCached: breakCamelCaseString("tokenNotCached"),
  generateWaybillError: breakCamelCaseString("generateWaybillError"),

  // tracking
  runTrackOrder: breakCamelCaseString("runTrackOrder"),
  trackOrderError: breakCamelCaseString("trackOrderError"),
  runTrackOrders: breakCamelCaseString("runTrackOrders"),
  trackOrdersError: breakCamelCaseString("trackOrdersError"),

  // custom waybill/s
  runCustomWaybill: breakCamelCaseString("runCustomWaybill"),
  runCustomWaybills: breakCamelCaseString("runCustomWaybills"),

  // webhooks
  runReceiveWebhook: breakCamelCaseString("runReceiveWebhook"),
  extractingPayload: breakCamelCaseString("extractingPayload"),
  extractedPayload: breakCamelCaseString("extractedPayload"),
  noSignatureHeader: breakCamelCaseString("noSignatureHeader"),
  invalidSignature: breakCamelCaseString("invalidSignature"),
  validSignature: breakCamelCaseString("validSignature"),
  extractingEvent: breakCamelCaseString("extractingEvent"),
  extractedEvent: breakCamelCaseString("extractedEvent"),
  noEventType: breakCamelCaseString("noEventType"),
  validEventType: breakCamelCaseString("validEventType"),
  registeredEventType: breakCamelCaseString("registeredEventType"),
  notRegisteredEventType: breakCamelCaseString("notRegisteredEventType"),
  invalidEventType: breakCamelCaseString("invalidEventType"),

  // api call
  validatingApiCallArgs: breakCamelCaseString("validatingApiCallArgs"),
  validApiCallArgs: breakCamelCaseString("validApiCallArgs"),
  callingApi: breakCamelCaseString("callingApi"),
  apiResponded: breakCamelCaseString("apiResponded"),
  gettingResponseBody: breakCamelCaseString("gettingResponseBody"),
  gotResponseBody: breakCamelCaseString("gotResponseBody"),
  apiRespondedWithError: breakCamelCaseString("apiRespondedWithError"),
  validatingApiResponse: breakCamelCaseString("validatingApiResponse"),
  invalidApiResponse: breakCamelCaseString("invalidApiResponse"),
  validApiResponse: breakCamelCaseString("validApiResponse"),

  // express
  runExpress: breakCamelCaseString("runExpress"),
  wantTrackingNumber: breakCamelCaseString("wantTrackingNumber"),
  unexpectedTrackingNumber: breakCamelCaseString("unexpectedTrackingNumber"),
  unusedTrackingNumber: breakCamelCaseString("unusedTrackingNumber"),
  differentTrackingNumber: breakCamelCaseString("differentTrackingNumber"),
  failedToCreateOrders: breakCamelCaseString("failedToCreateOrders"),
  noTrackingNumbersPrefix: breakCamelCaseString("noTrackingNumbersPrefix"),
};

export { logger, logsMessages };
