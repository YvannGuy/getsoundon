"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateConciergeRequestStatus } from "@/app/actions/concierge-admin";

const STATUS_OPTIONS = [
  { value: "new", label: "Nouvelle" },
  { value: "contacted", label: "Contactée" },
  { value: "in_progress", label: "En cours" },
  { value: "resolved", label: "Traité" },
];

export function ConciergeStatusForm({ id, currentStatus }: { id: string; currentStatus: string }) {
  const router = useRouter();

  async function handleChange(value: string) {
    const res = await updateConciergeRequestStatus(id, value);
    if (res.success) router.refresh();
  }

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
