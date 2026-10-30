/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ageVerification from "../ageVerification.js";
import type * as assets from "../assets.js";
import type * as backfillLocale from "../backfillLocale.js";
import type * as bookings from "../bookings.js";
import type * as calendar from "../calendar.js";
import type * as callAccess from "../callAccess.js";
import type * as calls from "../calls.js";
import type * as crons from "../crons.js";
import type * as favorites from "../favorites.js";
import type * as fx from "../fx.js";
import type * as gallery from "../gallery.js";
import type * as gifts from "../gifts.js";
import type * as hostAccess from "../hostAccess.js";
import type * as hostPayout from "../hostPayout.js";
import type * as hosts from "../hosts.js";
import type * as http from "../http.js";
import type * as idDocuments from "../idDocuments.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_availability from "../lib/availability.js";
import type * as lib_currency from "../lib/currency.js";
import type * as lib_fees from "../lib/fees.js";
import type * as lib_fulfilBooking from "../lib/fulfilBooking.js";
import type * as lib_fxRates from "../lib/fxRates.js";
import type * as lib_geo from "../lib/geo.js";
import type * as lib_noShowGrace from "../lib/noShowGrace.js";
import type * as lib_payoutConfig from "../lib/payoutConfig.js";
import type * as lib_plisio from "../lib/plisio.js";
import type * as lib_schedule from "../lib/schedule.js";
import type * as lib_secretPhotoOrders from "../lib/secretPhotoOrders.js";
import type * as lib_slots from "../lib/slots.js";
import type * as lib_timezones from "../lib/timezones.js";
import type * as lib_tronAddress from "../lib/tronAddress.js";
import type * as likes from "../likes.js";
import type * as messages from "../messages.js";
import type * as noShow from "../noShow.js";
import type * as noShowConfig from "../noShowConfig.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as payoutQueue from "../payoutQueue.js";
import type * as profiles from "../profiles.js";
import type * as ratings from "../ratings.js";
import type * as roles from "../roles.js";
import type * as secretPhotoPayments from "../secretPhotoPayments.js";
import type * as secretPhotos from "../secretPhotos.js";
import type * as tokenPayments from "../tokenPayments.js";
import type * as tokens from "../tokens.js";
import type * as uploads from "../uploads.js";
import type * as user from "../user.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ageVerification: typeof ageVerification;
  assets: typeof assets;
  backfillLocale: typeof backfillLocale;
  bookings: typeof bookings;
  calendar: typeof calendar;
  callAccess: typeof callAccess;
  calls: typeof calls;
  crons: typeof crons;
  favorites: typeof favorites;
  fx: typeof fx;
  gallery: typeof gallery;
  gifts: typeof gifts;
  hostAccess: typeof hostAccess;
  hostPayout: typeof hostPayout;
  hosts: typeof hosts;
  http: typeof http;
  idDocuments: typeof idDocuments;
  "lib/auth": typeof lib_auth;
  "lib/availability": typeof lib_availability;
  "lib/currency": typeof lib_currency;
  "lib/fees": typeof lib_fees;
  "lib/fulfilBooking": typeof lib_fulfilBooking;
  "lib/fxRates": typeof lib_fxRates;
  "lib/geo": typeof lib_geo;
  "lib/noShowGrace": typeof lib_noShowGrace;
  "lib/payoutConfig": typeof lib_payoutConfig;
  "lib/plisio": typeof lib_plisio;
  "lib/schedule": typeof lib_schedule;
  "lib/secretPhotoOrders": typeof lib_secretPhotoOrders;
  "lib/slots": typeof lib_slots;
  "lib/timezones": typeof lib_timezones;
  "lib/tronAddress": typeof lib_tronAddress;
  likes: typeof likes;
  messages: typeof messages;
  noShow: typeof noShow;
  noShowConfig: typeof noShowConfig;
  notifications: typeof notifications;
  payments: typeof payments;
  payoutQueue: typeof payoutQueue;
  profiles: typeof profiles;
  ratings: typeof ratings;
  roles: typeof roles;
  secretPhotoPayments: typeof secretPhotoPayments;
  secretPhotos: typeof secretPhotos;
  tokenPayments: typeof tokenPayments;
  tokens: typeof tokens;
  uploads: typeof uploads;
  user: typeof user;
  wallet: typeof wallet;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
