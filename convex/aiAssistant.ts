import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";

// ========== ASSISTANT CONVERSATION STORE ==========

export const getConversation = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const messages = await ctx.db
      .query("aiAssistantMessages")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .order("asc")
      .take(100);

    return messages;
  },
});

export const clearConversation = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const messages = await ctx.db
      .query("aiAssistantMessages")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    return null;
  },
});

/**
 * Process a user message: store it, analyze intent, execute actions, and reply.
 * This is the main brain of the assistant.
 */
export const sendMessage = mutation({
  args: { content: v.string() },
  handler: async (ctx, { content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Store user message
    await ctx.db.insert("aiAssistantMessages", {
      userId,
      role: "user",
      content,
      timestamp: Date.now(),
    });

    // Gather context about the user's account
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(50);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(100);

    const staff = await ctx.db
      .query("staff")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(50);

    const residents = await ctx.db
      .query("residents")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(100);

    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(100);

    const automationRules = await ctx.db
      .query("automationRules")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(50);

    const msg = content.toLowerCase().trim();

    // ========== INTENT DETECTION & EXECUTION ==========
    let response = "";
    let actionTaken = "";

    // --- CREATE TASK ---
    if (
      (msg.includes("create") ||
        msg.includes("add") ||
        msg.includes("make") ||
        msg.includes("new")) &&
      (msg.includes("task") || msg.includes("todo") || msg.includes("to-do"))
    ) {
      const titleMatch =
        content.match(
          /(?:task|todo|to-do)[:\s]+["']?(.+?)["']?(?:\s+(?:with|for|due|priority|$))/i,
        ) ||
        content.match(
          /(?:create|add|make|new)\s+(?:a\s+)?task\s+(?:called\s+|named\s+|for\s+)?["']?(.+?)["']?\s*$/i,
        ) ||
        content.match(/["'](.+?)["']/);

      const title = titleMatch
        ? titleMatch[1].trim()
        : content.replace(/^.*?(?:task|todo)\s*/i, "").trim() || "New Task";

      const priority = msg.includes("urgent")
        ? "urgent"
        : msg.includes("high")
          ? "high"
          : msg.includes("low")
            ? "low"
            : "medium";

      const category = msg.includes("maintenance")
        ? "maintenance"
        : msg.includes("inspect")
          ? "inspection"
          : msg.includes("clean")
            ? "cleaning"
            : msg.includes("hoa")
              ? "hoa"
              : "administrative";

      // Check for property assignment
      let propertyId: any = undefined;
      for (const p of properties) {
        if (msg.includes(p.name.toLowerCase())) {
          propertyId = p._id;
          break;
        }
      }

      // Check for staff assignment
      let assignedToStaffId: any = undefined;
      for (const s of staff) {
        if (msg.includes(s.name.toLowerCase())) {
          assignedToStaffId = s._id;
          break;
        }
      }

      await ctx.db.insert("tasks", {
        userId,
        title,
        description: `Created via AI Assistant: "${content}"`,
        priority: priority as any,
        status: "todo",
        category: category as any,
        propertyId,
        assignedToStaffId,
      });

      response = `✅ *Task created:* "${title}"\n• Priority: ${priority}\n• Category: ${category}${propertyId ? `\n• Property: ${properties.find(p => p._id === propertyId)?.name}` : ""}${assignedToStaffId ? `\n• Assigned to: ${staff.find(s => s._id === assignedToStaffId)?.name}` : ""}\n\nAnything else?`;
      actionTaken = "create_task";
    }

    // --- COMPLETE/UPDATE TASK ---
    else if (
      (msg.includes("complete") ||
        msg.includes("finish") ||
        msg.includes("done") ||
        msg.includes("close")) &&
      msg.includes("task")
    ) {
      const openTasks = tasks.filter(
        t => t.status !== "completed" && t.status !== "cancelled",
      );
      const matchedTask = openTasks.find(t =>
        msg.includes(t.title.toLowerCase()),
      );

      if (matchedTask) {
        await ctx.db.patch(matchedTask._id, {
          status: "completed",
          completedAt: Date.now(),
        });
        response = `✅ Task "${matchedTask.title}" marked as *completed*!`;
        actionTaken = "complete_task";
      } else if (
        openTasks.length === 1 &&
        (msg.includes("the task") ||
          msg.includes("my task") ||
          msg.includes("it"))
      ) {
        await ctx.db.patch(openTasks[0]._id, {
          status: "completed",
          completedAt: Date.now(),
        });
        response = `✅ Task "${openTasks[0].title}" marked as *completed*!`;
        actionTaken = "complete_task";
      } else {
        response = `I found ${openTasks.length} open tasks. Which one do you want to complete?\n\n${openTasks
          .slice(0, 10)
          .map((t, i) => `${i + 1}. "${t.title}" (${t.priority})`)
          .join("\n")}`;
      }
    }

    // --- LIST TASKS ---
    else if (
      (msg.includes("list") ||
        msg.includes("show") ||
        msg.includes("what") ||
        msg.includes("my")) &&
      (msg.includes("task") || msg.includes("todo"))
    ) {
      const openTasks = tasks.filter(
        t => t.status !== "completed" && t.status !== "cancelled",
      );
      const completedTasks = tasks.filter(t => t.status === "completed");

      if (openTasks.length === 0) {
        response =
          "🎉 You have no open tasks! All caught up.\n\nWant me to create one?";
      } else {
        const grouped = {
          urgent: openTasks.filter(t => t.priority === "urgent"),
          high: openTasks.filter(t => t.priority === "high"),
          medium: openTasks.filter(t => t.priority === "medium"),
          low: openTasks.filter(t => t.priority === "low"),
        };

        let taskList = `📋 *Your Open Tasks (${openTasks.length}):*\n\n`;

        for (const [priority, items] of Object.entries(grouped)) {
          if (items.length > 0) {
            const emoji =
              priority === "urgent"
                ? "🔴"
                : priority === "high"
                  ? "🟠"
                  : priority === "medium"
                    ? "🟡"
                    : "🟢";
            taskList += `${emoji} *${priority.charAt(0).toUpperCase() + priority.slice(1)}:*\n`;
            for (const t of items.slice(0, 5)) {
              taskList += `  • ${t.title} (${t.status})${t.dueDate ? ` — due ${t.dueDate}` : ""}\n`;
            }
          }
        }

        taskList += `\n📊 ${completedTasks.length} tasks completed total.`;
        response = taskList;
      }
      actionTaken = "list_tasks";
    }

    // --- PROPERTY SUMMARY ---
    else if (
      msg.includes("propert") ||
      msg.includes("building") ||
      msg.includes("portfolio")
    ) {
      if (properties.length === 0) {
        response =
          "You haven't added any properties yet. Would you like to go to the Properties page to add one?";
      } else {
        const active = properties.filter(p => p.status === "active");
        const totalUnits = properties.reduce((s, p) => s + p.units, 0);

        response = `🏢 *Your Portfolio (${properties.length} properties):*\n\n`;
        for (const p of properties.slice(0, 10)) {
          const statusEmoji =
            p.status === "active"
              ? "🟢"
              : p.status === "inactive"
                ? "🔴"
                : "🟡";
          response += `${statusEmoji} *${p.name}*\n   ${p.address}, ${p.city}, ${p.state} ${p.zip}\n   ${p.units} units · ${p.type}\n\n`;
        }
        response += `📊 *Summary:* ${active.length} active · ${totalUnits} total units`;
        if (properties.length > 10) {
          response += `\n\n_Showing first 10 of ${properties.length} properties._`;
        }
      }
      actionTaken = "list_properties";
    }

    // --- STAFF OVERVIEW ---
    else if (
      (msg.includes("staff") ||
        msg.includes("team") ||
        msg.includes("employee") ||
        msg.includes("worker")) &&
      !msg.includes("assign")
    ) {
      if (staff.length === 0) {
        response =
          "No staff members added yet. Head to the Staff page to add your team!";
      } else {
        const activeStaff = staff.filter(s => s.status === "active");
        response = `👥 *Your Team (${staff.length} total, ${activeStaff.length} active):*\n\n`;
        for (const s of staff.slice(0, 10)) {
          const statusEmoji =
            s.status === "active"
              ? "🟢"
              : s.status === "on_leave"
                ? "🟡"
                : "🔴";
          response += `${statusEmoji} *${s.name}* — ${s.role}\n   ${s.email}${s.phone ? ` · ${s.phone}` : ""} · $${s.hourlyRate}/hr\n`;
          if (s.skills?.length) {
            response += `   Skills: ${s.skills.join(", ")}\n`;
          }
          response += "\n";
        }
      }
      actionTaken = "list_staff";
    }

    // --- SCHEDULE / SHIFTS ---
    else if (
      msg.includes("schedule") ||
      msg.includes("shift") ||
      msg.includes("who's working") ||
      msg.includes("today")
    ) {
      const today = new Date().toISOString().split("T")[0];
      const todayShifts = shifts.filter(s => s.date === today);
      const upcoming = shifts
        .filter(s => s.date >= today && s.status === "scheduled")
        .sort((a, b) => a.date.localeCompare(b.date));

      if (todayShifts.length === 0 && upcoming.length === 0) {
        response =
          "📅 No shifts scheduled. Go to the Schedule page to create shifts, or I can help — just say what you need!";
      } else {
        response = `📅 *Today's Schedule (${todayShifts.length} shifts):*\n\n`;
        for (const s of todayShifts.slice(0, 10)) {
          const staffMember = staff.find(st => st._id === s.staffId);
          const prop = properties.find(p => p._id === s.propertyId);
          const statusEmoji =
            s.status === "completed"
              ? "✅"
              : s.status === "in_progress"
                ? "🔵"
                : s.status === "no_show"
                  ? "🔴"
                  : "⏳";
          response += `${statusEmoji} ${s.startTime}–${s.endTime} · *${staffMember?.name || "Unassigned"}* at ${prop?.name || "Unknown"}\n`;
        }

        if (upcoming.length > todayShifts.length) {
          response += `\n📆 *Coming up:* ${upcoming.length - todayShifts.length} more shifts scheduled this week.`;
        }
      }
      actionTaken = "view_schedule";
    }

    // --- RESIDENTS ---
    else if (
      msg.includes("resident") ||
      msg.includes("tenant") ||
      msg.includes("lease")
    ) {
      if (residents.length === 0) {
        response =
          "No residents added yet. Go to the Residents page to start tracking!";
      } else {
        const active = residents.filter(r => r.status === "active");
        const pending = residents.filter(r => r.status === "pending");
        const expiringLeases = residents.filter(r => {
          if (!r.leaseEnd) return false;
          const daysLeft =
            (new Date(r.leaseEnd).getTime() - Date.now()) / 86400000;
          return daysLeft > 0 && daysLeft < 30;
        });

        response = `🏠 *Residents (${residents.length} total):*\n`;
        response += `• Active: ${active.length}\n`;
        response += `• Pending approval: ${pending.length}\n`;
        if (expiringLeases.length > 0) {
          response += `\n⚠️ *${expiringLeases.length} lease(s) expiring within 30 days:*\n`;
          for (const r of expiringLeases.slice(0, 5)) {
            response += `  • ${r.name} (Unit ${r.unit}) — expires ${r.leaseEnd}\n`;
          }
        }
      }
      actionTaken = "list_residents";
    }

    // --- AUTOMATIONS ---
    else if (
      msg.includes("automation") ||
      msg.includes("rule") ||
      msg.includes("workflow")
    ) {
      const activeRules = automationRules.filter(r => r.isActive);
      if (automationRules.length === 0) {
        response =
          "You don't have any automation rules yet. Go to the *Automations* page to set up rules — or tell me what you want to automate and I'll help!";
      } else {
        response = `⚡ *Your Automations (${automationRules.length} rules, ${activeRules.length} active):*\n\n`;
        for (const r of automationRules.slice(0, 10)) {
          const statusIcon = r.isActive ? "🟢" : "⏸️";
          response += `${statusIcon} *${r.name}*\n   Trigger: ${r.trigger} · ${r.actions.length} action(s) · ${r.runCount || 0} runs\n\n`;
        }
      }
      actionTaken = "list_automations";
    }

    // --- FULL DASHBOARD SUMMARY ---
    else if (
      msg.includes("summary") ||
      msg.includes("overview") ||
      msg.includes("dashboard") ||
      msg.includes("how's everything") ||
      msg.includes("status")
    ) {
      const openTasks = tasks.filter(
        t => t.status !== "completed" && t.status !== "cancelled",
      );
      const urgentTasks = openTasks.filter(
        t => t.priority === "urgent" || t.priority === "high",
      );
      const activeStaff = staff.filter(s => s.status === "active");
      const activeProps = properties.filter(p => p.status === "active");
      const activeResidents = residents.filter(r => r.status === "active");
      const today = new Date().toISOString().split("T")[0];
      const todayShifts = shifts.filter(s => s.date === today);
      const activeAutomations = automationRules.filter(r => r.isActive);

      response = `📊 *Account Overview:*\n\n`;
      response += `🏢 *Properties:* ${activeProps.length} active (${properties.reduce((s, p) => s + p.units, 0)} total units)\n`;
      response += `👥 *Staff:* ${activeStaff.length} active / ${staff.length} total\n`;
      response += `🏠 *Residents:* ${activeResidents.length} active\n`;
      response += `📅 *Today's Shifts:* ${todayShifts.length}\n`;
      response += `📋 *Open Tasks:* ${openTasks.length}`;
      if (urgentTasks.length > 0) {
        response += ` (⚠️ ${urgentTasks.length} urgent/high)`;
      }
      response += `\n⚡ *Automations:* ${activeAutomations.length} active rules\n`;

      if (urgentTasks.length > 0) {
        response += `\n🔴 *Needs Attention:*\n`;
        for (const t of urgentTasks.slice(0, 3)) {
          response += `  • ${t.title} (${t.priority})\n`;
        }
      }

      response += `\nWhat would you like to work on?`;
      actionTaken = "dashboard_summary";
    }

    // --- HELP / DEFAULT ---
    else if (msg.includes("help") || msg.includes("what can you")) {
      response = `🤖 *I'm your Qons AI Assistant!* Here's what I can do:\n\n`;
      response += `📋 *Tasks:*\n`;
      response += `  • "Create a task called Check HVAC system"\n`;
      response += `  • "Show my tasks" / "List urgent tasks"\n`;
      response += `  • "Complete task Check HVAC system"\n\n`;
      response += `🏢 *Properties:*\n`;
      response += `  • "Show my properties" / "Portfolio summary"\n\n`;
      response += `👥 *Staff & Schedule:*\n`;
      response += `  • "Show my team" / "Who's working today?"\n`;
      response += `  • "Show today's schedule"\n\n`;
      response += `🏠 *Residents:*\n`;
      response += `  • "Show residents" / "Any expiring leases?"\n\n`;
      response += `⚡ *Automations:*\n`;
      response += `  • "Show my automations"\n\n`;
      response += `📊 *Overview:*\n`;
      response += `  • "Give me a summary" / "Dashboard overview"\n\n`;
      response += `Just type naturally — I understand context!`;
      actionTaken = "help";
    }

    // --- GREETING ---
    else if (
      msg.match(
        /^(hi|hello|hey|good morning|good afternoon|good evening|sup|yo)/,
      )
    ) {
      const hour = new Date().getHours();
      const greeting =
        hour < 12
          ? "Good morning"
          : hour < 17
            ? "Good afternoon"
            : "Good evening";
      const openTasks = tasks.filter(
        t => t.status !== "completed" && t.status !== "cancelled",
      );
      const urgentCount = openTasks.filter(
        t => t.priority === "urgent" || t.priority === "high",
      ).length;

      response = `${greeting}! 👋 I'm your Qons AI Assistant.\n\n`;
      response += `Quick glance at your account:\n`;
      response += `• 🏢 ${properties.length} properties\n`;
      response += `• 📋 ${openTasks.length} open tasks${urgentCount > 0 ? ` (${urgentCount} urgent/high ⚠️)` : ""}\n`;
      response += `• 👥 ${staff.filter(s => s.status === "active").length} active staff\n\n`;
      response += `How can I help you today?`;
      actionTaken = "greeting";
    }

    // --- FALLBACK ---
    else {
      response = `I understand you're asking about: _"${content}"_\n\nI can help with:\n• 📋 *Tasks* — create, list, complete\n• 🏢 *Properties* — view portfolio\n• 👥 *Staff* — team overview\n• 📅 *Schedule* — today's shifts\n• 🏠 *Residents* — lease tracking\n• ⚡ *Automations* — view rules\n• 📊 *Summary* — full overview\n\nTry saying something like "create a task" or "show my dashboard"!`;
      actionTaken = "fallback";
    }

    // Store assistant response
    await ctx.db.insert("aiAssistantMessages", {
      userId,
      role: "assistant",
      content: response,
      timestamp: Date.now(),
      actionTaken,
    });

    return { response, actionTaken };
  },
});

export const storeMessage = internalMutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    actionTaken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("aiAssistantMessages", {
      userId: args.userId,
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
      actionTaken: args.actionTaken,
    });
    return null;
  },
});

export const sendMessageLLM = action({
  args: { content: v.string() },
  returns: v.object({
    response: v.string(),
    actionTaken: v.string(),
    provider: v.string(),
  }),
  handler: async (ctx, { content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const env = (globalThis as any).process?.env || {};
    const apiKey = env.OPENAI_API_KEY;
    const model = env.OPENAI_MODEL || "gpt-4o-mini";

    // Fallback to existing rules engine if key is not configured.
    if (!apiKey) {
      const fallback: any = await ctx.runMutation(api.aiAssistant.sendMessage, {
        content,
      });
      return {
        response: fallback?.response || "I could not process that request.",
        actionTaken: fallback?.actionTaken || "fallback",
        provider: "rules",
      };
    }

    await ctx.runMutation(internal.aiAssistant.storeMessage, {
      userId,
      role: "user",
      content,
    });

    const history = (await ctx.runQuery(api.aiAssistant.getConversation, {})) || [];
    const properties = await ctx.runQuery(api.properties.list, {});
    const tasks = await ctx.runQuery(api.tasks.list, {});
    const residents = await ctx.runQuery(api.residents.list, { propertyId: undefined });

    const systemPrompt = [
      "You are Qons AI Assistant for property managers.",
      "Be concise, action-oriented, and practical.",
      "Use markdown bullets for recommendations.",
      `Context: ${properties.length} properties, ${tasks.length} tasks, ${residents.length} residents.`,
      "If asked to create/update records, provide safe next steps and ask for missing fields.",
    ].join(" ");

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-16).map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content },
    ];

    let response = "I could not generate a response right now.";
    try {
      const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages,
        }),
      });

      const llmJson: any = await llmRes.json();
      response =
        llmJson?.choices?.[0]?.message?.content?.trim() ||
        "I could not generate a response right now.";
    } catch {
      const fallback: any = await ctx.runMutation(api.aiAssistant.sendMessage, {
        content,
      });
      return {
        response: fallback?.response || "I could not process that request.",
        actionTaken: fallback?.actionTaken || "fallback",
        provider: "rules",
      };
    }

    await ctx.runMutation(internal.aiAssistant.storeMessage, {
      userId,
      role: "assistant",
      content: response,
      actionTaken: "llm_response",
    });

    return {
      response,
      actionTaken: "llm_response",
      provider: "openai",
    };
  },
});
