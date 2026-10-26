// // convex/lib/plisio.ts
// //
// // Everything that talks to Plisio lives here: create an invoice, verify the
// // webhook signature, send a payout. Uses plain fetch, no SDK.

// /** Clients pay in, and girls are paid in, the same coin: USDT on TRON. */
// export const PAY_CURRENCY = "USDT_TRX";

// function apiBase(): string {
//   return process.env.PLISIO_API_BASE ?? "https://api.plisio.net/api/v1";
// }

// function secret(): string {
//   const k = process.env.PLISIO_SECRET_KEY;
//   if (!k) throw new Error("PLISIO_SECRET_KEY is not set in Convex env");
//   return k;
// }

// // Only used when you route calls through your own fixed-IP proxy (section 12).
// function proxyHeaders(): Record<string, string> {
//   const k = process.env.PLISIO_PROXY_KEY;
//   return k ? { "x-proxy-key": k } : {};
// }

// type PlisioError = { name?: string; message?: string; code?: number };

// function describe(json: unknown, fallback: string): string {
//   const d = (json as { data?: PlisioError } | null)?.data;
//   return d?.message ? `${d.message}${d.code ? ` (code ${d.code})` : ""}` : fallback;
// }

// // ───────────────────────── create an invoice ─────────────────────────

// export async function createInvoice(a: {
//   /** Our own reference, e.g. "bk_<bookingId>_<time>". Comes back in the webhook as order_name. */
//   orderName: string;
//   amountCents: number;
//   /** Fiat the price is in (your CHARGE_CURRENCY, "ZAR"). Plisio converts to USDT. */
//   currency: string;
//   email?: string;
//   description?: string;
//   /** Where the "Back to site" button on Plisio's page goes after paying / failing. */
//   successUrl: string;
//   failUrl: string;
// }): Promise<{ txnId: string; invoiceUrl: string }> {
//   const params = new URLSearchParams({
//     api_key: secret(),
//     order_name: a.orderName,
//     // Plisio wants a unique number per invoice. Our real reference is order_name.
//     order_number: `${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
//     source_currency: a.currency,
//     source_amount: (a.amountCents / 100).toFixed(2),
//     currency: PAY_CURRENCY,
//     allowed_psys_cids: PAY_CURRENCY,
//     expire_min: "30",
//     callback_url: `${process.env.CONVEX_SITE_URL}/plisio-webhook?json=true`,
//     success_invoice_url: a.successUrl,
//     fail_invoice_url: a.failUrl,
//   });
//   if (a.email) params.set("email", a.email);
//   if (a.description) params.set("description", a.description);

//   // Never log this URL: it contains the secret key.
//   const res = await fetch(`${apiBase()}/invoices/new?${params}`, {
//     headers: proxyHeaders(),
//   });
//   const json = (await res.json().catch(() => null)) as {
//     status?: string;
//     data?: { txn_id?: string; invoice_url?: string };
//   } | null;

//   if (!res.ok || json?.status !== "success" || !json.data?.invoice_url) {
//     throw new Error(describe(json, "Could not create the crypto invoice"));
//   }
//   return { txnId: String(json.data.txn_id), invoiceUrl: json.data.invoice_url };
// }

// // ───────────────────── verify a webhook (callback) ─────────────────────

// async function hmacSha1Hex(key: string, message: string): Promise<string> {
//   const k = await crypto.subtle.importKey(
//     "raw",
//     new TextEncoder().encode(key),
//     { name: "HMAC", hash: "SHA-1" },
//     false,
//     ["sign"],
//   );
//   const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message));
//   return Array.from(new Uint8Array(sig))
//     .map((b) => b.toString(16).padStart(2, "0"))
//     .join("");
// }

// /**
//  * Plisio signs the JSON body (sent when the callback URL has ?json=true):
//  * HMAC-SHA1 of JSON.stringify(body without verify_hash), keyed with the secret key.
//  */
// export async function verifyCallback(
//   data: Record<string, unknown>,
//   secretKey: string,
// ): Promise<boolean> {
//   const given = data.verify_hash;
//   if (typeof given !== "string") return false;
//   const rest = { ...data };
//   delete rest.verify_hash;
//   const expected = await hmacSha1Hex(secretKey, JSON.stringify(rest));
//   if (expected.length !== given.length) return false;
//   let diff = 0; // constant-time compare
//   for (let i = 0; i < expected.length; i++) {
//     diff |= expected.charCodeAt(i) ^ given.toLowerCase().charCodeAt(i);
//   }
//   return diff === 0;
// }

// // ───────────────────────── send a payout ─────────────────────────

// export async function withdraw(
//   address: string,
//   amountUsdt: number,
// ): Promise<{ id: string; txUrl?: string }> {
//   const params = new URLSearchParams({
//     api_key: secret(),
//     currency: PAY_CURRENCY,
//     type: "cash_out",
//     to: address,
//     amount: amountUsdt.toFixed(2),
//     feePlan: "normal",
//   });
//   const res = await fetch(`${apiBase()}/operations/withdraw?${params}`, {
//     headers: proxyHeaders(),
//   });
//   const json = (await res.json().catch(() => null)) as {
//     status?: string;
//     data?: { id?: string; status?: string; tx_url?: string };
//   } | null;

//   if (
//     !res.ok ||
//     json?.status !== "success" ||
//     json.data?.status === "error" ||
//     !json.data?.id
//   ) {
//     throw new Error(describe(json, "Plisio withdrawal failed"));
//   }
//   return { id: String(json.data.id), txUrl: json.data.tx_url };
// }
// convex/lib/plisio.ts
//
// Everything that talks to Plisio lives here: create an invoice, verify the
// webhook signature, send a payout. Uses plain fetch, no SDK.
//
// Logging: lines are prefixed "[plisio]". The request URLs contain the secret
// key (api_key=...), so they are NEVER logged. Only response bodies are.

/** Clients pay in, and girls are paid in, the same coin: USDT on TRON. */
export const PAY_CURRENCY = "USDT_TRX";

function apiBase(): string {
  return process.env.PLISIO_API_BASE ?? "https://api.plisio.net/api/v1";
}

function secret(): string {
  const k = process.env.PLISIO_SECRET_KEY;
  if (!k) {
    console.error(
      "[plisio] PLISIO_SECRET_KEY is not set in this deployment's env",
    );
    throw new Error("PLISIO_SECRET_KEY is not set in Convex env");
  }
  return k;
}

// Only used when you route calls through your own fixed-IP proxy (section 12).
function proxyHeaders(): Record<string, string> {
  const k = process.env.PLISIO_PROXY_KEY;
  return k ? { "x-proxy-key": k } : {};
}

type PlisioError = { name?: string; message?: string; code?: number };

function describe(json: unknown, fallback: string): string {
  const d = (json as { data?: PlisioError } | null)?.data;
  return d?.message
    ? `${d.message}${d.code ? ` (code ${d.code})` : ""}`
    : fallback;
}

// Logs where requests are going (base URL + whether a proxy key is in use),
// without ever printing a key.
function logConfig(action: string) {
  console.log(`[plisio] ${action} config`, {
    apiBase: apiBase(),
    usingProxyKey: !!process.env.PLISIO_PROXY_KEY,
    hasSecretKey: !!process.env.PLISIO_SECRET_KEY,
  });
}

// ───────────────────────── create an invoice ─────────────────────────

export async function createInvoice(a: {
  /** Our own reference, e.g. "bk_<bookingId>_<time>". Comes back in the webhook as order_name. */
  orderName: string;
  amountCents: number;
  /** Fiat the price is in (your CHARGE_CURRENCY, "ZAR"). Plisio converts to USDT. */
  currency: string;
  email?: string;
  description?: string;
  /** Where the "Back to site" button on Plisio's page goes after paying / failing. */
  successUrl: string;
  failUrl: string;
}): Promise<{ txnId: string; invoiceUrl: string }> {
  const params = new URLSearchParams({
    api_key: secret(),
    order_name: a.orderName,
    // Plisio wants a unique number per invoice. Our real reference is order_name.
    order_number: `${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
    source_currency: a.currency,
    source_amount: (a.amountCents / 100).toFixed(2),
    currency: PAY_CURRENCY,
    allowed_psys_cids: PAY_CURRENCY,
    expire_min: "30",
    callback_url: `${process.env.CONVEX_SITE_URL}/plisio-webhook?json=true`,
    success_invoice_url: a.successUrl,
    fail_invoice_url: a.failUrl,
  });
  if (a.email) params.set("email", a.email);
  if (a.description) params.set("description", a.description);

  console.log("[plisio] createInvoice", {
    orderName: a.orderName,
    amount: (a.amountCents / 100).toFixed(2),
    currency: a.currency,
    callbackUrl: `${process.env.CONVEX_SITE_URL}/plisio-webhook?json=true`,
  });

  // Never log this URL: it contains the secret key.
  const res = await fetch(`${apiBase()}/invoices/new?${params}`, {
    headers: proxyHeaders(),
  });
  const json = (await res.json().catch(() => null)) as {
    status?: string;
    data?: { txn_id?: string; invoice_url?: string };
  } | null;

  console.log("[plisio] createInvoice response", {
    httpStatus: res.status,
    plisioStatus: json?.status,
    txnId: json?.data?.txn_id,
  });

  if (!res.ok || json?.status !== "success" || !json.data?.invoice_url) {
    console.error("[plisio] createInvoice FAILED", {
      httpStatus: res.status,
      body: json,
    });
    throw new Error(describe(json, "Could not create the crypto invoice"));
  }
  return { txnId: String(json.data.txn_id), invoiceUrl: json.data.invoice_url };
}

// ───────────────────── verify a webhook (callback) ─────────────────────

async function hmacSha1Hex(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    k,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Plisio signs the JSON body (sent when the callback URL has ?json=true):
 * HMAC-SHA1 of JSON.stringify(body without verify_hash), keyed with the secret key.
 */
export async function verifyCallback(
  data: Record<string, unknown>,
  secretKey: string,
): Promise<boolean> {
  const given = data.verify_hash;
  if (typeof given !== "string") {
    console.log("[plisio] verifyCallback: no verify_hash in body");
    return false;
  }
  const rest = { ...data };
  delete rest.verify_hash;
  const expected = await hmacSha1Hex(secretKey, JSON.stringify(rest));
  if (expected.length !== given.length) {
    console.log("[plisio] verifyCallback: hash length mismatch");
    return false;
  }
  let diff = 0; // constant-time compare
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ given.toLowerCase().charCodeAt(i);
  }
  if (diff !== 0) console.log("[plisio] verifyCallback: signature mismatch");
  return diff === 0;
}

// ───────────────────────── send a payout ─────────────────────────

export async function withdraw(
  address: string,
  amountUsdt: number,
): Promise<{ id: string; txUrl?: string }> {
  const params = new URLSearchParams({
    api_key: secret(),
    currency: PAY_CURRENCY,
    type: "cash_out",
    to: address,
    amount: amountUsdt.toFixed(2),
    feePlan: "normal",
  });

  logConfig("withdraw");
  console.log("[plisio] withdraw request", {
    to:
      address.length > 12
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : address,
    amount: amountUsdt.toFixed(2),
    currency: PAY_CURRENCY,
  });

  // Never log this URL: it contains the secret key.
  const res = await fetch(`${apiBase()}/operations/withdraw?${params}`, {
    headers: proxyHeaders(),
  });

  // Read the raw text first so we can log it even if it is not valid JSON
  // (for example an HTML error page from a proxy or a Cloudflare block).
  const raw = await res.text();
  console.log("[plisio] withdraw response", {
    httpStatus: res.status,
    body: raw.slice(0, 1000),
  });

  let json: {
    status?: string;
    data?: { id?: string; status?: string; tx_url?: string };
  } | null = null;
  try {
    json = JSON.parse(raw);
  } catch {
    json = null;
  }

  if (
    !res.ok ||
    json?.status !== "success" ||
    json.data?.status === "error" ||
    !json.data?.id
  ) {
    // Include the HTTP status when Plisio gave no readable message.
    throw new Error(
      describe(json, `Plisio withdrawal failed (HTTP ${res.status})`),
    );
  }
  return { id: String(json.data.id), txUrl: json.data.tx_url };
}
