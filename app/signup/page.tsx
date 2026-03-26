import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Inscription | GetSoundOn",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function appendParam(qs: URLSearchParams, key: string, value: string | string[] | undefined) {
  if (typeof value !== "string" || !value) return;
  qs.set(key, value);
}

export default async function SignupPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  qs.set("tab", "signup");
  appendParam(qs, "redirectedFrom", sp.redirectedFrom);
  appendParam(qs, "userType", sp.userType);
  redirect(`/auth?${qs.toString()}`);
}
