# Tools used

- typescript: for better DX
- zod: validation library
- pino: logger
- bwip-js: barcode & qrcode generator
- crypto-js: encryption library

---

# Features

- ✅ Authentication
- ✅ Tracking
- ✅ Create Order
- ✅ Create Multiple Orders `custom`
- ✅ Generate Waybill
- ✅ Cancel Order
- ✅ Cancel Multiple Orders `custom`
- ✅ Generate Waybill `custom`
- ✅ Generate Multiple Waybills `custom`
- ✅ Receive Webhook `custom`
- 🔥 Bonus: `express()` creates multiple orders and generates waybills, not to mention it takes care of reverse changes when error occurs if you specify so

- 🔴 Mocking Service
- ✅ Logging Service

---

# Install

```cli
npm i zod zod-error pino abstract-logging pino-pretty bwip-js crypto-js
```

---

# How to use

```ts
const { express, cancelOrders } = ninjavan({
  clientId: "your_api_key_id",
  clientSecret: "your_api_secret",
  baseUrl: "https://api-sandbox.ninjavan.co",
  countryCode: "sg",
});
await express(/** orders data */);
```

---

# Examples

```ts
const fatalErrorsCodes = [9903, 9904];
const { receiveWebhook } = ninjavan({
  clientId: "client-id",
  clientSecret: "client-secret",
  baseUrl: "https://you_don'methods.but_for_validation_gotta_be_url",
  countryCode: "sg",
});
return await receiveWebhook(
  {
    request,
    registeredEvents: ["*"],
  },
  async (errCodeAndMessage, data) => {
    if (fatalErrorsCodes.includes(errCodeAndMessage.code)) {
      await reportFetalError(errCodeAndMessage, data);
      return json({ message: "fatal_error" }, { status: 400 });
    }
    return json({ message: "success" }, { status: 200 });
  },
  (data) => {
    // do something with the data
    switch (
      data.event // data.event is a NinjaWebhookEventType
    ) {
      case "Completed":
        await handleCompleted(data);
        break;
      default:
        break;
    }
    return json({ message: "success" }, { status: 200 });
  }
);
```

---

# Notes

- You need to implement caching logic yourself
- I used an external API to generate custom pdf [link](https://github.com/SomiDivian/puppeteer-aws-pulumi)

# Contribute

Feel free to contribute to this code anyway you want
