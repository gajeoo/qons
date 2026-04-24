/**
 * Email & SMS Delivery — SendGrid (email) and Twilio (SMS) integration.
 * Reads API keys from environment variables.
 *
 * Environment variables needed:
 *   SENDGRID_API_KEY — SendGrid API key for email delivery
 *   TWILIO_ACCOUNT_SID — Twilio Account SID
 *   TWILIO_AUTH_TOKEN — Twilio Auth Token
 *   TWILIO_PHONE_NUMBER — Twilio phone number (e.g. +1234567890)
 *   FROM_EMAIL — Sender email address (default: noreply@quonsapp.com)
 */
import { v } from "convex/values";
import { action } from "./_generated/server";

declare const process: { env: Record<string, string | undefined> };

/* ------------------------------------------------------------------ */
/*  SendGrid Email Delivery                                            */
/* ------------------------------------------------------------------ */

/** Send a single email via SendGrid */
export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    htmlBody: v.optional(v.string()),
    fromName: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.log("[Email] SendGrid not configured, logging email:", args.to, args.subject);
      return { success: false, error: "SendGrid API key not configured", logged: true };
    }

    const fromEmail = process.env.FROM_EMAIL || "noreply@quonsapp.com";
    const fromName = args.fromName || "QonsApp";

    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: args.to }] }],
          from: { email: fromEmail, name: fromName },
          subject: args.subject,
          content: [
            ...(args.htmlBody
              ? [{ type: "text/html", value: args.htmlBody }]
              : []),
            { type: "text/plain", value: args.body },
          ],
        }),
      });

      if (response.ok || response.status === 202) {
        return { success: true };
      } else {
        const errorText = await response.text();
        console.error("[Email] SendGrid error:", response.status, errorText);
        return { success: false, error: `SendGrid error: ${response.status}` };
      }
    } catch (error) {
      console.error("[Email] Send failed:", error);
      return { success: false, error: String(error) };
    }
  },
});

/** Send a batch of emails (for broadcasts) */
export const sendBatchEmail = action({
  args: {
    recipients: v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    })),
    subject: v.string(),
    body: v.string(),
    htmlBody: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.log("[Email] SendGrid not configured, logging batch to", args.recipients.length, "recipients");
      return { success: false, error: "SendGrid not configured", sentCount: 0 };
    }

    const fromEmail = process.env.FROM_EMAIL || "noreply@quonsapp.com";
    let sentCount = 0;

    // SendGrid supports up to 1000 personalizations per request
    const personalizations = args.recipients.map((r) => ({
      to: [{ email: r.email, name: r.name }],
    }));

    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations,
          from: { email: fromEmail, name: "QonsApp" },
          subject: args.subject,
          content: [
            ...(args.htmlBody
              ? [{ type: "text/html", value: args.htmlBody }]
              : []),
            { type: "text/plain", value: args.body },
          ],
        }),
      });

      if (response.ok || response.status === 202) {
        sentCount = args.recipients.length;
      } else {
        console.error("[Email] Batch send error:", response.status);
      }
    } catch (error) {
      console.error("[Email] Batch send failed:", error);
    }

    return { success: sentCount > 0, sentCount };
  },
});

/* ------------------------------------------------------------------ */
/*  Twilio SMS Delivery                                                */
/* ------------------------------------------------------------------ */

/** Send a single SMS via Twilio */
export const sendSms = action({
  args: {
    to: v.string(), // phone number with country code (e.g. +1234567890)
    body: v.string(),
  },
  handler: async (_ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.log("[SMS] Twilio not configured, logging SMS:", args.to, args.body.substring(0, 50));
      return { success: false, error: "Twilio not configured", logged: true };
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: args.to,
            From: fromNumber,
            Body: args.body,
          }).toString(),
        },
      );

      if (response.ok) {
        const data = await response.json();
        return { success: true, sid: data.sid };
      } else {
        const errorData = await response.json();
        console.error("[SMS] Twilio error:", errorData);
        return { success: false, error: errorData.message || `Twilio error: ${response.status}` };
      }
    } catch (error) {
      console.error("[SMS] Send failed:", error);
      return { success: false, error: String(error) };
    }
  },
});

/** Send batch SMS */
export const sendBatchSms = action({
  args: {
    recipients: v.array(v.object({
      phone: v.string(),
      name: v.optional(v.string()),
    })),
    body: v.string(),
  },
  handler: async (_ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.log("[SMS] Twilio not configured, logging batch SMS to", args.recipients.length, "recipients");
      return { success: false, error: "Twilio not configured", sentCount: 0 };
    }

    let sentCount = 0;
    for (const recipient of args.recipients) {
      try {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: recipient.phone,
              From: fromNumber,
              Body: args.body,
            }).toString(),
          },
        );
        if (response.ok) sentCount++;
      } catch (error) {
        console.error("[SMS] Failed to send to", recipient.phone, error);
      }
    }

    return { success: sentCount > 0, sentCount };
  },
});

/** Check if email/SMS services are configured */
export const getStatus = action({
  args: {},
  handler: async () => {
    return {
      emailConfigured: !!process.env.SENDGRID_API_KEY,
      smsConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
      fromEmail: process.env.FROM_EMAIL || "noreply@quonsapp.com",
    };
  },
});
