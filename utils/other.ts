import { z } from "zod";
import { logger } from "./logger";

// import { cwd } from "process";
// import fs from "fs";
// import type { Prisma } from "@prisma/client";
// import { prisma } from "~/utils/app/db.server";
// import dayjs from "dayjs";

export const stringParser = z.string();
export const zodString = (value: unknown) => stringParser.parse(value);

export function unexpectedError(message: string, path?: string) {
  logger(true).error(
    `🙀🥶💀 I am surprised 🙀🥶💀, path: ${path ? path : "unset"}`
  );

  throw new Error(message);
}

/**
 * Converts the first character of `string` to upper case and the remaining
 * to lower case.
 */
export const capitalize = (arg: string) =>
  arg[0]?.toUpperCase() + arg.slice(1).toLowerCase();

/**
 * Gets the token from cache source
 */
async function getTokenFromCache(key: string) {
  // ! You need to implement your own caching logic here
  return null;

  // const pref = await prisma.preference.findFirst({
  //   where: {
  //     type: "system",
  //     name: key,
  //   },
  //   select: {
  //     value: true,
  //   },
  // });

  // if (!pref) return null;

  // type Tokenization = {
  //   token: string;
  //   tokenType: string;
  //   expirationDate: string;
  // };

  // const tokenization = pref.value as Tokenization;

  // // check for expiration
  // // if expired, return null
  // // else return authorization header string
  // const expired = dayjs(tokenization.expirationDate).isBefore(dayjs());
  // if (expired) return null;

  // return `${tokenization.tokenType} ${tokenization.token}`;
}

/** */
async function upsertTokenIntoCache(
  key: string,
  tokenization: {
    token: string;
    tokenType: string;
    expiresIn: number;
  }
) {
  // ! You need to implement your own caching logic here
  return null;

  // const expirationDate = dayjs()
  //   .add(tokenization.expiresIn, "second")
  //   // minus 5 minutes as recommended by ninja van
  //   .subtract(300, "second")
  //   .toDate();

  // const value = {
  //   token: tokenization.token,
  //   tokenType: tokenization.tokenType,
  //   expirationDate: String(expirationDate),
  // } as Prisma.JsonObject;

  // const _ = await prisma.preference.upsert({
  //   where: {
  //     name_type: {
  //       name: key,
  //       type: "system",
  //     },
  //   },
  //   update: {
  //     value: value,
  //   },
  //   create: {
  //     type: "system",
  //     name: key,
  //     value: value,
  //   },
  // });

  // // it's okay to have errors here
  // return _.id;
}

export {
  getTokenFromCache as getNinjaTokenFromCache,
  upsertTokenIntoCache as upsertNinjaTokenIntoCache,
};

/**
 *
 * returns statusText if json parsing fails
 */
export async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch (error: unknown) {
    const err = error as Error;
    logger(true).error(err.message);
    // return await response.text();
    return response.statusText;
  }
}

const defaultStoragePath = cwd() + "/public/pdfs/";

/**
 * Saves a file to a storage
 */
async function upsertBufferIntoCache(
  arrayBuffer: ArrayBuffer,
  name?: string,
  orderId?: string
) {
  // ! You need to implement your own caching logic here
  return null;

  // if (!name && !orderId) throw new Error("name or orderId is required");

  // const path = defaultStoragePath + name ?? new Date().toString();

  // const buffer = Buffer.from(arrayBuffer);

  // fs.createWriteStream(
  //   path
  //   /** + ".pdf" breaks the buffer on some apps
  //    * so we're saving the buffer itself, not the pdf file
  //    * TODO: fix this
  //    */
  // ).write(buffer);

  // if (orderId) {
  //   // TODO: make sure `fieldReference` is working properly
  //   const _ = await prisma.order.update({
  //     where: { id: orderId },
  //     data: {
  //       data: {
  //         ...prisma.order.fields.data,
  //         // I can just save the buffer
  //         // airwaybill: {
  //         //   buffer: arrayBuffer,
  //         //   updatedAt: String(new Date())
  //         // },
  //         airwaybill: {
  //           path: path /** + ".pdf" */,
  //           updatedAt: String(new Date()),
  //         },
  //       },
  //     },
  //   });

  //   if (!_) logger(true).error("airwaybill not updated");
  //   logger(true).info("airwaybill updated");

  //   // it's okay to have errors here
  // }

  // return {
  //   path,
  //   buffer,
  // };
}

async function getBufferPathFromCache(name?: string, orderId?: string) {
  // ! You need to implement your own caching logic here
  return null;

  // if (!name && !orderId) throw new Error("name or orderId is required");

  // function getFileFromStorage(path: string) {
  //   return fs.readFileSync(path);
  // }

  // if (orderId) {
  //   const _ = await prisma.order.findFirst({
  //     where: {
  //       id: orderId,
  //     },
  //     select: {
  //       data: true,
  //     },
  //   });

  //   if (!_?.data) return null;

  //   const data = _.data as { airwaybill: { path: string; updateAt: string } };

  //   // runtime fallback
  //   if (!data.airwaybill) return null;

  //   // lazy 😂
  //   try {
  //     getFileFromStorage(data.airwaybill.path);
  //   } catch (error) {
  //     return null;
  //   }

  //   return {
  //     path: data.airwaybill.path,
  //     buffer: getFileFromStorage(data.airwaybill.path),
  //   };
  // }

  // // lazy 😂
  // try {
  //   getFileFromStorage(defaultStoragePath + name);
  // } catch (error) {
  //   return null;
  // }

  // return {
  //   path: defaultStoragePath + name,
  //   buffer: getFileFromStorage(defaultStoragePath + name),
  // };
}

export {
  getBufferPathFromCache as getNinjaBufferPathFromCache,
  upsertBufferIntoCache as upsertNinjaBufferIntoCache,
};

export function selectStrings(selected: string[], strings: string[]): string[] {
  if (selected.includes("*")) return strings;

  return selected;
}

export function jsonParse(input: unknown) {
  if (typeof input !== "string") return "invalid input";

  try {
    const _ = JSON.parse(input);
    return _;
  } catch (error) {
    return "invalid input";
  }
}

export function breakCamelCaseString(camelCase: string, capitalize = false) {
  if (!/[A-Z]/.test(camelCase)) return camelCase;

  const words = camelCase.split(/(?=[A-Z])/);

  if (capitalize) {
    return words
      .map((_) => {
        if (_[0]) return _[0].toUpperCase() + _.slice(1);
        return "";
      })
      .join(" ");
  }

  return words.join(" ");
}
