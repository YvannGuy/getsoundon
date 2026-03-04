import { redirect } from "next/navigation";
import Script from "next/script";

import { getUserOrNull } from "@/lib/supabase/server";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getUserOrNull();
  if (!user) {
    redirect("/auth?tab=signup&userType=owner");
  }

  return (
    <>
      <Script id="crisp-chat-onboarding" strategy="afterInteractive">
        {`window.$crisp=[];window.CRISP_WEBSITE_ID="62bde919-94c1-4b2e-8a44-990fb6533f17";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`}
      </Script>
      {children}
    </>
  );
}
