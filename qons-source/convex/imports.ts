import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

type GenericRecord = Record<string, string>;

function normalizeKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  out.push(current.trim());
  return out;
}

function parseCsv(content: string): GenericRecord[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const records: GenericRecord[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const record: GenericRecord = {};
    for (let j = 0; j < headers.length; j += 1) {
      record[headers[j]] = cols[j] ?? "";
    }
    records.push(record);
  }

  return records;
}

function detectRowType(
  record: GenericRecord,
): "property" | "staff" | "resident" | "unknown" {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    normalized[normalizeKey(key)] = value;
  }

  const hasAddress = !!(
    normalized.address ||
    normalized.street ||
    normalized.propertyaddress
  );
  const hasUnits = !!(normalized.units || normalized.totalunits);
  const hasHourly = !!(
    normalized.hourlyrate ||
    normalized.rate ||
    normalized.payrate
  );
  const hasResidentUnit = !!(
    normalized.unit ||
    normalized.apartment ||
    normalized.apt
  );
  const hasPropertyRef = !!(
    normalized.property ||
    normalized.propertyname ||
    normalized.building
  );
  const hasName = !!(
    normalized.name ||
    normalized.fullname ||
    normalized.staffname ||
    normalized.residentname
  );

  if (hasAddress || (hasUnits && hasPropertyRef)) return "property";
  if (
    hasHourly ||
    (hasName && (normalized.role || normalized.position || normalized.jobtitle))
  ) {
    return "staff";
  }
  if (
    hasResidentUnit ||
    (hasPropertyRef && (normalized.leaseend || normalized.moveindate))
  ) {
    return "resident";
  }
  return "unknown";
}

function getValue(record: GenericRecord, keys: string[]): string {
  const normalized = Object.fromEntries(
    Object.entries(record).map(([k, v]) => [normalizeKey(k), v]),
  );
  for (const key of keys) {
    const value = normalized[normalizeKey(key)];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

export const listHistory = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("importJobs"),
      _creationTime: v.number(),
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
    }),
  ),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query("importJobs")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .order("desc")
      .take(20);

    return rows.map(row => ({
      _id: row._id,
      _creationTime: row._creationTime,
      fileName: row.fileName,
      status: row.status,
      totalRows: row.totalRows,
      propertiesCreated: row.propertiesCreated,
      propertiesUpdated: row.propertiesUpdated,
      staffCreated: row.staffCreated,
      residentsCreated: row.residentsCreated,
      ignoredRows: row.ignoredRows,
      errorCount: row.errorCount,
      errorSummary: row.errorSummary,
    }));
  },
});

export const smartImport = mutation({
  args: {
    fileName: v.string(),
    content: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    propertiesCreated: v.number(),
    propertiesUpdated: v.number(),
    staffCreated: v.number(),
    residentsCreated: v.number(),
    ignoredRows: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, { fileName, content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        success: false,
        propertiesCreated: 0,
        propertiesUpdated: 0,
        staffCreated: 0,
        residentsCreated: 0,
        ignoredRows: 0,
        errors: ["Not authenticated"],
      };
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    if (!profile || profile.role === "worker" || profile.role === "manager") {
      return {
        success: false,
        propertiesCreated: 0,
        propertiesUpdated: 0,
        staffCreated: 0,
        residentsCreated: 0,
        ignoredRows: 0,
        errors: ["Only primary accounts can run bulk imports"],
      };
    }

    let records: GenericRecord[] = [];
    const lowerFile = fileName.toLowerCase();

    try {
      if (lowerFile.endsWith(".json")) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          records = parsed as GenericRecord[];
        } else if (parsed && typeof parsed === "object") {
          const grouped: GenericRecord[] = [];
          for (const key of ["properties", "staff", "residents"]) {
            if (Array.isArray((parsed as Record<string, unknown>)[key])) {
              grouped.push(
                ...((parsed as Record<string, unknown>)[
                  key
                ] as GenericRecord[]),
              );
            }
          }
          records = grouped;
        }
      } else {
        records = parseCsv(content);
      }
    } catch (error: any) {
      return {
        success: false,
        propertiesCreated: 0,
        propertiesUpdated: 0,
        staffCreated: 0,
        residentsCreated: 0,
        ignoredRows: 0,
        errors: [error?.message || "Failed to parse file"],
      };
    }

    const allProperties = await ctx.db
      .query("properties")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);

    const propertyByName = new Map(
      allProperties.map(p => [p.name.trim().toLowerCase(), p]),
    );

    let propertiesCreated = 0;
    let propertiesUpdated = 0;
    let staffCreated = 0;
    let residentsCreated = 0;
    let ignoredRows = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        const rowType = detectRowType(record);

        if (rowType === "property") {
          const name = getValue(record, ["name", "propertyName", "building"]);
          const address = getValue(record, [
            "address",
            "street",
            "propertyAddress",
          ]);
          const city = getValue(record, ["city"]);
          const state = getValue(record, ["state"]);
          const zip = getValue(record, ["zip", "zipcode", "postalCode"]);
          const units =
            Number.parseInt(
              getValue(record, ["units", "totalUnits"]) || "0",
              10,
            ) || 0;
          const imageUrl = getValue(record, [
            "image",
            "imageUrl",
            "photo",
            "propertyImage",
          ]);
          const latitude = Number.parseFloat(
            getValue(record, ["latitude", "lat"]) || "",
          );
          const longitude = Number.parseFloat(
            getValue(record, ["longitude", "lng", "lon"]) || "",
          );

          if (!name || !address || !city || !state || !zip) {
            ignoredRows += 1;
            continue;
          }

          const existing = propertyByName.get(name.trim().toLowerCase());

          if (existing) {
            await ctx.db.patch(existing._id, {
              address,
              city,
              state,
              zip,
              units: units || existing.units,
              imageUrl: imageUrl || existing.imageUrl,
              latitude: Number.isFinite(latitude)
                ? latitude
                : existing.latitude,
              longitude: Number.isFinite(longitude)
                ? longitude
                : existing.longitude,
            });
            propertiesUpdated += 1;
          } else {
            const propertyId = await ctx.db.insert("properties", {
              userId,
              name,
              address,
              city,
              state,
              zip,
              units,
              type: "residential",
              status: "active",
              imageUrl: imageUrl || undefined,
              latitude: Number.isFinite(latitude) ? latitude : undefined,
              longitude: Number.isFinite(longitude) ? longitude : undefined,
            });
            const inserted = await ctx.db.get(propertyId);
            if (inserted) {
              propertyByName.set(name.trim().toLowerCase(), inserted);
            }
            propertiesCreated += 1;
          }
          continue;
        }

        if (rowType === "staff") {
          const name = getValue(record, ["name", "fullName", "staffName"]);
          const email = getValue(record, ["email", "staffEmail"]);
          const role =
            getValue(record, ["role", "position", "jobTitle"]) || "staff";
          const hourlyRate =
            Number.parseFloat(
              getValue(record, ["hourlyRate", "rate", "payRate"]) || "0",
            ) || 0;
          const phone = getValue(record, ["phone", "mobile"]);

          if (!name || !email) {
            ignoredRows += 1;
            continue;
          }

          await ctx.db.insert("staff", {
            userId,
            name,
            email,
            phone: phone || undefined,
            role,
            hourlyRate,
            status: "active",
          });
          staffCreated += 1;
          continue;
        }

        if (rowType === "resident") {
          const name = getValue(record, ["name", "residentName", "fullName"]);
          const email = getValue(record, ["email", "residentEmail"]);
          const unit = getValue(record, ["unit", "apartment", "apt"]);
          const propertyName = getValue(record, [
            "property",
            "propertyName",
            "building",
          ]);
          const phone = getValue(record, ["phone", "mobile"]);
          const leaseEnd = getValue(record, ["leaseEnd", "lease_end"]);

          const linkedProperty = propertyByName.get(
            propertyName.trim().toLowerCase(),
          );
          if (!name || !email || !unit || !linkedProperty) {
            ignoredRows += 1;
            continue;
          }

          await ctx.db.insert("residents", {
            userId,
            propertyId: linkedProperty._id,
            name,
            email,
            unit,
            phone: phone || undefined,
            leaseEnd: leaseEnd || undefined,
            status: "active",
          });
          residentsCreated += 1;
          continue;
        }

        ignoredRows += 1;
      } catch (error: any) {
        errors.push(error?.message || "Failed to import a row");
      }
    }

    const status =
      errors.length > 0
        ? records.length > errors.length
          ? "partial"
          : "failed"
        : "success";

    await ctx.db.insert("importJobs", {
      userId,
      fileName,
      status,
      totalRows: records.length,
      propertiesCreated,
      propertiesUpdated,
      staffCreated,
      residentsCreated,
      ignoredRows,
      errorCount: errors.length,
      errorSummary: errors.slice(0, 10).join(" | ") || undefined,
      createdAt: Date.now(),
    });

    return {
      success: errors.length === 0,
      propertiesCreated,
      propertiesUpdated,
      staffCreated,
      residentsCreated,
      ignoredRows,
      errors,
    };
  },
});
