"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Plus, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Salle } from "@/lib/types/salle";
import {
  addSalleLocationBlockedDateAction,
  getSalleLocationBlockedDatesAction,
  removeSalleLocationBlockedDateAction,
  updateSalleOwnerAction,
} from "@/app/actions/proprietaire-salle";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [blockedDateInput, setBlockedDateInput] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [unblockingDate, setUnblockingDate] = useState<string | null>(null);

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
        display_contact_phone: salle.displayContactPhone !== false,
      });
      setImages(salle.images?.length ? [...salle.images] : []);
      setNewFiles([]);
      setNewFilePreviews([]);
      setError(null);
      setBlockedDateInput("");
      setBlocking(false);
      setUnblockingDate(null);
      getSalleLocationBlockedDatesAction(salle.id).then((res) => {
        if (res.success) setBlockedDates(res.dates ?? []);
      });
    }
  }, [salle?.id, open, form, salle]);

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewFilePreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter(
      (f) => ["image/jpeg", "image/png"].includes(f.type) && f.size <= 5 * 1024 * 1024
    );
    const urls = valid.map((f) => URL.createObjectURL(f));
    setNewFiles((prev) => [...prev, ...valid].slice(0, 10));
    setNewFilePreviews((prev) => [...prev, ...urls].slice(0, 10));
    e.target.value = "";
  };

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
    fd.append("images_keep", JSON.stringify(images));
    newFiles.forEach((f) => fd.append("photos", f));

    const result = await updateSalleOwnerAction(fd);
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
      <DialogContent className="mx-4 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto sm:mx-auto" showClose>
        <DialogHeader className="pr-8">
          <DialogTitle>Modifier l&apos;annonce</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Photos</label>
            <div className="flex flex-wrap gap-2">
              {images.map((url, i) => (
                <div key={url + i} className="relative">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                    <Image src={url} alt="" fill className="object-cover" sizes="80px" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {newFiles.map((file, i) => (
                <div key={file.name + i} className="relative">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <Image
                      src={newFilePreviews[i] ?? ""}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {(images.length + newFiles.length) < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-500 hover:border-[#213398] hover:text-black"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-xs">Ajouter</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-slate-500">JPG/PNG, max 5 Mo. Min. 1 photo.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nom</label>
            <Input
              {...form.register("name")}
              className="border-slate-200"
              placeholder="Nom de la salle"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
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
              <p className="text-xs text-red-600">{form.formState.errors.city.message}</p>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium text-slate-700">Adresse</label>
            <Input
              {...form.register("address")}
              className="border-slate-200"
              placeholder="Adresse complète"
            />
            {form.formState.errors.address && (
              <p className="text-xs text-red-600">{form.formState.errors.address.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <label className="text-sm font-medium text-slate-700">Capacité</label>
              <Input
                type="number"
                {...form.register("capacity", { valueAsNumber: true })}
                className="border-slate-200"
                placeholder="50"
              />
              {form.formState.errors.capacity && (
                <p className="text-xs text-red-600">{form.formState.errors.capacity.message}</p>
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-sm font-medium text-slate-700">Prix / jour (€)</label>
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
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              {...form.register("description")}
              rows={4}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Description de la salle"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Téléphone contact</label>
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

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <label className="text-sm font-medium text-slate-700">Calendrier de location</label>
            <p className="text-xs text-slate-500">
              Bloquez ici les dates non disponibles (réservation hors plateforme, indisponibilité, etc.).
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={blockedDateInput}
                onChange={(e) => setBlockedDateInput(e.target.value)}
                className="w-full sm:w-auto"
              />
              <Button
                type="button"
                variant="outline"
                disabled={blocking || !blockedDateInput}
                onClick={async () => {
                  if (!salle) return;
                  setBlocking(true);
                  const date = blockedDateInput;
                  const res = await addSalleLocationBlockedDateAction({ salleId: salle.id, date });
                  setBlocking(false);
                  if (!res.success) {
                    setError(res.error ?? "Impossible de bloquer la date");
                    return;
                  }
                  setBlockedDateInput("");
                  setBlockedDates((prev) =>
                    [...new Set([...prev, date])].sort((a, b) => a.localeCompare(b))
                  );
                }}
              >
                {blocking ? "Blocage..." : "Bloquer la date"}
              </Button>
            </div>
            {blockedDates.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {blockedDates.map((date) => (
                  <button
                    key={`blocked-${date}`}
                    type="button"
                    disabled={unblockingDate === date}
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    onClick={async () => {
                      if (!salle) return;
                      setUnblockingDate(date);
                      const res = await removeSalleLocationBlockedDateAction({
                        salleId: salle.id,
                        date,
                      });
                      setUnblockingDate(null);
                      if (!res.success) {
                        setError(res.error ?? "Impossible de débloquer la date");
                        return;
                      }
                      setBlockedDates((prev) => prev.filter((d) => d !== date));
                    }}
                  >
                    {unblockingDate === date ? "Déblocage..." : `${date} ×`}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Aucune date bloquée.</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-[#213398] hover:bg-[#1a2980]"
              disabled={isPending || (images.length === 0 && newFiles.length === 0)}
            >
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
