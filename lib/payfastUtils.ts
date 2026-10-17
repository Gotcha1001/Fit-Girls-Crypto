// lib/payfastUtils.ts
//
// Ported 1:1 from the resort site. The signature logic is deliberately
// UNCHANGED, it is the part PayFast is fussy about. Only two things differ:
//   * credentials come from env only (no hard-coded fallbacks in source)
//   * we no longer log the string that contains the passphrase
import crypto from "crypto";

export type PayFastCredentials = {
  merchantId: string;
  merchantKey: string;
  passphrase: string | null;
};

/**
 * PayFast's backend is PHP and recomputes the signature using PHP's
 * urlencode() rules: alphanumerics and - _ . stay raw, spaces become "+",
 * and everything else is percent-encoded (uppercase hex).
 *
 * JS's encodeURIComponent() leaves `! * ' ( )` unescaped, PHP does not.
 * Any value containing one of those hashes differently and PayFast answers
 * with "signature does not match". This wrapper patches that gap.
 */
function phpUrlEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, "+")
    .replace(
      /[!'()*]/g,
      (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
    );
}

/**
 * Generate the PayFast checkout signature. PayFast requires this exact
 * field order (NOT alphabetical), empty values skipped, passphrase last.
 */
export function generateSignature(
  data: Record<string, string | number | undefined>,
  passPhrase: string | null = null,
): string {
  const keys = [
    "merchant_id",
    "merchant_key",
    "return_url",
    "cancel_url",
    "notify_url",
    "name_first",
    "name_last",
    "email_address",
    "cell_number",
    "m_payment_id",
    "amount",
    "item_name",
    "item_description",
    "custom_int1",
    "custom_int2",
    "custom_int3",
    "custom_int4",
    "custom_int5",
    "custom_str1",
    "custom_str2",
    "custom_str3",
    "custom_str4",
    "custom_str5",
    "email_confirmation",
    "confirmation_address",
    "payment_method",
  ] as const;

  let pfOutput = "";
  keys.forEach((key) => {
    const value = data[key];
    if (value != null && value !== "") {
      const str = String(value).trim();
      pfOutput += `${key}=${phpUrlEncode(str)}&`;
    }
  });

  let getString = pfOutput.slice(0, -1); // remove last &
  if (passPhrase?.trim()) {
    getString += `&passphrase=${passPhrase.trim()}`;
  }

  if (process.env.PAYFAST_DEBUG === "true") {
    // Passphrase masked on purpose.
    console.log(
      "PayFast – string to hash:",
      getString.replace(/passphrase=.*$/, "passphrase=***"),
    );
  }
  return crypto.createHash("md5").update(getString).digest("hex");
}

/**
 * Validate an incoming ITN signature.
 * Uses EVERY parameter PayFast sent (except `signature`), in the order
 * received, NO sorting, empty values included.
 */
export function validateSignature(
  params: Record<string, string>,
  passPhrase: string | null = null,
): boolean {
  const received = params.signature;
  if (!received) {
    console.error("PayFast ITN – No signature received");
    return false;
  }

  const { signature, ...dataWithoutSignature } = params;
  void signature;

  let pfOutput = "";
  Object.keys(dataWithoutSignature).forEach((key) => {
    const value = dataWithoutSignature[key];
    pfOutput += `${key}=${phpUrlEncode(value.trim())}&`;
  });

  let getString = pfOutput.slice(0, -1);
  if (passPhrase?.trim()) {
    getString += `&passphrase=${passPhrase.trim()}`;
  }

  const calculated = crypto.createHash("md5").update(getString).digest("hex");

  if (process.env.PAYFAST_DEBUG === "true") {
    console.log("PayFast ITN – calculated:", calculated);
    console.log("PayFast ITN – received:  ", received);
  }
  return calculated === received;
}

export function getPayFastUrl(): string {
  return process.env.NODE_ENV === "production"
    ? "https://www.payfast.co.za/eng/process"
    : "https://sandbox.payfast.co.za/eng/process";
}

export function getPayFastHost(): string {
  return process.env.NODE_ENV === "production"
    ? "www.payfast.co.za"
    : "sandbox.payfast.co.za";
}

/**
 * Merchant credentials + passphrase for the current environment.
 * Sandbox (npm run dev):   PAYFAST_SANDBOX_MERCHANT_ID / _KEY / _PASSPHRASE
 * Live (production build): PAYFAST_MERCHANT_ID / _KEY / _SALT_PASSPHRASE
 */
export function getPayFastCredentials(): PayFastCredentials {
  const isProd = process.env.NODE_ENV === "production";

  const merchantId = isProd
    ? process.env.PAYFAST_MERCHANT_ID
    : process.env.PAYFAST_SANDBOX_MERCHANT_ID;
  const merchantKey = isProd
    ? process.env.PAYFAST_MERCHANT_KEY
    : process.env.PAYFAST_SANDBOX_MERCHANT_KEY;
  const passphrase = isProd
    ? process.env.PAYFAST_SALT_PASSPHRASE
    : process.env.PAYFAST_SANDBOX_PASSPHRASE;

  if (!merchantId || !merchantKey) {
    throw new Error("PayFast merchant credentials are not configured");
  }
  return { merchantId, merchantKey, passphrase: passphrase ?? null };
}
