"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Salle } from "@/lib/types/salle";
import { updateSalleAction } from "@/app/actions/admin";

const schema = z.object({
  name: z.string().min(2, "Nom trop court"),
  city: z.string().min(2, "Ville requise"),
  address: z.string().min(5, "Adresse requise"),
  capacity: z.number().min(1, "Capacité invalide"),
  price_per_day: z.number().min(1, "Prix invalide"),
  description: z.string(),
  contact_phone: z.string(),
  display_contact_phone: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  salle: Salle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AnnonceEditModal({ salle, open, onOpenChange }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      name: "",
      city: "",
      address: "",
      capacity: 0,
      price_per_day: 0,
      description: "",
      contact_phone: "",
    },
  });

  useEffect(() => {
    if (salle && open) {
      form.reset({
        name: salle.name,
        city: salle.city,
        address: salle.address,
        capacity: salle.capacity,
        price_per_day: salle.pricePerDay,
        description: salle.description ?? "",
        contact_phone: salle.contactPhone ?? "",
      });
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salle?.id, open]);

  if (!salle) return null;

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setIsPending(true);
    const fd = new FormData();
    fd.append("id", salle.id);
    fd.append("name", values.name);
    fd.append("city", values.city);
    fd.append("address", values.address);
    fd.append("capacity", String(values.capacity));
    fd.append("price_per_day", String(values.price_per_day));
    fd.append("description", values.description);
    fd.append("contact_phone", values.contact_phone);
    fd.append("display_contact_phone", values.display_contact_phone ? "1" : "0");
    const result = await updateSalleAction(fd);
    setIsPending(false);
    if (result.success) {
      onOpenChange(false);
      router.refresh();
    } else {
      setError(result.error ?? "Erreur");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" showClose>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;annonce</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nom</label>
            <Input
              {...form.register("name")}
              className="border-slate-200"
              placeholder="Nom de la salle"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Ville</label>
            <Input
              {...form.register("city")}
              className="border-slate-200"
              placeholder="Ville"
            />
            {form.formState.errors.city && (
              <p className="text-xs text-red-600">
                {form.formState.errors.city.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Adresse</label>
            <Input
              {...form.register("address")}
              className="border-slate-200"
              placeholder="Adresse complète"
            />
            {form.formState.errors.address && (
              <p className="text-xs text-red-600">
                {form.formState.errors.address.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Capacité
              </label>
              <Input
                type="number"
                {...form.register("capacity", { valueAsNumber: true })}
                className="border-slate-200"
                placeholder="50"
              />
              {form.formState.errors.capacity && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.capacity.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Prix / jour (€)
              </label>
              <Input
                type="number"
                {...form.register("price_per_day", { valueAsNumber: true })}
                className="border-slate-200"
                placeholder="150"
              />
              {form.formState.errors.price_per_day && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.price_per_day.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              {...form.register("description")}
              rows={4}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Description de la salle"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Téléphone contact
            </label>
            <Input
              {...form.register("contact_phone")}
              className="border-slate-200"
              placeholder="06 12 34 56 78"
            />
            <p className="text-sm font-medium text-slate-600">Afficher « Contactez le propriétaire » avec téléphone ?</p>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={Boolean((form.watch("display_contact_phone") ?? true) === true)}
                  onChange={() => form.setValue("display_contact_phone", true)}
                  className="h-4 w-4"
                />
                <span className="text-sm">Oui</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={Boolean((form.watch("display_contact_phone") ?? true) === false)}
                  onChange={() => form.setValue("display_contact_phone", false)}
                  className="h-4 w-4"
                />
                <span className="text-sm">Non</span>
              </label>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isPending}
            >
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
