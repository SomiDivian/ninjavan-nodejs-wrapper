import bwipjs from "bwip-js";
import {
  BARCODE_HEIGHT,
  LABEL_HEIGHT,
  LABEL_WIDTH,
  QRCODE_WIDTH,
  template,
  validate,
} from "../utils";
import type { CustomWaybillInput } from "../schemas";
import { CustomWaybill } from "../schemas";
import invariant from "tiny-invariant";

async function generateCodes(ids: string[]) {
  const _: {
    id: string;
    codes: {
      barcode: Buffer;
      qrcode: Buffer;
    };
  }[] = [];

  // how much time do these Promises take to resolve?
  console.time("generateCodes");

  for (const id of ids) {
    const _barcode = bwipjs.toBuffer({
      bcid: "code128",
      text: id,
      height: BARCODE_HEIGHT,
      // includetext: false,
      // textxalign: "center",
    });
    const _qrcode = bwipjs.toBuffer({
      bcid: "qrcode",
      text: id,
      height: QRCODE_WIDTH,
      width: QRCODE_WIDTH,
    });

    const [barcode, qrcode] = await Promise.all([_barcode, _qrcode]);

    _.push({
      id,
      codes: {
        barcode,
        qrcode,
      },
    });
  }

  console.timeEnd("generateCodes");
  //              ^ >16000ms for 100 ids in cloud

  return _;
}

/**
 *
 * @param input see `NinjaWaybillInput` in `waybill-template.ts`
 * @returns url: URL to the stored generated PDF
 */
async function generatePDF(
  input: CustomWaybillInput[],
  title?: string,
  /** if true, generatePDF will use the codes Buffer from the input */
  isReady?: boolean
) {
  // validation
  for (const i of input) {
    try {
      validate(CustomWaybill, i);
    } catch (error) {
      throw new Error(
        `Invalid input for ${i.trackingId}\n${(error as Error).message}`
      );
    }
  }

  if (typeof isReady === "undefined") isReady = false;

  const trackingIds = input.map((i) => i.trackingId);

  const codes = !isReady
    ? await generateCodes(trackingIds)
    : input.map((i) => {
        if (!i.codes)
          throw new Error(`You need to provide codes' buffers for 
      ${i.trackingId}\n try setting isReady to false`);

        return {
          id: i.trackingId,
          codes: i.codes,
        };
      });

  const data = input.map((i) => {
    // find the corresponding codes
    const _codes = codes.find((c) => c.id === i.trackingId);
    if (!_codes) throw new Error(`Unable to find codes for ${i.trackingId}`);

    return {
      ...i,
      codes: _codes.codes,
    };
  });

  // A sample airwaybill template, check `waybill-screenshot.png`
  const html = template(data, title);

  const opts = {
    format: "A6",
    height: LABEL_HEIGHT + "in",
    width: LABEL_WIDTH + "in",
    printBackground: true,
    margin: {
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
    },
    displayHeaderFooter: false,
    landscape: false,
  };

  const API_URL = process.env.PDFGEN_API_URL;
  const API_SECRET = process.env.PDFGEN_API_SECRET;

  invariant(API_URL, "PDFGEN_API_URL is not defined");
  invariant(API_SECRET, "PDFGEN_API_SECRET is not defined");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/text",
      Authorization: API_SECRET,
    },
    body: JSON.stringify({
      content: html,
      options: opts,
    }),
  });

  const url = await response.text();

  return {
    url,
  };
}

export { generatePDF as generateWaybillsPDF };
