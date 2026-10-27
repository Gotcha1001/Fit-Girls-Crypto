import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Shared gender/preference vocabulary used on profiles.
const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("non_binary"),
);

export default defineSchema({
  // ───────────── EXISTING DATING TABLES (kept) ─────────────

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    // CHANGED: added "host". "user" stays as the guest role.
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("host")),
    createdAt: v.number(),
    // NEW: set by /verify-age, enforced in the booking mutation
    ageConfirmedAt: v.optional(v.number()),
    // Chosen right after sign-up. Only meaningful while role === "user".
    onboardingChoice: v.optional(
      v.union(v.literal("client"), v.literal("girl")),
    ),
    tokens: v.optional(v.number()),
    country: v.optional(v.string()), // ISO-3166 alpha-2, "ZA"
    timezone: v.optional(v.string()),
    appearance: v.optional(
      v.object({
        accent: v.string(),
        rainMode: v.string(),
        rainDensity: v.number(),
        rainSpeed: v.number(),
        rainOpacity: v.number(),
        glow: v.boolean(),
      }),
    ),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_role", ["role"]), // NEW: first-admin check

  profiles: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    age: v.number(),
    gender: genderValidator,
    seekingGenders: v.array(genderValidator),
    bio: v.string(),
    photos: v.array(v.object({ url: v.string(), publicId: v.string() })),
    city: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    coins: v.number(),
    isOnboarded: v.boolean(),
    lastActiveAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_gender", ["gender"]),

  conversations: defineTable({
    userAId: v.id("users"),
    userBId: v.id("users"),
    lastMessageAt: v.number(),
    lastMessagePreview: v.optional(v.string()),
    hiddenFor: v.optional(v.array(v.id("users"))),
  })
    .index("by_userA", ["userAId"])
    .index("by_userB", ["userBId"])
    .index("by_pair", ["userAId", "userBId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
    deletedFor: v.optional(v.array(v.id("users"))),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_unread", ["conversationId", "readAt"]),

  giftTransactions: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    giftId: v.string(),
    coinCost: v.number(),
    message: v.optional(v.string()),
    createdAt: v.number(),
    seenAt: v.optional(v.number()),
  })
    .index("by_recipient", ["toUserId"])
    .index("by_sender", ["fromUserId"])
    .index("by_recipient_unseen", ["toUserId", "seenAt"]),

  uploadedAssets: defineTable({
    userId: v.id("users"),
    publicId: v.string(),
    createdAt: v.number(),
  })
    .index("by_public_id", ["publicId"])
    .index("by_user", ["userId"]),

  // SHARED by dating call requests AND paid bookings.
  // A paid booking creates a row with requesterId = guest, recipientId = host's
  // user, status "accepted", scheduledFor = booking start, and bookingId set.
  callSessions: defineTable({
    requesterId: v.id("users"),
    recipientId: v.id("users"),
    roomName: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("ended"),
    ),
    scheduledFor: v.optional(v.number()),
    createdAt: v.number(),
    bookingId: v.optional(v.id("bookings")), // NEW
  })
    .index("by_recipient", ["recipientId"])
    .index("by_requester", ["requesterId"])
    .index("by_recipient_status", ["recipientId", "status"])
    .index("by_booking", ["bookingId"])
    .index("by_roomName", ["roomName"]),

  likes: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_sender", ["fromUserId"])
    .index("by_recipient", ["toUserId"])
    .index("by_pair", ["fromUserId", "toUserId"]),

  tokenPurchases: defineTable({
    userId: v.id("users"),
    packageId: v.string(),
    tokens: v.number(),
    priceCents: v.number(),
    status: v.union(v.literal("pending"), v.literal("paid")),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
    paystackReference: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_paystackReference", ["paystackReference"]),

  failedPayments: defineTable({
    paymentId: v.string(),
    purchaseId: v.optional(v.id("tokenPurchases")),
    status: v.string(),
    amount: v.number(),
    reason: v.string(),
    timestamp: v.number(),
    resolved: v.boolean(),
  }),

  // ───────────── NEW MARKETPLACE TABLES ─────────────

  hosts: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    bio: v.string(),
    avatarId: v.optional(v.id("_storage")),
    ratePerMinuteCents: v.number(),
    minMinutes: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("suspended"),
    ),
    kycStatus: v.union(
      v.literal("none"),
      v.literal("submitted"),
      v.literal("verified"),
    ),
    payoutProvider: v.string(), // "plisio"
    payoutAccountRef: v.optional(v.string()), // USDT (TRC-20) wallet address
    bankLast4: v.optional(v.string()), //last 4 characters of the wallet address
    sentTotalUsdt: v.optional(v.number()),
    isOnline: v.boolean(),
    country: v.optional(v.string()),
    timezone: v.optional(v.string()),
    photoBundlePriceCents: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // ── Host weekly hours (0 = Mon … 6 = Sun) ──
  hostWeeklyHours: defineTable({
    hostId: v.id("hosts"),
    weekday: v.number(), // 0 = Mon … 6 = Sun
    hours: v.array(v.number()), // 0–23, unique sorted
  })
    .index("by_host", ["hostId"])
    .index("by_host_weekday", ["hostId", "weekday"]),

  hostDayOverrides: defineTable({
    hostId: v.id("hosts"),
    dayIndex: v.number(), // day index in the HOST's timezone (since 1970-01-01)
    hours: v.array(v.number()), // empty = fully off that day
  })
    .index("by_host", ["hostId"])
    .index("by_host_day", ["hostId", "dayIndex"]),

  bookings: defineTable({
    hostId: v.id("hosts"),
    guestId: v.id("users"),
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    minutes: v.number(),
    amountCents: v.number(),
    platformFeeCents: v.number(),
    hostShareCents: v.number(),
    priceMinor: v.optional(v.number()), // her price, in her currency's minor units
    priceCurrency: v.optional(v.string()), // e.g. "USD"
    status: v.union(
      v.literal("pending_payment"),
      v.literal("paid"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("expired"),
      v.literal("refunded"),
    ),
    paymentId: v.optional(v.id("payments")),
    roomName: v.optional(v.string()),
    hostTimezone: v.optional(v.string()), // snapshots for receipts, disputes, reminders
    guestTimezone: v.optional(v.string()),
    hostJoinedAt: v.optional(v.number()),
    guestJoinedAt: v.optional(v.number()),
    noShowCheckedAt: v.optional(v.number()),
    noShowArmedAt: v.optional(v.number()),
    attendance: v.optional(
      v.union(v.literal("host_no_show"), v.literal("guest_no_show")),
    ),
  })
    .index("by_host", ["hostId"])
    .index("by_host_time", ["hostId", "startsAt"])
    .index("by_guest", ["guestId"])
    .index("by_roomName", ["roomName"]) // NEW
    .index("by_status_startsAt", ["status", "startsAt"]), // NEW

  galleryItems: defineTable({
    hostId: v.id("hosts"),
    storageId: v.id("_storage"),
    previewStorageId: v.id("_storage"), // blurred version, public
    priceCents: v.number(),
    caption: v.optional(v.string()),
    moderation: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
  }).index("by_host", ["hostId"]),

  purchases: defineTable({
    galleryItemId: v.id("galleryItems"),
    buyerId: v.id("users"),
    paymentId: v.id("payments"),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_item_buyer", ["galleryItemId", "buyerId"]),

  payments: defineTable({
    kind: v.union(v.literal("booking"), v.literal("gallery")),
    refId: v.string(),
    payerId: v.id("users"),
    hostId: v.id("hosts"),
    amountCents: v.number(),
    platformFeeCents: v.number(),
    hostShareCents: v.number(),
    currency: v.string(),
    providerReference: v.string(),
    plisioTxnId: v.optional(v.string()),
    status: v.union(
      v.literal("initiated"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
  })
    .index("by_reference", ["providerReference"])
    .index("by_payer", ["payerId"]),

  hostPayouts: defineTable({
    hostId: v.id("hosts"),
    paymentId: v.id("payments"),
    amountUsdt: v.number(), // her 80% of the USDT we actually received
    releaseAt: v.number(), // ms timestamp: not paid before this
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    batchId: v.optional(v.string()),
    plisioOpId: v.optional(v.string()),
    txUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_status_release", ["status", "releaseAt"])
    .index("by_host_status", ["hostId", "status"])
    .index("by_host", ["hostId"])
    .index("by_payment", ["paymentId"]),

  // A girl's application. The access code is stored only as a hash.
  hostApplications: defineTable({
    userId: v.id("users"),
    fullName: v.string(),
    contact: v.optional(v.string()),
    message: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"), // approved, waiting for her to enter the code
      v.literal("rejected"),
      v.literal("activated"),
    ),
    idChecked: v.optional(v.boolean()),
    note: v.optional(v.string()), // rejection note
    codeHash: v.optional(v.string()),
    codeExpiresAt: v.optional(v.number()),
    codeAttempts: v.number(),
    idDocumentId: v.optional(v.id("_storage")),
    selfieId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  blocks: defineTable({
    hostId: v.id("hosts"),
    blockedUserId: v.id("users"),
  }).index("by_host_user", ["hostId", "blockedUserId"]),

  reports: defineTable({
    reporterId: v.id("users"),
    targetUserId: v.id("users"),
    reason: v.string(),
    resolved: v.boolean(),
  }),

  secretPhotos: defineTable({
    hostId: v.id("hosts"),
    fullStorageId: v.id("_storage"),
    previewStorageId: v.id("_storage"),
    priceCents: v.number(),
    createdAt: v.number(),
    removedAt: v.optional(v.number()),
  }).index("by_host", ["hostId"]),

  secretPhotoOrders: defineTable({
    buyerId: v.id("users"),
    hostId: v.id("hosts"),
    kind: v.union(v.literal("single"), v.literal("bundle")),
    items: v.array(
      v.object({ photoId: v.id("secretPhotos"), priceCents: v.number() }),
    ),
    amountCents: v.number(),
    platformFeeCents: v.number(),
    hostShareCents: v.number(),
    status: v.union(v.literal("pending"), v.literal("paid")),
    paymentId: v.optional(v.id("payments")),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
    priceMinor: v.optional(v.number()), // her price, in her currency's minor units
    priceCurrency: v.optional(v.string()), // e.g. "USD"
  })
    .index("by_buyer", ["buyerId"])
    .index("by_host_status", ["hostId", "status"]),

  secretPhotoPurchases: defineTable({
    photoId: v.id("secretPhotos"),
    buyerId: v.id("users"),
    hostId: v.id("hosts"),
    orderId: v.id("secretPhotoOrders"),
    amountCents: v.number(),
    hostShareCents: v.number(),
    viaBundle: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_photo_buyer", ["photoId", "buyerId"]),

  fxRates: defineTable({
    base: v.string(), // "USD"
    rates: v.record(v.string(), v.number()), // units of each currency per 1 USD
    updatedAt: v.number(),
  }),

  walletTransactions: defineTable({
    userId: v.id("users"), // the guest
    bookingId: v.optional(v.id("bookings")),
    type: v.union(v.literal("credit"), v.literal("debit")),
    amountCents: v.number(), // always positive
    currency: v.string(),
    reason: v.union(v.literal("host_no_show"), v.literal("booking_payment")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_booking_reason", ["bookingId", "reason"]),
});
