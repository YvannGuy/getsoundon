import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Connexion | GetSoundOn",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function appendParam(qs: URLSearchParams, key: string, value: string | string[] | undefined) {
  if (typeof value !== "string" || !value) return;
  qs.set(key, value);
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  appendParam(qs, "redirectedFrom", sp.redirectedFrom);
  const suffix = qs.toString();
  redirect(suffix ? `/auth?${suffix}` : "/auth");
}
