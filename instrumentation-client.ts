import posthog from "posthog-js";

/**
 * PostHog : initialisation tôt (bundle client) mais **sans capture** tant que l'utilisateur
 * n'a pas consenti aux cookies « analytics » (voir PosthogConsentSync).
 */
const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
if (token) {
  posthog.init(token, {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
  });
}

let onRouterTransitionStart: (href: string, navigationType: string) => void = () => {};

export { onRouterTransitionStart };
