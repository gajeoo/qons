import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  // User profiles — role management + trial tracking
  userProfiles: defineTable({
    userId: v.id("users"),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("customer"),
      v.literal("manager"),
      v.literal("worker"),
    ),
    trialStartDate: v.optional(v.number()), // timestamp when trial started
    trialEndDate: v.optional(v.number()), // timestamp when trial ends (14 days)
    invitedBy: v.optional(v.id("users")), // who invited this user
    organizationUserId: v.optional(v.id("users")), // main account they belong to (for workers/managers)
    isActive: v.optional(v.boolean()), // admin can pause/deactivate users
    allowedFeatures: v.optional(v.array(v.string())), // manager-restricted features (if set, only these are accessible)
    hasUsedTrial: v.optional(v.boolean()), // once true, account can never get another trial
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_organizationUserId", ["organizationUserId"]),

  // Invitations for workers/managers
  invitations: defineTable({
    invitedByUserId: v.id("users"),
    email: v.string(),
    role: v.union(v.literal("manager"), v.literal("worker")),
    token: v.string(), // unique invite token
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    expiresAt: v.number(),
    acceptedByUserId: v.optional(v.id("users")),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_invitedByUserId", ["invitedByUserId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  // Contact form leads
  leads: defineTable({
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    properties: v.optional(v.string()),
    message: v.optional(v.string()),
    inquiryType: v.union(
      v.literal("demo"),
      v.literal("beta"),
      v.literal("general"),
      v.literal("trial"),
      v.literal("question"),
      v.literal("partnership"),
      v.literal("pricing"),
      v.literal("support"),
    ),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("converted"),
      v.literal("archived"),
    ),
    notes: v.optional(v.string()),
    notifiedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"]),

  // Stripe subscriptions
  subscriptions: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    billingProvider: v.optional(
      v.union(v.literal("stripe"), v.literal("paypal"), v.literal("admin")),
    ),
    billingCycle: v.optional(
      v.union(v.literal("monthly"), v.literal("annual")),
    ),
    plan: v.union(
      v.literal("starter"),
      v.literal("pro"),
      v.literal("enterprise"),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("incomplete"),
      v.literal("trialing"),
      v.literal("incomplete_expired"),
      v.literal("unpaid"),
      v.literal("paused"),
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    pausedAt: v.optional(v.number()),
    pausedByAdmin: v.optional(v.boolean()),
    assignedByAdmin: v.optional(v.boolean()), // admin-assigned plan (no Stripe)
  })
    .index("by_userId", ["userId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"])
    .index("by_status", ["status"])
    .index("by_plan", ["plan"]),

  // Customer onboarding data
  onboarding: defineTable({
    userId: v.id("users"),
    companyName: v.optional(v.string()),
    numberOfProperties: v.optional(v.string()),
    teamSize: v.optional(v.string()),
    useCases: v.optional(v.array(v.string())),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  // Checkout sessions for tracking pending payments
  checkoutSessions: defineTable({
    userId: v.optional(v.id("users")),
    stripeSessionId: v.string(),
    plan: v.union(
      v.literal("starter"),
      v.literal("pro"),
      v.literal("enterprise"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("expired"),
    ),
  })
    .index("by_stripeSessionId", ["stripeSessionId"])
    .index("by_userId", ["userId"]),

  // ========== PROPERTIES ==========
  properties: defineTable({
    userId: v.id("users"),
    name: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    type: v.union(
      v.literal("residential"),
      v.literal("commercial"),
      v.literal("mixed"),
      v.literal("hoa"),
    ),
    units: v.number(),
    sqft: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("onboarding"),
    ),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  // ========== STAFF ==========
  staff: defineTable({
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("on_leave"),
    ),
    hourlyRate: v.number(),
    certifications: v.optional(v.array(v.string())),
    skills: v.optional(v.array(v.string())),
    availability: v.optional(
      v.object({
        monday: v.optional(v.array(v.string())),
        tuesday: v.optional(v.array(v.string())),
        wednesday: v.optional(v.array(v.string())),
        thursday: v.optional(v.array(v.string())),
        friday: v.optional(v.array(v.string())),
        saturday: v.optional(v.array(v.string())),
        sunday: v.optional(v.array(v.string())),
      }),
    ),
    maxHoursPerWeek: v.optional(v.number()),
    assignedPropertyIds: v.optional(v.array(v.id("properties"))),
    hireDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    linkedAccountUserId: v.optional(v.id("users")), // if this staff member has a user account
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_role", ["role"])
    .index("by_linkedAccountUserId", ["linkedAccountUserId"]),

  // ========== SHIFTS ==========
  shifts: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    staffId: v.optional(v.id("staff")),
    date: v.string(), // YYYY-MM-DD
    startTime: v.string(), // HH:MM
    endTime: v.string(), // HH:MM
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show"),
      v.literal("open"),
    ),
    shiftType: v.union(
      v.literal("regular"),
      v.literal("overtime"),
      v.literal("emergency"),
      v.literal("training"),
    ),
    notes: v.optional(v.string()),
    isRecurring: v.optional(v.boolean()),
    recurringId: v.optional(v.string()),
    aiAssigned: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_staffId", ["staffId"])
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_userId_date", ["userId", "date"]),

  // ========== TIME ENTRIES ==========
  timeEntries: defineTable({
    userId: v.id("users"),
    staffId: v.id("staff"),
    shiftId: v.optional(v.id("shifts")),
    propertyId: v.id("properties"),
    clockIn: v.number(), // timestamp
    clockOut: v.optional(v.number()),
    clockInLat: v.optional(v.number()),
    clockInLng: v.optional(v.number()),
    clockOutLat: v.optional(v.number()),
    clockOutLng: v.optional(v.number()),
    breakMinutes: v.optional(v.number()),
    totalHours: v.optional(v.number()),
    status: v.union(
      v.literal("clocked_in"),
      v.literal("clocked_out"),
      v.literal("approved"),
      v.literal("disputed"),
    ),
    notes: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_staffId", ["staffId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_status", ["status"]),

  // ========== PAYROLL EXPORTS ==========
  payrollExports: defineTable({
    userId: v.id("users"),
    periodStart: v.string(), // YYYY-MM-DD
    periodEnd: v.string(),
    format: v.union(
      v.literal("csv"),
      v.literal("adp"),
      v.literal("paychex"),
      v.literal("quickbooks"),
      v.literal("excel"),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("exported"),
    ),
    totalHours: v.number(),
    totalAmount: v.number(),
    taxRate: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    totalWithTax: v.optional(v.number()),
    staffCount: v.number(),
    entries: v.array(
      v.object({
        staffId: v.id("staff"),
        staffName: v.string(),
        regularHours: v.number(),
        overtimeHours: v.number(),
        regularPay: v.number(),
        overtimePay: v.number(),
        totalPay: v.number(),
      }),
    ),
    exportedAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  payrollSettings: defineTable({
    userId: v.id("users"),
    taxRate: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ========== AMENITIES ==========
  amenities: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    name: v.string(),
    type: v.union(
      v.literal("pool"),
      v.literal("gym"),
      v.literal("party_room"),
      v.literal("rooftop"),
      v.literal("tennis_court"),
      v.literal("parking"),
      v.literal("bbq_area"),
      v.literal("other"),
    ),
    capacity: v.number(),
    status: v.union(v.literal("available"), v.literal("maintenance"), v.literal("closed")),
    requiresApproval: v.boolean(),
    maxDurationMinutes: v.optional(v.number()),
    rules: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"]),

  amenityBookings: defineTable({
    userId: v.id("users"),
    amenityId: v.id("amenities"),
    residentName: v.string(),
    residentEmail: v.string(),
    residentUnit: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    guestCount: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("cancelled"),
    ),
    notes: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_amenityId", ["amenityId"])
    .index("by_date", ["date"])
    .index("by_status", ["status"]),

  // ========== HOA ==========
  hoaViolations: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    unit: v.string(),
    residentName: v.string(),
    type: v.union(
      v.literal("noise"),
      v.literal("parking"),
      v.literal("maintenance"),
      v.literal("pet"),
      v.literal("trash"),
      v.literal("unauthorized_modification"),
      v.literal("other"),
    ),
    description: v.string(),
    status: v.union(
      v.literal("reported"),
      v.literal("warning_sent"),
      v.literal("fine_issued"),
      v.literal("resolved"),
      v.literal("escalated"),
    ),
    fineAmount: v.optional(v.number()),
    reportedDate: v.string(),
    resolvedDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    attachmentStorageIds: v.optional(v.array(v.id("_storage"))),
    noticeHistory: v.optional(v.array(v.object({
      template: v.union(
        v.literal("courtesy_warning"),
        v.literal("fine_notice"),
        v.literal("hearing_notice"),
        v.literal("final_notice"),
      ),
      subject: v.string(),
      message: v.string(),
      sentAt: v.number(),
      deliveryMethod: v.union(
        v.literal("email"),
        v.literal("letter"),
        v.literal("portal"),
      ),
    }))),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_status", ["status"]),

  hoaDues: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    unit: v.string(),
    residentName: v.string(),
    amount: v.number(),
    dueDate: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("waived"),
    ),
    paidDate: v.optional(v.string()),
    period: v.string(), // "2026-Q1", "2026-04"
    notes: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_status", ["status"]),

  boardVotes: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    title: v.string(),
    description: v.string(),
    options: v.array(v.string()),
    votes: v.array(
      v.object({
        voterName: v.string(),
        voterUnit: v.string(),
        option: v.string(),
        timestamp: v.number(),
      }),
    ),
    status: v.union(v.literal("open"), v.literal("closed")),
    deadline: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_status", ["status"]),

  hoaMeetings: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    title: v.string(),
    description: v.optional(v.string()),
    scheduledDate: v.string(),
    scheduledTime: v.optional(v.string()),
    location: v.optional(v.string()),
    agenda: v.array(v.string()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    attendeeCount: v.optional(v.number()),
    minutes: v.optional(v.string()),
    followUpActions: v.optional(v.array(v.string())),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_status", ["status"]),

  arcRequests: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    unit: v.string(),
    residentName: v.string(),
    requestType: v.union(
      v.literal("exterior_modification"),
      v.literal("landscaping"),
      v.literal("fence"),
      v.literal("paint"),
      v.literal("addition"),
      v.literal("other"),
    ),
    description: v.string(),
    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("denied"),
      v.literal("completed"),
    ),
    submittedDate: v.string(),
    reviewedDate: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
    attachmentStorageIds: v.optional(v.array(v.id("_storage"))),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_status", ["status"]),

  residentMessages: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("announcement"),
      v.literal("alert"),
      v.literal("maintenance_notice"),
      v.literal("event"),
      v.literal("general"),
    ),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    targetUnits: v.optional(v.array(v.string())), // null = all residents
    sentAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_type", ["type"]),

  // ========== RESIDENTS ==========
  residents: defineTable({
    userId: v.id("users"), // the manager/owner who created this
    propertyId: v.id("properties"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    unit: v.string(),
    leaseStart: v.optional(v.string()),
    leaseEnd: v.optional(v.string()),
    moveInDate: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),   // applied, not yet approved
      v.literal("active"),    // approved and living there
      v.literal("inactive"),  // moved out or lease ended
      v.literal("rejected"),  // application rejected
    ),
    emergencyContact: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    vehiclePlate: v.optional(v.string()),
    pets: v.optional(v.string()),
    notes: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    approvedBy: v.optional(v.string()),
    linkedAccountUserId: v.optional(v.id("users")), // if resident has an account
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_status", ["status"])
    .index("by_email", ["email"])
    .index("by_unit", ["unit"]),

  // ========== RESERVE FUND ==========
  reserveFund: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    name: v.string(),
    description: v.optional(v.string()),
    targetAmount: v.number(),
    currentAmount: v.number(),
    category: v.union(
      v.literal("roof"),
      v.literal("elevator"),
      v.literal("hvac"),
      v.literal("parking"),
      v.literal("landscaping"),
      v.literal("pool"),
      v.literal("general"),
      v.literal("emergency"),
      v.literal("other"),
    ),
    status: v.union(v.literal("active"), v.literal("funded"), v.literal("depleted")),
    lastContribution: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_status", ["status"]),

  // ========== SHIFT SWAP REQUESTS ==========
  shiftSwaps: defineTable({
    userId: v.id("users"),
    shiftId: v.id("shifts"),
    requestedByStaffId: v.id("staff"),
    targetStaffId: v.optional(v.id("staff")), // null = open swap request
    reason: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("cancelled"),
    ),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_shiftId", ["shiftId"])
    .index("by_status", ["status"]),

  // ========== AMENITY WAITLIST ==========
  amenityWaitlist: defineTable({
    userId: v.id("users"),
    amenityId: v.id("amenities"),
    residentName: v.string(),
    residentEmail: v.string(),
    preferredDate: v.string(),
    preferredTime: v.optional(v.string()),
    status: v.union(v.literal("waiting"), v.literal("notified"), v.literal("booked"), v.literal("cancelled")),
    addedAt: v.number(),
    notifiedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_amenityId", ["amenityId"])
    .index("by_status", ["status"]),

  // ========== CHAT SYSTEM (AI + Admin) ==========
  chatConversations: defineTable({
    visitorId: v.string(), // anonymous session ID or user ID
    visitorName: v.optional(v.string()),
    visitorEmail: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("closed"),
      v.literal("waiting_admin"), // visitor asked for human help
    ),
    lastMessageAt: v.number(),
    unreadByAdmin: v.number(), // count of unread messages
    assignedAdminId: v.optional(v.id("users")),
    source: v.union(v.literal("widget"), v.literal("dashboard")),
    metadata: v.optional(v.string()), // JSON for page URL etc.
  })
    .index("by_visitorId", ["visitorId"])
    .index("by_status", ["status"])
    .index("by_lastMessageAt", ["lastMessageAt"]),

  chatMessages: defineTable({
    conversationId: v.id("chatConversations"),
    role: v.union(
      v.literal("visitor"),
      v.literal("ai"),
      v.literal("admin"),
    ),
    content: v.string(),
    senderName: v.optional(v.string()),
  })
    .index("by_conversationId", ["conversationId"]),

  // ========== TASKS (Delegation) ==========
  tasks: defineTable({
    userId: v.id("users"), // creator
    assignedToUserId: v.optional(v.id("users")),
    assignedToStaffId: v.optional(v.id("staff")),
    propertyId: v.optional(v.id("properties")),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    dueDate: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    category: v.optional(v.union(
      v.literal("maintenance"),
      v.literal("inspection"),
      v.literal("cleaning"),
      v.literal("administrative"),
      v.literal("hoa"),
      v.literal("other"),
    )),
  })
    .index("by_userId", ["userId"])
    .index("by_assignedToUserId", ["assignedToUserId"])
    .index("by_status", ["status"])
    .index("by_propertyId", ["propertyId"]),

  // ========== APP SETTINGS (key-value store) ==========
  appSettings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"]),

  // ========== IMPORT AUDIT ==========
  importJobs: defineTable({
    userId: v.id("users"),
    fileName: v.string(),
    status: v.union(v.literal("success"), v.literal("partial"), v.literal("failed")),
    totalRows: v.number(),
    propertiesCreated: v.number(),
    propertiesUpdated: v.number(),
    staffCreated: v.number(),
    residentsCreated: v.number(),
    ignoredRows: v.number(),
    errorCount: v.number(),
    errorSummary: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),
});

export default schema;
