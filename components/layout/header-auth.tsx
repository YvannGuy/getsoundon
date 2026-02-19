import Link from "next/link";

export function HeaderAuth() {
  return (
    <Link
      href="/auth"
      className="inline-flex h-9 items-center justify-center rounded-md bg-[#263e55] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#213449]"
    >
      Connexion
    </Link>
  );
}
