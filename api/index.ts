import type { z } from "zod";
import { generateError, logsMessages, validate } from "../utils";

async function apiCall<IS extends z.ZodTypeAny>(
  inputSchema: IS,
  outputSchema: z.ZodTypeAny,
  args: unknown,
  fetcher: (args: IS["_output"]) => Promise<Response>,
  info?: (txt: string, obj?: object) => void,
  error?: (txt: string, obj?: object) => void,
  /**
   * @description - if true, the output will not be validated
   * means it only plays well when the output schema returns typeof any
   */
  exceptional?: boolean
): Promise<<OS extends z.ZodTypeAny>(outputSchema: OS) => OS["_output"]> {
  // fallback logging functions
  if (!info) info = () => undefined;
  if (!error) error = () => undefined;
  if (typeof exceptional === "undefined") exceptional = false;

  // validate input
  info(logsMessages.validatingApiCallArgs);
  const input = validate(inputSchema, args);
  info(logsMessages.validApiCallArgs, { args: input });

  // call ninja api
  info(logsMessages.callingApi);
  const response = await fetcher(input);
  info(logsMessages.apiResponded, { status: response.status });

  // get response body
  info(logsMessages.gettingResponseBody);
  const data = await switchParser(response);
  info(logsMessages.gotResponseBody, { data });

  // console.log(data);

  // if error throw it
  if (response.status !== 200) {
    const err = generateError(data);
    error(logsMessages.apiRespondedWithError, { error: err.message });

    throw err;
  }

  // validate response
  info(logsMessages.validatingApiResponse);
  const output = validate(outputSchema, data);

  if (typeof output === "string" && !exceptional) {
    // TODO:                        ^ hardcoded because of validate() logic
    const err = new Error(output);
    error(logsMessages.invalidApiResponse, { error: err.message });

    throw err;
  }

  info(logsMessages.validApiResponse, { output });
  // un needed but for the sake of type safety
  return (outputSchema: z.ZodTypeAny) => outputSchema.parse(output);
}

export { apiCall };

function switchParser(response: Response) {
  const isJson = response.headers.get("content-type")?.includes("json");
  const isText = response.headers.get("content-type")?.includes("text");

  if (isJson) return response.json();
  if (isText) return response.text();
  return response.arrayBuffer();
}
