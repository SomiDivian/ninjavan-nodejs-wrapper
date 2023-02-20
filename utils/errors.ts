/**
 *
 * @description - this function is used to generate an error from the response
 * that we get from the ninja api
 */
function generateError(error: unknown) {
  if (typeof error === "string") {
    return new Error(error);
  }
  if (error instanceof Error) {
    return error;
  }
  // sometimes ninja return errors with `nvErrorCode` field in it
  if (typeof error === "object" && error !== null) {
    const err = error as any;
    let errMessage: string = "";
    if ("nvErrorCode" in err || "data" in err) {
      errMessage = (err.description ?? "") + " ";
      errMessage += (err.data?.message ?? "") + " ";
      errMessage += err.messages?.join(" ") ?? "";

      return new Error(errMessage);
    }
    if ("error" in err) {
      let _error = err.error;
      errMessage = (_error.title ?? "") + " ";
      errMessage += (_error.message ?? "") + " ";
      errMessage += _error.details?.map((d: any) => d.message)?.join(" ") ?? "";

      return new Error(errMessage);
    }
    return new Error("unknown ninja error");
  } else {
    return new Error("unknown error");
  }
}

export { generateError };
