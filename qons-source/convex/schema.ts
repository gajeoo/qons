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
      v.literal("tenant"),
      v.literal("maintenance"),
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
    role: v.union(v.literal("manager"), v.literal("worker"), v.literal("tenant"), v.literal("maintenance")),
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

  // Renter applications — tenants apply via invite link
  renterApplications: defineTable({
    userId: v.id("users"), // the applicant
    propertyId: v.optional(v.id("properties")),
    organizationUserId: v.id("users"), // property manager / primary account
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    // Personal info
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    ssn: v.optional(v.string()), // encrypted reference
    currentAddress: v.optional(v.string()),
    // Employment
    employer: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    monthlyIncome: v.optional(v.number()),
    employmentLength: v.optional(v.string()),
    // References
    references: v.optional(v.array(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    }))),
    // Emergency contact
    emergencyContact: v.optional(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    })),
    // Move-in
    desiredMoveIn: v.optional(v.string()),
    leaseTerm: v.optional(v.string()),
    pets: v.optional(v.string()),
    vehicles: v.optional(v.string()),
    additionalOccupants: v.optional(v.number()),
    notes: v.optional(v.string()),
    // Consent
    backgroundCheckConsent: v.optional(v.boolean()),
    submittedAt: v.optional(v.number()),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    reviewNotes: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_organizationUserId", ["organizationUserId"])
    .index("by_status", ["status"])
    .index("by_propertyId", ["propertyId"]),

  // Messages — in-app messaging between primary, tenants, maintenance
  messages: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.optional(v.id("users")), // null = broadcast
    organizationUserId: v.id("users"),
    channel: v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("in_app"),
      v.literal("push"),
    ),
    subject: v.optional(v.string()),
    body: v.string(),
    recipientType: v.optional(v.union(
      v.literal("tenant"),
      v.literal("maintenance"),
      v.literal("staff"),
      v.literal("all"),
    )),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
    ),
    readAt: v.optional(v.number()),
    attachmentIds: v.optional(v.array(v.string())),
    relatedEntityType: v.optional(v.string()), // "maintenance_request", "lease", "payment" etc.
    relatedEntityId: v.optional(v.string()),
    sentAt: v.number(),
  })
    .index("by_fromUserId", ["fromUserId"])
    .index("by_toUserId", ["toUserId"])
    .index("by_organizationUserId", ["organizationUserId"])
    .index("by_channel", ["channel"]),

  // Document templates — AI-generated lease templates, applications, etc.
  documentTemplates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: v.union(
      v.literal("lease_agreement"),
      v.literal("renter_application"),
      v.literal("maintenance_report"),
      v.literal("notice_to_vacate"),
      v.literal("late_rent_notice"),
      v.literal("move_in_checklist"),
      v.literal("move_out_checklist"),
      v.literal("custom"),
    ),
    content: v.string(), // HTML/markdown template content
    variables: v.optional(v.array(v.string())), // placeholder variables like {{tenant_name}}
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_type", ["type"]),

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
    status: v.union(
      v.literal("available"),
      v.literal("maintenance"),
      v.literal("closed"),
    ),
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
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    ),
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
      v.literal("pending"), // applied, not yet approved
      v.literal("active"), // approved and living there
      v.literal("inactive"), // moved out or lease ended
      v.literal("rejected"), // application rejected
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
    status: v.union(
      v.literal("active"),
      v.literal("funded"),
      v.literal("depleted"),
    ),
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
    status: v.union(
      v.literal("waiting"),
      v.literal("notified"),
      v.literal("booked"),
      v.literal("cancelled"),
    ),
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
    role: v.union(v.literal("visitor"), v.literal("ai"), v.literal("admin")),
    content: v.string(),
    senderName: v.optional(v.string()),
  }).index("by_conversationId", ["conversationId"]),

  // ========== TASKS (Delegation) ==========
  tasks: defineTable({
    userId: v.id("users"), // creator
    assignedToUserId: v.optional(v.id("users")),
    assignedToStaffId: v.optional(v.id("staff")),
    propertyId: v.optional(v.id("properties")),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    ),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    dueDate: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    category: v.optional(
      v.union(
        v.literal("maintenance"),
        v.literal("inspection"),
        v.literal("cleaning"),
        v.literal("administrative"),
        v.literal("hoa"),
        v.literal("other"),
      ),
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_assignedToUserId", ["assignedToUserId"])
    .index("by_status", ["status"])
    .index("by_propertyId", ["propertyId"]),

  // ========== AI ASSISTANT ==========
  aiAssistantMessages: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
    actionTaken: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_timestamp", ["userId", "timestamp"]),

  // ========== AUTOMATION RULES ==========
  automationRules: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    trigger: v.union(
      v.literal("task_created"),
      v.literal("task_status_changed"),
      v.literal("lease_expiring"),
      v.literal("rent_overdue"),
      v.literal("shift_no_show"),
      v.literal("maintenance_request"),
      v.literal("hoa_violation_created"),
      v.literal("amenity_booking_created"),
      v.literal("new_resident"),
      v.literal("schedule"), // cron-like recurring
    ),
    conditions: v.array(
      v.object({
        field: v.string(),
        operator: v.union(
          v.literal("equals"),
          v.literal("not_equals"),
          v.literal("contains"),
          v.literal("greater_than"),
          v.literal("less_than"),
          v.literal("days_before"),
          v.literal("days_after"),
        ),
        value: v.string(),
      }),
    ),
    actions: v.array(
      v.object({
        type: v.union(
          v.literal("create_task"),
          v.literal("assign_staff"),
          v.literal("update_status"),
          v.literal("send_notification"),
          v.literal("escalate_priority"),
          v.literal("add_note"),
        ),
        config: v.string(), // JSON config for the action
      }),
    ),
    // For schedule triggers
    cronExpression: v.optional(v.string()), // e.g. "daily", "weekly", "monthly"
    lastRunAt: v.optional(v.number()),
    runCount: v.optional(v.number()),
    propertyId: v.optional(v.id("properties")), // scope to a property
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_trigger", ["trigger"])
    .index("by_isActive", ["isActive"])
    .index("by_userId_isActive", ["userId", "isActive"]),

  automationLogs: defineTable({
    userId: v.id("users"),
    ruleId: v.id("automationRules"),
    ruleName: v.string(),
    trigger: v.string(),
    status: v.union(
      v.literal("success"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    actionsExecuted: v.number(),
    details: v.optional(v.string()), // JSON log of what happened
    executedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_ruleId", ["ruleId"])
    .index("by_userId_executedAt", ["userId", "executedAt"]),

  // ========== APP SETTINGS (key-value store) ==========
  appSettings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // ========== IMPORT AUDIT ==========
  importJobs: defineTable({
    userId: v.id("users"),
    fileName: v.string(),
    status: v.union(
      v.literal("success"),
      v.literal("partial"),
      v.literal("failed"),
    ),
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

  // ========== RENT PAYMENTS ==========
  rentPayments: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    residentId: v.id("residents"),
    amount: v.number(),
    currency: v.optional(v.string()),
    type: v.union(
      v.literal("rent"),
      v.literal("late_fee"),
      v.literal("deposit"),
      v.literal("other"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
    paymentMethod: v.union(
      v.literal("ach"),
      v.literal("card"),
      v.literal("cash"),
      v.literal("check"),
      v.literal("other"),
    ),
    stripePaymentId: v.optional(v.string()),
    dueDate: v.string(),
    paidAt: v.optional(v.number()),
    lateFee: v.optional(v.number()),
    lateFeeAppliedAt: v.optional(v.number()),
    memo: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_residentId", ["residentId"])
    .index("by_status", ["status"])
    .index("by_dueDate", ["dueDate"]),

  // ========== ACCOUNTING TRANSACTIONS ==========
  accountingTransactions: defineTable({
    userId: v.id("users"),
    propertyId: v.optional(v.id("properties")),
    category: v.union(
      v.literal("rent_income"),
      v.literal("late_fee_income"),
      v.literal("deposit_income"),
      v.literal("other_income"),
      v.literal("maintenance_expense"),
      v.literal("insurance_expense"),
      v.literal("tax_expense"),
      v.literal("utility_expense"),
      v.literal("management_fee"),
      v.literal("repair_expense"),
      v.literal("legal_expense"),
      v.literal("other_expense"),
    ),
    type: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(),
    description: v.string(),
    date: v.string(),
    vendor: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    attachmentUrl: v.optional(v.string()),
    reconciled: v.optional(v.boolean()),
    rentPaymentId: v.optional(v.id("rentPayments")),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_type", ["type"])
    .index("by_category", ["category"])
    .index("by_date", ["date"]),

  // ========== LEASES ==========
  leases: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    residentId: v.id("residents"),
    unitNumber: v.optional(v.string()),
    leaseType: v.union(
      v.literal("fixed"),
      v.literal("month_to_month"),
      v.literal("commercial"),
    ),
    startDate: v.string(),
    endDate: v.string(),
    monthlyRent: v.number(),
    securityDeposit: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("expiring_soon"),
      v.literal("expired"),
      v.literal("renewed"),
      v.literal("terminated"),
    ),
    autoRenew: v.optional(v.boolean()),
    renewalTermMonths: v.optional(v.number()),
    terms: v.optional(v.string()),
    signedAt: v.optional(v.number()),
    signatureStatus: v.union(
      v.literal("unsigned"),
      v.literal("pending"),
      v.literal("signed"),
      v.literal("declined"),
    ),
    documentStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_residentId", ["residentId"])
    .index("by_status", ["status"])
    .index("by_endDate", ["endDate"]),

  // ========== DOCUMENTS ==========
  documents: defineTable({
    userId: v.id("users"),
    propertyId: v.optional(v.id("properties")),
    residentId: v.optional(v.id("residents")),
    leaseId: v.optional(v.id("leases")),
    name: v.string(),
    type: v.union(
      v.literal("lease"),
      v.literal("inspection"),
      v.literal("insurance"),
      v.literal("tax"),
      v.literal("receipt"),
      v.literal("contract"),
      v.literal("notice"),
      v.literal("other"),
    ),
    storageId: v.id("_storage"),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    uploadedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_residentId", ["residentId"])
    .index("by_leaseId", ["leaseId"])
    .index("by_type", ["type"]),

  // ========== MAINTENANCE REQUESTS ==========
  maintenanceRequests: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    residentId: v.optional(v.id("residents")),
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("plumbing"),
      v.literal("electrical"),
      v.literal("hvac"),
      v.literal("appliance"),
      v.literal("structural"),
      v.literal("pest"),
      v.literal("landscaping"),
      v.literal("general"),
      v.literal("emergency"),
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("emergency"),
    ),
    status: v.union(
      v.literal("submitted"),
      v.literal("triaged"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    assignedStaffId: v.optional(v.id("staff")),
    assignedVendor: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    scheduledDate: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    images: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    residentNotes: v.optional(v.string()),
    unitNumber: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_residentId", ["residentId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_assignedStaffId", ["assignedStaffId"]),

  // ========== NOTIFICATION RECORDS ==========
  notificationRecords: defineTable({
    userId: v.id("users"),
    targetUserId: v.optional(v.id("users")),
    targetEmail: v.optional(v.string()),
    targetPhone: v.optional(v.string()),
    channel: v.union(
      v.literal("in_app"),
      v.literal("email"),
      v.literal("sms"),
      v.literal("push"),
    ),
    type: v.union(
      v.literal("rent_reminder"),
      v.literal("rent_overdue"),
      v.literal("lease_expiry"),
      v.literal("maintenance_update"),
      v.literal("shift_change"),
      v.literal("task_assigned"),
      v.literal("general"),
      v.literal("payment_received"),
      v.literal("system"),
    ),
    title: v.string(),
    message: v.string(),
    read: v.optional(v.boolean()),
    sentAt: v.number(),
    deliveredAt: v.optional(v.number()),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_targetUserId", ["targetUserId"])
    .index("by_channel", ["channel"])
    .index("by_type", ["type"])
    .index("by_read", ["read"]),

  // ========== TENANT SCREENINGS ==========
  tenantScreenings: defineTable({
    userId: v.id("users"),
    applicantName: v.string(),
    applicantEmail: v.string(),
    applicantPhone: v.optional(v.string()),
    propertyId: v.id("properties"),
    unitNumber: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("expired"),
    ),
    creditScore: v.optional(v.number()),
    creditStatus: v.optional(
      v.union(
        v.literal("excellent"),
        v.literal("good"),
        v.literal("fair"),
        v.literal("poor"),
        v.literal("unavailable"),
      ),
    ),
    backgroundStatus: v.optional(
      v.union(
        v.literal("clear"),
        v.literal("flags_found"),
        v.literal("pending"),
        v.literal("unavailable"),
      ),
    ),
    incomeVerified: v.optional(v.boolean()),
    monthlyIncome: v.optional(v.number()),
    employerName: v.optional(v.string()),
    evictionHistory: v.optional(v.boolean()),
    recommendation: v.optional(
      v.union(
        v.literal("approve"),
        v.literal("conditional"),
        v.literal("deny"),
        v.literal("review"),
      ),
    ),
    notes: v.optional(v.string()),
    reportUrl: v.optional(v.string()),
    requestedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_status", ["status"])
    .index("by_applicantEmail", ["applicantEmail"]),

  // ========== REFERRALS ==========
  referrals: defineTable({
    referrerUserId: v.id("users"),
    referralCode: v.string(),
    referredEmail: v.optional(v.string()),
    referredUserId: v.optional(v.id("users")),
    status: v.union(
      v.literal("pending"),
      v.literal("signed_up"),
      v.literal("converted"),
      v.literal("rewarded"),
      v.literal("expired"),
    ),
    rewardType: v.optional(v.string()),
    rewardAmount: v.optional(v.number()),
    rewardAppliedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_referrerUserId", ["referrerUserId"])
    .index("by_referralCode", ["referralCode"])
    .index("by_referredEmail", ["referredEmail"])
    .index("by_status", ["status"]),

  // ========== OWNER STATEMENTS ==========
  ownerStatements: defineTable({
    userId: v.id("users"),
    propertyId: v.id("properties"),
    month: v.string(),
    year: v.number(),
    totalIncome: v.number(),
    totalExpenses: v.number(),
    netIncome: v.number(),
    managementFee: v.optional(v.number()),
    ownerDraw: v.optional(v.number()),
    notes: v.optional(v.string()),
    generatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_month_year", ["year", "month"]),

  // Site-wide configuration — admin-editable, propagates everywhere
  siteConfig: defineTable({
    key: v.string(), // "site" — singleton
    companyName: v.optional(v.string()),
    tagline: v.optional(v.string()),
    supportEmail: v.optional(v.string()),
    supportPhone: v.optional(v.string()),
    primaryColor: v.optional(v.string()), // hex color
    logoUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    // Messaging service config
    sendgridApiKey: v.optional(v.string()),
    twilioAccountSid: v.optional(v.string()),
    twilioAuthToken: v.optional(v.string()),
    twilioPhoneNumber: v.optional(v.string()),
    // Push notification config
    vapidPublicKey: v.optional(v.string()),
    vapidPrivateKey: v.optional(v.string()),
    // Feature flags
    enableEmailNotifications: v.optional(v.boolean()),
    enableSmsNotifications: v.optional(v.boolean()),
    enablePushNotifications: v.optional(v.boolean()),
    enableEsignature: v.optional(v.boolean()),
    enableTenantScreening: v.optional(v.boolean()),
    // Custom content
    landingHeroTitle: v.optional(v.string()),
    landingHeroSubtitle: v.optional(v.string()),
    announcementBanner: v.optional(v.string()),
    // Timestamps
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"]),

  // Admin-managed pricing overrides — lets admin change plan prices dynamically
  pricingConfig: defineTable({
    plan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    name: v.string(),
    monthlyPrice: v.number(), // cents
    annualPrice: v.optional(v.number()), // cents (if different from monthly * 10)
    unitLimit: v.optional(v.string()),
    subAccountLimit: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_plan", ["plan"]),

  // Discount codes managed by admin
  discountCodes: defineTable({
    code: v.string(), // e.g. "WELCOME20"
    description: v.optional(v.string()),
    type: v.union(v.literal("percentage"), v.literal("fixed")),
    value: v.number(), // percentage (0-100) or fixed amount in cents
    applicablePlans: v.optional(v.array(v.string())), // null = all plans
    maxUses: v.optional(v.number()),
    currentUses: v.number(),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_code", ["code"])
    .index("by_isActive", ["isActive"]),

  // eSignature records
  eSignatures: defineTable({
    documentId: v.optional(v.id("documents")),
    leaseId: v.optional(v.id("leases")),
    signedByUserId: v.id("users"),
    organizationUserId: v.id("users"),
    signatureData: v.string(), // base64 canvas image
    signedAt: v.number(),
    ipAddress: v.optional(v.string()),
    documentTitle: v.optional(v.string()),
    status: v.union(v.literal("signed"), v.literal("voided")),
  })
    .index("by_signedByUserId", ["signedByUserId"])
    .index("by_leaseId", ["leaseId"])
    .index("by_documentId", ["documentId"])
    .index("by_organizationUserId", ["organizationUserId"]),

  // Push notification subscriptions
  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  // Credit check records
  creditChecks: defineTable({
    applicantUserId: v.id("users"),
    organizationUserId: v.id("users"),
    applicationId: v.optional(v.id("renterApplications")),
    provider: v.union(v.literal("transunion"), v.literal("experian"), v.literal("manual")),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    creditScore: v.optional(v.number()),
    riskLevel: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    reportSummary: v.optional(v.string()),
    criminalClear: v.optional(v.boolean()),
    evictionClear: v.optional(v.boolean()),
    incomeVerified: v.optional(v.boolean()),
    monthlyIncome: v.optional(v.number()),
    requestedAt: v.number(),
    completedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()), // reports typically valid 30 days
    notes: v.optional(v.string()),
    fee: v.optional(v.number()), // amount charged for the check in cents
  })
    .index("by_applicantUserId", ["applicantUserId"])
    .index("by_organizationUserId", ["organizationUserId"])
    .index("by_applicationId", ["applicationId"])
    .index("by_status", ["status"]),
});

export default schema;
