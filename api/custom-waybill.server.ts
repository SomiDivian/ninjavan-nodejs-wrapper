import bwipjs from "bwip-js";
import type { CustomWaybillInput } from "../schemas";
import {
  BARCODE_HEIGHT,
  LABEL_HEIGHT,
  LABEL_WIDTH,
  QRCODE_WIDTH,
  template,
} from "../utils";
import invariant from "tiny-invariant";

async function generateCodes(id: string) {
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

  return { barcode, qrcode };
}

/**
 *
 * @param input see `CustomWaybillInput` in `waybill-template.ts`
 * @returns url: Path to the generated PDF
 */
async function generatePDF(input: CustomWaybillInput) {
  const { trackingId, codes: _codes, ...rest } = input;

  const codes = _codes ?? (await generateCodes(trackingId));

  const html = template({
    codes,
    trackingId,
    ...rest,
  });
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
      "Content-Type": "application/pdf",
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

  // return { buffer, path };
}

export { generatePDF as generateWaybillPDF };
