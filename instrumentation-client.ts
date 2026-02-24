const useSentry =
  process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SENTRY_DSN;

let onRouterTransitionStart = () => {};

if (useSentry) {
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.05,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  });
  onRouterTransitionStart = Sentry.captureRouterTransitionStart;
}

export { onRouterTransitionStart };
