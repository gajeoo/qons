/**
 * Email notifications for new leads via Viktor Tools
 */
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

declare const process: { env: Record<string, string | undefined> };

const VIKTOR_API_URL = process.env.VIKTOR_SPACES_API_URL;
const PROJECT_NAME = process.env.VIKTOR_SPACES_PROJECT_NAME;
const PROJECT_SECRET = process.env.VIKTOR_SPACES_PROJECT_SECRET;

async function callTool<T>(
  role: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!VIKTOR_API_URL || !PROJECT_NAME || !PROJECT_SECRET) {
    throw new Error("Viktor Tools not configured");
  }

  const response = await fetch(
    `${VIKTOR_API_URL}/api/viktor-spaces/tools/call`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: PROJECT_NAME,
        project_secret: PROJECT_SECRET,
        role,
        arguments: args,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error ?? "Tool call failed");
  }
  return json.result as T;
}

/**
 * Send email notification when a new lead comes in
 */
export const notifyNewLead = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    properties: v.optional(v.string()),
    inquiryType: v.string(),
    message: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const adminEmail = "gajeo21@gmail.com";

    const typeLabels: Record<string, string> = {
      demo: "Demo Request",
      beta: "Beta Signup",
      question: "Question",
      partnership: "Partnership Inquiry",
      pricing: "Pricing Inquiry",
      support: "Support Request",
    };

    const subject = `New QonsApp Lead: ${typeLabels[args.inquiryType] ?? args.inquiryType} from ${args.name}`;

    const body = [
      `New lead submitted on QonsApp:`,
      ``,
      `Name: ${args.name}`,
      `Email: ${args.email}`,
      args.company ? `Company: ${args.company}` : null,
      args.properties ? `Properties: ${args.properties}` : null,
      `Type: ${typeLabels[args.inquiryType] ?? args.inquiryType}`,
      args.message ? `\nMessage:\n${args.message}` : null,
      ``,
      `---`,
      `View all leads in your admin dashboard.`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await callTool("coworker_send_email", {
        to: adminEmail,
        subject,
        body,
      });
      console.log(`Lead notification sent to ${adminEmail}`);
    } catch (e) {
      // Don't fail the lead submission if email fails
      console.error("Failed to send lead notification email:", e);
    }

    return null;
  },
});
