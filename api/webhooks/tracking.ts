import { z } from "zod";
import hmac from "crypto-js/hmac-sha256";
import base64 from "crypto-js/enc-base64";

const Incoming = z.object({
  signature: z.string(),
  body: z.string(),
  secret: z.string(),
});

type VerificationArgs = {
  signature: string;
  body: string;
  secret: string;
};
function verifyWebhookSignature(args: VerificationArgs) {
  const { signature, body, secret } = Incoming.parse(args);

  const hash = base64.stringify(hmac(body, secret));

  if (hash !== signature) {
    throw new Error(`header 's value does not match the expected value.`);
  }

  return true;
}

export { verifyWebhookSignature as verifyNinjaWebhookSignature };
