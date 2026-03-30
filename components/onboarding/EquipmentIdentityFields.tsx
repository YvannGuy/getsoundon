"use client";

import { useEffect, useMemo, useRef, type FC } from "react";
import { useForm, useWatch } from "react-hook-form";

import { EquipmentCombobox, type EquipmentComboOption } from "@/components/onboarding/equipment-combobox";
import { Input } from "@/components/ui/input";
import {
  categoryIdToGearField,
  getBrands,
  getModels,
  getSubcategories,
  resolveBrandDisplay,
  resolveModelDisplay,
} from "@/lib/equipment/equipment.helpers";
import { getAllEquipmentCategories } from "@/lib/equipment/equipment-catalog";
import type { EquipmentCategoryId, WizardEquipmentFields } from "@/lib/equipment/equipment.types";
import { OTHER_KEY } from "@/lib/equipment/equipment.types";

export type EquipmentFieldLabel = FC<{ label: string; hint: string }>;

type Props = {
  data: WizardEquipmentFields & Record<string, unknown>;
  updateData: (u: Partial<WizardEquipmentFields>) => void;
  Label: EquipmentFieldLabel;
};

type FormValues = {
  eqCategoryId: EquipmentCategoryId | "";
  eqSubcategoryId: string;
  eqBrandKey: string;
  eqModelKey: string;
  eqCustomBrand: string;
  eqCustomModel: string;
};

export function EquipmentIdentityFields({ data, updateData, Label }: Props) {
  const form = useForm<FormValues>({
    defaultValues: {
      eqCategoryId: data.eqCategoryId,
      eqSubcategoryId: data.eqSubcategoryId,
      eqBrandKey: data.eqBrandKey,
      eqModelKey: data.eqModelKey,
      eqCustomBrand: data.eqCustomBrand,
      eqCustomModel: data.eqCustomModel,
    },
  });

  // Sync external draft restore → form.
  useEffect(() => {
    form.reset({
      eqCategoryId: data.eqCategoryId,
      eqSubcategoryId: data.eqSubcategoryId,
      eqBrandKey: data.eqBrandKey,
      eqModelKey: data.eqModelKey,
      eqCustomBrand: data.eqCustomBrand,
      eqCustomModel: data.eqCustomModel,
    });
  }, [data.eqCategoryId, data.eqSubcategoryId, data.eqBrandKey, data.eqModelKey, data.eqCustomBrand, data.eqCustomModel, form]);

  const prevVals = useRef<FormValues | null>(null);
  const sync = (vals: FormValues) => {
    const cid = vals.eqCategoryId as EquipmentCategoryId | "";
    const gearCategoryField = cid ? categoryIdToGearField(cid) : "son";
    const brandDisplay = cid && vals.eqSubcategoryId
      ? resolveBrandDisplay(cid, vals.eqSubcategoryId, vals.eqBrandKey, vals.eqCustomBrand)
      : vals.eqBrandKey;
    const modelDisplay = cid && vals.eqSubcategoryId
      ? resolveModelDisplay(cid, vals.eqSubcategoryId, vals.eqBrandKey, vals.eqModelKey, vals.eqCustomModel)
      : vals.eqModelKey;
    updateData({
      ...vals,
      gearCategoryField,
      gearBrand: brandDisplay ?? "",
      gearModel: modelDisplay ?? "",
    });
  };

  // Watch and apply reset logic with RHF semantics.
  const watchAll = useWatch({ control: form.control }) as FormValues;
  useEffect(() => {
    const prev = prevVals.current;
    prevVals.current = watchAll;
    if (!prev) {
      sync(watchAll);
      return;
    }
    // Category change -> reset subcat/brand/model/custom
    if (prev.eqCategoryId !== watchAll.eqCategoryId) {
      form.setValue("eqSubcategoryId", "");
      form.setValue("eqBrandKey", "");
      form.setValue("eqModelKey", "");
      form.setValue("eqCustomBrand", "");
      form.setValue("eqCustomModel", "");
      sync({ ...watchAll, eqSubcategoryId: "", eqBrandKey: "", eqModelKey: "", eqCustomBrand: "", eqCustomModel: "" });
      return;
    }
    // Subcategory change -> reset brand/model/custom
    if (prev.eqSubcategoryId !== watchAll.eqSubcategoryId) {
      form.setValue("eqBrandKey", "");
      form.setValue("eqModelKey", "");
      form.setValue("eqCustomBrand", "");
      form.setValue("eqCustomModel", "");
      sync({ ...watchAll, eqBrandKey: "", eqModelKey: "", eqCustomBrand: "", eqCustomModel: "" });
      return;
    }
    // Brand change -> reset model/customModel
    if (prev.eqBrandKey !== watchAll.eqBrandKey) {
      form.setValue("eqModelKey", "");
      form.setValue("eqCustomModel", "");
      sync({ ...watchAll, eqModelKey: "", eqCustomModel: "" });
      return;
    }
    // Default sync (model/custom edits)
    sync(watchAll);
  }, [watchAll, form]);

  const catId = watchAll.eqCategoryId as EquipmentCategoryId | "";

  const subOptions = useMemo(() => {
    return catId ? getSubcategories(catId) : [];
  }, [catId]);

  const brandOptions: EquipmentComboOption[] = useMemo(() => {
    if (!catId || !watchAll.eqSubcategoryId) return [];
    return getBrands(catId, watchAll.eqSubcategoryId).map((b) => ({
      key: b.value,
      label: b.label,
      popular: b.popular,
    }));
  }, [catId, watchAll.eqSubcategoryId]);

  const modelOptions: EquipmentComboOption[] = useMemo(() => {
    if (!catId || !watchAll.eqSubcategoryId || !watchAll.eqBrandKey || watchAll.eqBrandKey === OTHER_KEY) return [];
    return getModels(catId, watchAll.eqSubcategoryId, watchAll.eqBrandKey).map((m) => ({
      key: m.value,
      label: m.label,
    }));
  }, [catId, watchAll.eqSubcategoryId, watchAll.eqBrandKey]);

  const brandDisplayText =
    watchAll.eqBrandKey === OTHER_KEY
      ? watchAll.eqCustomBrand.trim()
      : watchAll.eqBrandKey && catId && watchAll.eqSubcategoryId
        ? resolveBrandDisplay(catId as EquipmentCategoryId, watchAll.eqSubcategoryId, watchAll.eqBrandKey, "")
        : "";

  const modelDisplayText =
    watchAll.eqModelKey === OTHER_KEY
      ? watchAll.eqCustomModel.trim()
      : watchAll.eqModelKey && catId && watchAll.eqSubcategoryId && watchAll.eqBrandKey
        ? resolveModelDisplay(catId as EquipmentCategoryId, watchAll.eqSubcategoryId, watchAll.eqBrandKey, watchAll.eqModelKey, "")
        : "";

  const subDisabled = !catId;
  const brandDisabled = !catId || !watchAll.eqSubcategoryId;
  const modelDisabled = !catId || !watchAll.eqSubcategoryId || !watchAll.eqBrandKey;

  return (
    <div className="space-y-4">
      <div>
        <Label
          label="Catégorie"
          hint="Famille de matériel (sono, DJ, micros…). Détermine marques et modèles proposés."
        />
        <select
          className="mt-1.5 h-11 w-full rounded-md border border-gs-line bg-white px-3 text-sm"
          value={watchAll.eqCategoryId}
          onChange={(e) => form.setValue("eqCategoryId", e.target.value as EquipmentCategoryId)}
        >
          <option value="">Choisir…</option>
          {getAllEquipmentCategories().map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label
          label="Sous-catégorie"
          hint="Obligatoire pour structurer le catalogue et les futurs filtres. Choisissez « Autre » si besoin."
        />
        <select
          className="mt-1.5 h-11 w-full rounded-md border border-gs-line bg-white px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          disabled={subDisabled}
          value={watchAll.eqSubcategoryId}
          onChange={(e) => form.setValue("eqSubcategoryId", e.target.value)}
        >
          <option value="">{subDisabled ? "Choisissez d’abord une catégorie" : "Choisir…"}</option>
          {subOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label
          label="Marque"
          hint="Recherchez une marque ou utilisez « Autre marque » pour saisie libre."
        />
        <div className="mt-1.5">
          <EquipmentCombobox
            id="eq-brand"
            disabled={brandDisabled}
            placeholder={brandDisabled ? "Choisissez d’abord une catégorie et une sous-catégorie" : "Choisir une marque…"}
            valueKey={watchAll.eqBrandKey}
            displayText={brandDisplayText}
            options={brandOptions}
            onSelect={(key) => form.setValue("eqBrandKey", key)}
            otherRowLabel="Autre marque — saisie manuelle"
            onAdoptQueryAsCustom={(query) => {
              form.setValue("eqBrandKey", OTHER_KEY);
              form.setValue("eqCustomBrand", query);
              form.setValue("eqModelKey", "");
              form.setValue("eqCustomModel", "");
            }}
          />
        </div>
        {watchAll.eqBrandKey === OTHER_KEY ? (
          <Input
            className="mt-2 border-gs-line"
            placeholder="Nom de la marque"
            value={watchAll.eqCustomBrand}
            onChange={(e) => form.setValue("eqCustomBrand", e.target.value)}
          />
        ) : null}
      </div>

      <div>
        <Label
          label="Modèle"
          hint="Référence précise ; « Autre modèle » si elle n’apparaît pas dans la liste."
        />
        <div className="mt-1.5">
          <EquipmentCombobox
            id="eq-model"
            disabled={modelDisabled}
            placeholder={
              modelDisabled
                ? !watchAll.eqBrandKey
                  ? "Choisissez d’abord une marque"
                  : "Choisissez d’abord une catégorie et une sous-catégorie"
                : "Choisir un modèle…"
            }
            valueKey={watchAll.eqModelKey}
            displayText={modelDisplayText}
            options={modelOptions}
            onSelect={(key) => form.setValue("eqModelKey", key)}
            otherRowLabel="Autre modèle — saisie manuelle"
            onAdoptQueryAsCustom={(query) => {
              form.setValue("eqModelKey", OTHER_KEY);
              form.setValue("eqCustomModel", query);
            }}
          />
        </div>
        {watchAll.eqModelKey === OTHER_KEY ? (
          <Input
            className="mt-2 border-gs-line"
            placeholder="Référence ou nom du modèle"
            value={watchAll.eqCustomModel}
            onChange={(e) => form.setValue("eqCustomModel", e.target.value)}
          />
        ) : null}
      </div>
    </div>
  );
}
