"use client";

import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type AdminFilterBarProps = {
  children: ReactNode;
};

export function AdminFilterBar({ children }: AdminFilterBarProps) {
  return (
    <Card className="mb-6 min-w-0">
      <CardContent className="p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">{children}</div>
      </CardContent>
    </Card>
  );
}
