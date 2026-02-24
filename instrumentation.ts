const useSentry =
  process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (!useSentry) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export async function onRequestError(err, request, context) {
  if (!useSentry) return;
  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRequestError(err, request, context);
}
