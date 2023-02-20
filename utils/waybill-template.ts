import type { CustomWaybillInput } from "../schemas";

export const template = (
  data: CustomWaybillInput | CustomWaybillInput[],
  title?: string
) => {
  const main = (children: string, title?: string) => `
      <!DOCTYPE html>
      <html lang="en" class="h-full">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title ?? "Shipping Labels"}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Ubuntu+Mono:wght@400;700&display=swap" rel="stylesheet">
          <style type="text/css">
              ${templateCSS}
          </style>
        </head>
        <body class="h-full">
          <main class="h-full">
              ${children}
          </main>
        </body>
      </html>`;

  const ratioImage = (
    width: number,
    height: number,
    src: string,
    alt?: string
  ) =>
    `<div><img alt="${
      alt || "no alt"
    }" src="${src}" width="${width}" height="${height}" /></div>`;

  if (Array.isArray(data)) {
    const pages: string[] = [];

    for (const _data of data) {
      const {
        codes,
        trackingId,
        type,
        weight,
        receiver,
        sender,
        cod,
        deliveryDate,
        comments,
      } = _data;
      if (!codes) throw new Error("No codes provided in: " + trackingId);
      const { barcode, qrcode } = codes;

      const imgBarcode = ratioImage(
        BARCODE_WIDTH,
        BARCODE_HEIGHT,
        `data:image/png;base64,${barcode.toString("base64")}`,
        "Shipment Barcode"
      );
      const imgQrcode = ratioImage(
        QRCODE_WIDTH - 0,
        QRCODE_WIDTH - 0,
        `data:image/png;base64,${qrcode.toString("base64")}`,
        "Shipment QR Code"
      );

      const label = (sections: string[], width: number, height: number) => `
          <div
              class="mx-auto h-full"
              style="max-height: ${height}in; overflow: hidden; max-width: ${width}in"
              >
              <grid-container>
                  <!-- 01 -->
                  <grid-item nh2 nw2>${sections[0]}</grid-item>
                  <grid-item nh2 nw>${sections[1]}</grid-item>
                  <!-- 02 -->
                  <grid-item class="" nh nw3>${sections[2]}</grid-item>
                  <!-- 03 -->
                  <grid-item class="bordered" nh2 nw3>${sections[3]}</grid-item>
                  <!-- 04 -->
                  <grid-item nh2 nw3>${sections[4]}</grid-item>
                  <!-- 05 -->
                  <grid-item class="full-border intense" nh nw>${sections[5]}</grid-item>
                  <grid-item class="full-border intense" nh nw2>${sections[6]}</grid-item>
                  <!-- 06 -->
                  <grid-item class="" nh2 nw3>${sections[7]}</grid-item>
              </grid-container>
          </div>
          `;
      const iconText = (text: string, icon: string, smaller?: boolean) => `
          <p class="inline-flex" style="line-height: 0.9;">
            <span class="icon" style="margin-right: 5px;">${icon}</span>
            <span class="text" style="${
              !smaller ? "font-size: 1.1rem;" : "font-size: 0.90rem;"
            }">${text}</span>
          </p>
          `;

      const sections: string[] = [];
      // first row
      sections.push(`
            <div class="stack">
              <div
              style="display: block; position: relative; max-width: 230px; max-height: 63px; overflow: clip; margin-right: auto;"
              >
                ${ratioImage(150, 41, encodedNinjaLogo)}
              </div>
              <div>
                ${imgBarcode}
              </div>
              <p class="bold">${trackingId}</p>
            </div>
          `);
      sections.push(`
            <div class="stack qrborder" style="">
              <div class="qrborder_child style="width: 95px; height: 95px;">
                  ${imgQrcode}
              </div>
            </div>
          `);

      // second row
      sections.push(`
          <div class="group-apart w-full h-full">
            <p>Weight: ${weight} kg</p>
            <p>${type}</p>
          </div>
          `);

      // third row
      sections.push(`
          <div class="stack-apart w-full" style="gap: 10px;">
            <p class="title sans">TO (ADDRESSEE)</p>
            <div class="group-apart w-full bold">
              ${iconText(receiver.name, iconUser)}
              ${iconText(receiver.contact, iconPhone)}
            </div>
            <div class="h-full">
              ${iconText(receiver.address, iconLocation, true)}
            </div>
          </div>
          `);

      // fourth row
      sections.push(`
          <div class="stack-apart w-full" style="gap: 10px;">
            <p class="title sans">FROM (SENDER)</p>
            <div class="group-apart w-full bold">
              ${iconText(sender.name, iconUser)}
              ${sender.contact ? iconText(sender.contact, iconPhone) : ""}
            </div>
            <div class="h-full">
              ${
                sender.address
                  ? iconText(sender.address, iconLocation, true)
                  : ""
              }
            </div>
          </div>
          `);

      // fifth row
      sections.push(`
          <div>
            <p class="bold">COD: ${cod.amount} ${cod.currency}</p>
          </div>
          `);
      sections.push(`
          <div>
            ${iconText("Deliver by: " + deliveryDate, iconClock, true)}
          </div>
          `);

      // sixth row
      sections.push(`
          <div class="stack-apart w-full" style="gap: 10px;">
            <p class="title sans">Comments</p>
            <p class="" style="font-size: 0.75rem">
              ${comments ?? ""}
            </p>
          </div>
          `);

      pages.push(label(sections, LABEL_WIDTH, LABEL_HEIGHT));
    }

    return main(
      `
        ${pages.map((page) => page).join("\n")}
        `,
      title // title of the page
    );
  }

  const {
    codes,
    trackingId,
    type,
    weight,
    receiver,
    sender,
    cod,
    deliveryDate,
    comments,
  } = data;
  if (!codes) throw new Error("No codes provided");
  const { barcode, qrcode } = codes;

  const imgBarcode = ratioImage(
    BARCODE_WIDTH,
    BARCODE_HEIGHT,
    `data:image/png;base64,${barcode.toString("base64")}`,
    "Shipment Barcode"
  );
  const imgQrcode = ratioImage(
    QRCODE_WIDTH - 0,
    QRCODE_WIDTH - 0,
    `data:image/png;base64,${qrcode.toString("base64")}`,
    "Shipment QR Code"
  );

  const label = (sections: string[], width: number, height: number) => `
      <div
          class="mx-auto h-full"
          style="max-height: ${height}in; overflow: hidden; max-width: ${width}in"
          >
          <grid-container>
              <!-- 01 -->
              <grid-item nh2 nw2>${sections[0]}</grid-item>
              <grid-item nh2 nw>${sections[1]}</grid-item>
              <!-- 02 -->
              <grid-item class="" nh nw3>${sections[2]}</grid-item>
              <!-- 03 -->
              <grid-item class="bordered" nh2 nw3>${sections[3]}</grid-item>
              <!-- 04 -->
              <grid-item nh2 nw3>${sections[4]}</grid-item>
              <!-- 05 -->
              <grid-item class="full-border intense" nh nw>${sections[5]}</grid-item>
              <grid-item class="full-border intense" nh nw2>${sections[6]}</grid-item>
              <!-- 06 -->
              <grid-item class="" nh2 nw3>${sections[7]}</grid-item>
          </grid-container>
      </div>
      `;
  const iconText = (text: string, icon: string, smaller?: boolean) => `
      <p class="inline-flex" style="line-height: 0.9;">
        <span class="icon" style="margin-right: 5px;">${icon}</span>
        <span class="text" style="${
          !smaller ? "font-size: 1.1rem;" : "font-size: 0.90rem;"
        }">${text}</span>
      </p>
      `;

  const sections: string[] = [];
  // first row
  sections.push(`
        <div class="stack">
          <div
          style="display: block; position: relative; max-width: 230px; max-height: 63px; overflow: clip; margin-right: auto;"
          >
            ${ratioImage(150, 41, encodedNinjaLogo)}
          </div>
          <div>
            ${imgBarcode}
          </div>
          <p class="bold">${trackingId}</p>
        </div>
      `);
  sections.push(`
        <div class="stack qrborder" style="">
          <div class="qrborder_child style="width: 95px; height: 95px;">
              ${imgQrcode}
          </div>
        </div>
      `);

  // second row
  sections.push(`
      <div class="group-apart w-full h-full">
        <p>Weight: ${weight} kg</p>
        <p>${type}</p>
      </div>
      `);

  // third row
  sections.push(`
      <div class="stack-apart w-full" style="gap: 10px;">
        <p class="title sans">TO (ADDRESSEE)</p>
        <div class="group-apart w-full bold">
          ${iconText(receiver.name, iconUser)}
          ${iconText(receiver.contact, iconPhone)}
        </div>
        <div class="h-full">
          ${iconText(receiver.address, iconLocation, true)}
        </div>
      </div>
      `);

  // fourth row
  sections.push(`
      <div class="stack-apart w-full" style="gap: 10px;">
        <p class="title sans">FROM (SENDER)</p>
        <div class="group-apart w-full bold">
          ${iconText(sender.name, iconUser)}
          ${sender.contact ? iconText(sender.contact, iconPhone) : ""}
        </div>
        <div class="h-full">
          ${sender.address ? iconText(sender.address, iconLocation, true) : ""}
        </div>
      </div>
      `);

  // fifth row
  sections.push(`
      <div>
        <p class="bold">COD: ${cod.amount ? cod.amount.toLocaleString() : ""} ${
    cod.currency ?? ""
  }</p>
      </div>
      `);
  sections.push(`
      <div>
        ${iconText("Deliver by: " + deliveryDate, iconClock, true)}
      </div>
      `);

  // sixth row
  sections.push(`
      <div class="stack-apart w-full" style="gap: 10px;">
        <p class="title sans">Comments</p>
        <p class="" style="font-size: 0.75rem">
          ${comments}
        </p>
      </div>
      `);

  return main(
    `
      ${label(sections, LABEL_WIDTH, LABEL_HEIGHT)}
      `,
    title // title of the page
  );
};

// constants
export const BARCODE_HEIGHT = 40,
  BARCODE_WIDTH = 240,
  QRCODE_WIDTH = 100;

/**
 * A6 in px
 * 5.83 = 559.68
 * 4.13 = 396.48
 */
export const LABEL_HEIGHT = 5.83,
  LABEL_WIDTH = 4.13;

// icons
const iconPhone = `
  <svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><title>Call</title><path d="M478.94 370.14c-5.22-5.56-23.65-22-57.53-43.75-34.13-21.94-59.3-35.62-66.52-38.81a3.83 3.83 0 00-3.92.49c-11.63 9.07-31.21 25.73-32.26 26.63-6.78 5.81-6.78 5.81-12.33 4-9.76-3.2-40.08-19.3-66.5-45.78s-43.35-57.55-46.55-67.3c-1.83-5.56-1.83-5.56 4-12.34.9-1.05 17.57-20.63 26.64-32.25a3.83 3.83 0 00.49-3.92c-3.19-7.23-16.87-32.39-38.81-66.52-21.78-33.87-38.2-52.3-43.76-57.52a3.9 3.9 0 00-3.89-.87 322.35 322.35 0 00-56 25.45A338 338 0 0033.35 92a3.83 3.83 0 00-1.26 3.74c2.09 9.74 12.08 50.4 43.08 106.72 31.63 57.48 53.55 86.93 100 133.22S252 405.21 309.54 436.84c56.32 31 97 41 106.72 43.07a3.86 3.86 0 003.75-1.26A337.73 337.73 0 00454.35 430a322.7 322.7 0 0025.45-56 3.9 3.9 0 00-.86-3.86z"/></svg>
  `;
const iconUser = `
  <svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><title>Person</title><path d="M256 256a112 112 0 10-112-112 112 112 0 00112 112zm0 32c-69.42 0-208 42.88-208 128v64h416v-64c0-85.12-138.58-128-208-128z"/></svg>
  `;
const iconLocation = `
  <svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><title>Location</title><path d="M256 32C167.67 32 96 96.51 96 176c0 128 160 304 160 304s160-176 160-304c0-79.49-71.67-144-160-144zm0 224a64 64 0 1164-64 64.07 64.07 0 01-64 64z"/></svg>`;
const iconClock = `
  <svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><title>Time</title><path d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 128v144h96"/></svg>
  `;
const encodedNinjaLogo = `data:image/svg+xml;charset=UTF-8, %3csvg xmlns='http://www.w3.org/2000/svg' width='600' height='164' viewBox='0 0 600 164' %3e%3cg fill='none' fill-rule='evenodd'%3e%3cpath fill='%23C52133' d='M137.869 110.774v-35.11a28.61 28.61 0 0 0-.454-5.161c-.307-1.635-.8-3.078-1.492-4.326a7.715 7.715 0 0 0-2.92-2.966c-1.25-.732-2.832-1.1-4.733-1.1-1.9 0-3.563.368-4.992 1.1a10.06 10.06 0 0 0-3.565 3.03c-.953 1.29-1.663 2.776-2.14 4.454a19.09 19.09 0 0 0-.714 5.23v34.85H95.463V46.493h20.617v8.908h.26c.78-1.376 1.793-2.734 3.05-4.067 1.25-1.336 2.722-2.472 4.408-3.422a27.32 27.32 0 0 1 5.513-2.32c1.986-.607 4.102-.905 6.351-.905 4.32 0 7.994.773 11.02 2.32 3.028 1.552 5.469 3.55 7.332 6.006 1.86 2.449 3.196 5.27 4.019 8.453a38.076 38.076 0 0 1 1.232 9.55v39.757h-21.396M172.362 110.774h21.266v-64.28h-21.266v64.28zm22.821-84.802c0 1.633-.323 3.16-.972 4.579a11.767 11.767 0 0 1-2.59 3.68c-1.085 1.034-2.383 1.85-3.893 2.451-1.512.607-3.09.905-4.732.905-3.459 0-6.354-1.14-8.688-3.42-2.337-2.278-3.502-5.012-3.502-8.195 0-1.552.302-3.038.909-4.453a10.474 10.474 0 0 1 2.593-3.682 13.984 13.984 0 0 1 3.888-2.516c1.47-.644 3.068-.968 4.8-.968 1.642 0 3.22.302 4.732.905 1.51.6 2.808 1.417 3.892 2.451a11.84 11.84 0 0 1 2.591 3.676c.649 1.423.972 2.95.972 4.587zM249.648 110.774v-35.11c0-1.803-.151-3.526-.455-5.163-.302-1.633-.799-3.076-1.49-4.324a7.732 7.732 0 0 0-2.917-2.966c-1.254-.732-2.832-1.1-4.734-1.1-1.905 0-3.565.368-4.993 1.1a10.06 10.06 0 0 0-3.565 3.03c-.952 1.29-1.666 2.776-2.141 4.454a19.086 19.086 0 0 0-.712 5.229v34.85h-21.398v-64.28h20.619v8.908h.26c.78-1.376 1.793-2.734 3.047-4.068 1.252-1.335 2.723-2.471 4.409-3.421a27.415 27.415 0 0 1 5.513-2.32c1.985-.607 4.103-.905 6.355-.905 4.32 0 7.994.773 11.02 2.32 3.025 1.552 5.468 3.55 7.328 6.006 1.855 2.449 3.198 5.27 4.022 8.453.82 3.181 1.23 6.37 1.23 9.55v39.757h-21.398M307.357 25.97c0 1.635-.327 3.164-.974 4.58a11.854 11.854 0 0 1-2.595 3.683c-1.082 1.03-2.378 1.849-3.89 2.451-1.517.603-3.09.905-4.733.905-3.46 0-6.355-1.142-8.69-3.423-2.332-2.278-3.501-5.012-3.501-8.196 0-1.548.305-3.034.909-4.453a10.638 10.638 0 0 1 2.593-3.68 13.965 13.965 0 0 1 3.89-2.516c1.471-.644 3.07-.97 4.8-.97 1.642 0 3.215.304 4.732.907 1.512.602 2.808 1.417 3.89 2.451a11.837 11.837 0 0 1 2.595 3.678c.647 1.421.974 2.948.974 4.583m-1.556 86.483c0 3.954-.372 7.72-1.104 11.293-.737 3.572-2.054 6.692-3.955 9.358-1.903 2.667-4.54 4.777-7.91 6.323-3.37 1.553-7.654 2.326-12.84 2.326-1.47 0-3.07-.088-4.797-.259-1.727-.173-3.196-.43-4.409-.771l1.428-17.686c.777.26 1.575.43 2.395.514.825.085 1.533.13 2.142.13 3.113 0 5.188-1.052 6.223-3.162 1.037-2.11 1.556-4.799 1.556-8.066v-65.96H305.8v65.96M357.538 82.763h-2.724c-2.332 0-4.688.11-7.064.324-2.382.216-4.498.622-6.356 1.227-1.859.604-3.393 1.484-4.604 2.646-1.212 1.16-1.814 2.69-1.814 4.58 0 1.21.278 2.238.842 3.101a6.57 6.57 0 0 0 2.138 2.065c.865.514 1.859.881 2.985 1.093 1.122.218 2.202.324 3.243.324 4.319 0 7.627-1.18 9.915-3.548 2.293-2.367 3.439-5.572 3.439-9.617v-2.195zm-39.03-27.492c3.8-3.614 8.232-6.324 13.292-8.132 5.055-1.807 10.217-2.71 15.492-2.71 5.452 0 10.054.665 13.816 2 3.757 1.334 6.805 3.4 9.14 6.194 2.334 2.799 4.04 6.328 5.123 10.588 1.078 4.257 1.62 9.313 1.62 15.164v32.401h-19.453v-6.841h-.39c-1.641 2.665-4.13 4.73-7.452 6.194-3.33 1.462-6.941 2.194-10.831 2.194-2.593 0-5.273-.343-8.041-1.03-2.765-.687-5.295-1.808-7.584-3.36-2.291-1.549-4.172-3.614-5.641-6.197-1.471-2.578-2.205-5.762-2.205-9.55 0-4.647 1.272-8.388 3.824-11.228 2.547-2.84 5.836-5.034 9.859-6.583 4.018-1.55 8.494-2.583 13.42-3.097 4.93-.518 9.727-.775 14.392-.775v-1.03c0-3.186-1.122-5.531-3.37-7.037-2.248-1.507-5.016-2.26-8.3-2.26-3.028 0-5.944.647-8.754 1.934-2.812 1.292-5.212 2.84-7.197 4.648l-10.76-11.487z' /%3e%3cpath fill='%23000' d='M434.31 111.069h-23.112l-25.604-64.75h23.64l13.718 41.993h.392l13.71-41.993h22.861l-25.605 64.75M503.281 82.856h-2.742c-2.35 0-4.725.106-7.117.32-2.395.22-4.53.636-6.4 1.236-1.881.609-3.413 1.496-4.642 2.67-1.216 1.167-1.832 2.708-1.83 4.614 0 1.212.286 2.255.848 3.122a6.674 6.674 0 0 0 2.163 2.079c.866.522 1.868.889 3.003 1.103 1.13.217 2.213.325 3.266.325 4.353 0 7.68-1.189 9.987-3.574 2.31-2.382 3.464-5.609 3.464-9.69v-2.205zM463.964 55.16c3.825-3.641 8.295-6.371 13.394-8.194 5.087-1.816 10.293-2.73 15.61-2.73 5.482 0 10.122.669 13.904 2.015 3.796 1.343 6.86 3.423 9.204 6.243 2.359 2.819 4.082 6.37 5.166 10.658 1.087 4.29 1.631 9.383 1.631 15.283v32.633h-19.592v-6.893h-.392c-1.654 2.69-4.157 4.77-7.509 6.245-3.358 1.464-6.986 2.21-10.904 2.21-2.62 0-5.318-.347-8.098-1.048-2.788-.689-5.344-1.813-7.643-3.38-2.31-1.556-4.206-3.638-5.682-6.233-1.487-2.602-2.225-5.807-2.225-9.623 0-4.679 1.288-8.455 3.857-11.317 2.564-2.857 5.876-5.065 9.924-6.625 4.048-1.565 8.56-2.603 13.523-3.121 4.963-.524 9.794-.783 14.499-.783v-1.04c0-3.202-1.134-5.565-3.402-7.086-2.265-1.51-5.046-2.27-8.354-2.27-3.055 0-5.989.647-8.822 1.949-2.83 1.297-5.243 2.853-7.248 4.678l-10.841-11.571zM578.261 111.069V75.704c0-1.82-.156-3.553-.457-5.203-.304-1.645-.805-3.095-1.5-4.35a7.85 7.85 0 0 0-2.94-2.998c-1.26-.73-2.854-1.1-4.763-1.1-1.922 0-3.596.37-5.034 1.1a10.25 10.25 0 0 0-3.596 3.061c-.957 1.298-1.678 2.791-2.15 4.481a19.14 19.14 0 0 0-.72 5.27v35.104h-21.555V46.317h20.77v8.975h.261c.785-1.383 1.808-2.75 3.07-4.098a18.52 18.52 0 0 1 4.433-3.446 27.74 27.74 0 0 1 5.554-2.336c2.01-.604 4.137-.914 6.407-.914 4.354 0 8.05.779 11.107 2.341 3.04 1.56 5.505 3.574 7.375 6.045 1.877 2.469 3.22 5.309 4.056 8.514.824 3.21 1.24 6.42 1.24 9.623v40.048H578.26' /%3e%3cg%3e%3cpath fill='%23C52033' d='M40.137.336C16.309.336.312 16.082.312 39.499c0 16.023 8.59 29.795 17.68 44.364 4.586 7.334 9.25 14.808 13.074 22.9l9.07 19.652 9.235-21.038c4.326-9.168 10.468-16.512 14.754-23.328 8.49-13.472 15.818-25.11 15.818-43.406C79.943 16.799 62.824.336 40.137.336z' /%3e%3cpath fill='%23FFF' d='M48.306 103.972c-.36.758-.72 1.535-1.08 2.332-.7 1.515-1.381 3.089-2.044 4.704a148.426 148.426 0 0 0-4.645 12.895h-.18a88.815 88.815 0 0 0-3.683-11.56v-.02a87.869 87.869 0 0 0-1.984-4.663c-.339-.797-.7-1.574-1.08-2.332-11.573-24.254-30.214-42.75-30.214-65.49 0-20.19 13.294-36.093 36.74-36.093 21.286 0 36.743 15.048 36.743 35.236 0 26.187-15.619 37.806-28.573 64.99zm31.637-65.329C79.943 16.799 62.824.336 40.137.336 16.309.336.312 16.082.312 39.499c0 16.023 8.59 29.795 17.68 44.364 4.586 7.334 9.25 14.808 13.074 22.9l-18.06 10.265v29.934l29.313 16.68 28.834-16.482v-30.132l-20.304-11.6c4.326-9.167 8.99-16.563 13.276-23.379 8.49-13.472 15.818-25.11 15.818-43.406z' /%3e%3cpath fill='%23000' d='M68.15 118.262v26.667l-25.83 14.769-25.97-14.77-.34-.198v-26.468l16.119-9.148c.7 1.555 1.36 3.129 1.962 4.724l-10.332 6.059 18.3 10.522 18.361-10.522-12.674-7.393a103.2 103.2 0 0 1 2.043-4.744l18.36 10.502z' /%3e%3cpath fill='%23FFF' d='M40.598 10.78c-16.64 0-30.135 13.434-30.135 30.014 0 16.563 13.495 29.995 30.135 29.995 16.66 0 30.155-13.432 30.155-29.995 0-16.58-13.495-30.015-30.155-30.015z' /%3e%3cpath fill='%23232020' d='M40.637 67.202c-14.776 0-26.77-11.94-26.77-26.647 0-14.728 11.994-26.645 26.77-26.645 14.797 0 26.772 11.917 26.772 26.645 0 14.708-11.975 26.647-26.772 26.647z' /%3e%3cpath fill='%23FFFFFE' d='M20.975 141.62l18.481 10.724v-17.539l-18.28-10.604-.201 17.419M51.691 43.844c-2.904 0-5.266-2.332-5.266-5.223 0-2.908 2.362-5.24 5.266-5.24 2.903 0 5.265 2.332 5.265 5.24 0 2.891-2.362 5.223-5.265 5.223zm-22.766.14c-2.905 0-5.267-2.352-5.267-5.243 0-2.889 2.362-5.24 5.267-5.24 2.902 0 5.265 2.351 5.265 5.24 0 2.891-2.363 5.242-5.265 5.242zm25.129-14.37H27.162a9.049 9.049 0 0 0-6.406 2.65c-1.663 1.655-2.684 3.906-2.684 6.399 0 4.98 4.105 9.047 9.09 9.047h26.892c2.502 0 4.765-1.016 6.426-2.651 1.642-1.655 2.664-3.906 2.664-6.396 0-4.984-4.084-9.048-9.09-9.048z' /%3e%3cpath fill='%23FFFFFE' d='M29.144 34.417c-1.08 0-1.962.878-1.962 1.953 0 1.076.881 1.953 1.962 1.953a1.962 1.962 0 0 0 1.964-1.953 1.962 1.962 0 0 0-1.964-1.953M51.91 34.278a1.96 1.96 0 0 0-1.962 1.953c0 1.095.882 1.972 1.962 1.972a1.964 1.964 0 0 0 1.962-1.972c0-1.078-.88-1.953-1.962-1.953' /%3e%3c/g%3e%3c/g%3e%3c/svg%3e`;

// css
const flexCSS = `
  .stack-apart {
      display: flex;
      flex-direction: column;
      align-items: space-between;
      justify-content: space-between;
      gap: 0;
  }
  .stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;  
  }
  .stack-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;  
  }
  .group-center {
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: center;
      flex-wrap: nowrap;
      justify-content: center;
      gap: 0;
  }
  .group-apart {
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: center;
      flex-wrap: nowrap;
      justify-content: space-between;
      gap: 0;
  }
  `;
const iconCSS = `
  .ionicon {
      width: 14px;
      height: 14px;
  }
  `;
const templateCSS = `
  *,
        ::before,
        ::after {
          box-sizing: border-box;
          border-width: 0;
          border-style: solid;
          border-color: #e5e7eb;
        }
  
        html {
          line-height: 1.5;
          -webkit-text-size-adjust: 100%;
          -moz-tab-size: 4;
          -o-tab-size: 4;
          tab-size: 4;
        
          font-family: 'Ubuntu Mono', monospace, sans-serif;      
        }
  
        body {
          margin: 0;
          line-height: inherit;
          font-family: 'Ubuntu Mono', monospace, 'Open Sans', sans-serif;
        }
  
        p {
          margin: 0;
          padding: 0;
          color: black;
          font-size: 1rem;
        }
  
        .title {
          font-size: 1.2rem;
          font-weight: 800;
          opacity: 0.5;
        }
  
        .sans {
          font-family: 'Open Sans', sans-serif, monospace;
        }
  
        .inline-flex {
          display: inline-flex;
        }
  
        
        .bold {
          font-weight: 700;
        }
        .bordered {
          border-bottom-width: 1px;
          border-bottom-color: black;
        }
        .full-border {
          border-width: 2px;
          border-color: black;
        }
  
  
        .qrborder {
          max-width: 110px;
          max-height: 110px;
          font-size: 1em;
          padding: 5px;
          background-repeat: no-repeat;
          background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%;
          background-size: 5px 5px, 5px 5px, 5px 5px, 5px 5px;
          background-image: url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=%22http:%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox=%220 0 40 40%22%3E%3Cpolygon points=%2240 0 8 0 0 0 0 8 0 40 8 40 8 8 40 8 40 0%22 fill=%22%23000%22 %2F%3E%3C%2Fsvg%3E"), url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=%22http:%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox=%220 0 40 40%22%3E%3Cpolygon points=%2240 0 8 0 0 0 0 8 0 40 8 40 8 8 40 8 40 0%22 fill=%22%23000%22 transform=%22translate(40, 0) rotate(90)%22 %2F%3E%3C%2Fsvg%3E"), url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=%22http:%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox=%220 0 40 40%22%3E%3Cpolygon points=%2240 0 8 0 0 0 0 8 0 40 8 40 8 8 40 8 40 0%22 fill=%22%23000%22 transform=%22translate(40, 40) rotate(180)%22 %2F%3E%3C%2Fsvg%3E"), url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=%22http:%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox=%220 0 40 40%22%3E%3Cpolygon points=%2240 0 8 0 0 0 0 8 0 40 8 40 8 8 40 8 40 0%22 fill=%22%23000%22 transform=%22translate(0, 40) rotate(270)%22 %2F%3E%3C%2Fsvg%3E");
        }
  
        .qrborder_child {
          max-width: 100px;
          max-height: 100px;
        }
        
        
        .mx-auto {
          margin-left: auto;
          margin-right: auto;
        }
        .h-full {
          height: 100%;
        }
        .w-full {
          width: 100%;
        }
        .gray {
          background-color: #dbdbdb;
        }
        .red {
          background-color: #fe7272;
        }
        .blue {
          background-color: #72b6fe;
        }
        .orange {
          background-color: #feaf72;
        }
        .purple {
          background-color: #a372fe;
        }
        .green {
          background-color: #72fe74;
        }
  
        grid-container {
          display: grid;
          grid-auto-rows: 0.583in;
          grid-gap: 1px;
          grid-template-columns: repeat(auto-fill, minmax(30%, 1fr)); /* 4 */
        }
  
        
        [nh] {
          grid-row: span 1;
        }
        [nw] {
          grid-column: span 1;
        }
        [nh2] {
          grid-row: span 2;
        }
        [nw2] {
          grid-column: span 2;
        }
        [nh3] {
          grid-row: span 3;
        }
        [nw3] {
          grid-column: span 3;
        }
        
        grid-item {
          padding: 10px;
          width: 100%;
        }
        .intense {
          padding: 5px;
        }
  
        ${flexCSS}
        ${iconCSS}
  `;
