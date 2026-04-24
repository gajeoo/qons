export default {
  providers: [
    {
      domain:
        process.env.CONVEX_SITE_URL ??
        process.env.VITE_CONVEX_URL ??
        "http://127.0.0.1:3210",
      applicationID: "convex",
    },
  ],
};
