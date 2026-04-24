import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { TestCredentials } from "./testAuth";
import {
  ViktorSpacesEmail,
  ViktorSpacesPasswordReset,
} from "./ViktorSpacesEmail";

declare const process: { env: Record<string, string | undefined> };

const DEV_FALLBACK_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCt4zqM49Qm8iVG
Z+8FsgeJ8+J1PjCMya99XzA+66MkgfXTyscN8Y2DmlOomCkz6DwJlizdpO9kZ/JV
pW9/5hvr2X6arv2BbrpF5uvNufMW3EfqcOOOa8tt723Az1Bq0g+T1rG6yOPdQ1o+
dN6Q9S4//iPXr6VTs3Cdn3gqOet2DhN1r2AaFTmtduxCZET6VPJSqBekewfBQIKJ
f4GcBWnlJRmuUFq8PXMVr4zakgBD31SbsoLxv5YEX+GU0DFNeFpFTB+EdiPE8fqL
wEKjN+k87+lWA6ZZY3nAiC+4N5vplkHODgqdeYgkO4/4CSOIoxRAuG6F57NGGofO
la/senEjAgMBAAECggEAVUpy8h9f9LhqGyYoofkIZJyZE9vssWnN56dUgVBQRbxv
KTK5vzefq5D7fuMftqOvKx6bpB3eBDhOL79FOQ1T3bPhOxshIib/PAE/4TlXqHtk
1PQJUdbCwgoiIeQuNC8Tz/aLV6xoxCNgtOjbMGvqgx3zU7yGUc9eqhnJtaCSQ2Vj
5/ok7G3HatLc10TbIO8I00cK+sGeFSG+2waEtaBBe1csdXGKhjHOwwCF8IFk0nVc
Nyw5mUC3Rx82c0FmSLbGbe1pqSxQTg3YDS4GRyPtg71R8xJpiiabiK4xIHg/CCdx
dZPKIZFBE777CjkfKmsqFsiVoj9FAOxNxcnKiNN9pQKBgQD0P0OQRIn/olQqz6/7
NU0kimzLiIBUV+vlvOkf4xedAlPClptilZ71MHNxZy3l/zDSmZII02fYCujzdreW
C0Lg5uNOvDX2GQZVX2zBIc4qTdcbZMDb+jrml44iyVNd72u5nxPcb11/RzAF4e2G
8U9IjYt7++LIaELR8zBARHGmBQKBgQC2QT9c3URh0FhHavlMmDBms0q5n/x+dEk8
f7XB1xaKz0b/s3Z0L1xXRcgSQJlr6xBOR3zrJRDO8U9KMPCMXY1VXeq8ci2iiIQq
t75hWbQ3zZUlRS0sAuGCLMwuPY0J4P8tGv+EuUgY3Np9+9eMz4BTPngF0RvW1xAf
0o1L3Lj7BwKBgQCBcPWxg2FPJQxOE/tDup/DecjmpNS93kqaWl+CEqv0/cK+IWr/
+CNh9ed4diIQ/gk100VdgAxMppuGS6hH0HgFENfuZjiC0AhXPlc4k13bdZ1GW0MK
UbbddfxR2zhfU/9XREMWU77NMUD2HSHwnfpSjREbCAbMBtVCxwsPRDamsQKBgAQ5
aO2PF1mpCZLGMPcMg/qtZyr8QU7xBQ2I7D6M7LHU8hFVKIay3lILhQKfSq8MqLkX
wRZ2KniRcUQH9Ftcg70ZyyoI/3PH9EBFN/1rpdixRCaz/sMJYg6xWR4tQQqck22J
Naju3nPtEodfAfT6jj/fr8p6uUl2fKIwMCQ0/nibAoGAbJeNVl8z/ayXSrkCFCh0
u4llEofBF7hAvpIER8qVj+8IEo8wqE0fjamf7myZYnV4d0N4X4kAeMcgczdIBGhy
+GeIhXk8vJGPN0+foYb3LeCMr0445ugcIQWw5t7CovOAQ2Ux5BcHOeJzGQ6DopUQ
v8mkK2Hk7/CfiuwbIV/5Tys=
-----END PRIVATE KEY-----
`;

function decodeBase64Ascii(input: string): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const ch of input.replace(/\s+/g, "")) {
    if (ch === "=") break;
    const value = chars.indexOf(ch);
    if (value < 0) continue;

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

function decodePrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  if (key.includes("\\n")) return key.replace(/\\n/g, "\n");
  if (key.includes("\n")) return key;
  if (key.startsWith("-----BEGIN")) {
    return key
      .replace("-----BEGIN PRIVATE KEY----- ", "-----BEGIN PRIVATE KEY-----\n")
      .replace(" -----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----")
      .split(" ")
      .join("\n");
  }
  try {
    return atob(key);
  } catch {
    return decodeBase64Ascii(key);
  }
}

const authPrivateKey = process.env.AUTH_PRIVATE_KEY;
const decodedAuthPrivateKey = decodePrivateKey(authPrivateKey);
process.env.AUTH_PRIVATE_KEY = decodedAuthPrivateKey?.includes(
  "BEGIN PRIVATE KEY",
)
  ? decodedAuthPrivateKey
  : DEV_FALLBACK_PRIVATE_KEY;

const jwtPrivateKey = process.env.JWT_PRIVATE_KEY;
const decodedJwtPrivateKey = decodePrivateKey(jwtPrivateKey);
process.env.JWT_PRIVATE_KEY = decodedJwtPrivateKey?.includes(
  "BEGIN PRIVATE KEY",
)
  ? decodedJwtPrivateKey
  : DEV_FALLBACK_PRIVATE_KEY;

function normalizeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.startsWith("http") ? value : `https://${value}`;
}

// Convex Auth expects SITE_URL to exist for auth flows; provide a safe default
// for local and preview setups when it isn't configured explicitly.
if (!process.env.SITE_URL) {
  process.env.SITE_URL =
    normalizeUrl(process.env.APP_SITE_URL) ??
    normalizeUrl(process.env.FRONTEND_URL) ??
    normalizeUrl(process.env.VERCEL_URL) ??
    process.env.CONVEX_SITE_URL ??
    "http://127.0.0.1:5173";
}

const hasViktorEmailConfig =
  !!process.env.VIKTOR_SPACES_API_URL &&
  !!process.env.VIKTOR_SPACES_PROJECT_NAME &&
  !!process.env.VIKTOR_SPACES_PROJECT_SECRET;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    hasViktorEmailConfig
      ? Password({
          verify: ViktorSpacesEmail,
          reset: ViktorSpacesPasswordReset,
        })
      : Password(),
    ...(process.env.VIKTOR_SPACES_IS_PREVIEW === "true"
      ? [TestCredentials]
      : []),
  ],
});

export const currentUser = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});
