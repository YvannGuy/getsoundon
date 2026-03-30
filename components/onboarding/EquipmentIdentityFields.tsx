"use client";

import { useMemo, type FC } from "react";

import { Input } from "@/components/ui/input";
import { EquipmentCombobox, type EquipmentComboOption } from "@/components/onboarding/equipment-combobox";
import { getEquipmentCategory, getAllEquipmentCategories } from "@/lib/equipment/equipment-catalog";
import {
  categoryIdToGearField,
  resolveBrandDisplay,
  resolveModelDisplay,
} from "@/lib/equipment/equipment.helpers";
import type { EquipmentCategoryId, WizardEquipmentFields } from "@/lib/equipment/equipment.types";
import { OTHER_KEY } from "@/lib/equipment/equipment.types";

export type EquipmentFieldLabel = FC<{ label: string; hint: string }>;

type Props = {
  data: WizardEquipmentFields & Record<string, unknown>;
  updateData: (u: Partial<WizardEquipmentFields>) => void;
  Label: EquipmentFieldLabel;
};

export function EquipmentIdentityFields({ data, updateData, Label }: Props) {
  const catId = data.eqCategoryId as EquipmentCategoryId | "";
  const cat = catId ? getEquipmentCategory(catId) : undefined;

  const brandOptions: EquipmentComboOption[] = useMemo(() => {
    if (!cat) return [];
    return cat.brands.map((b) => ({ key: b.id, label: b.label, popular: b.popular }));
  }, [cat]);

  const modelOptions: EquipmentComboOption[] = useMemo(() => {
    if (!cat || !data.eqBrandKey || data.eqBrandKey === OTHER_KEY) return [];
    const br = cat.brands.find((b) => b.id === data.eqBrandKey);
    if (!br) return [];
    return br.models.map((m) => ({ key: m.id, label: m.label, popular: m.popular }));
  }, [cat, data.eqBrandKey]);

  const brandDisplayText =
    data.eqBrandKey === OTHER_KEY
      ? data.eqCustomBrand.trim()
        ? data.eqCustomBrand.trim()
        : ""
      : data.eqBrandKey && cat
        ? resolveBrandDisplay(catId as EquipmentCategoryId, data.eqBrandKey, "")
        : "";

  const modelDisplayText =
    data.eqModelKey === OTHER_KEY
      ? data.eqCustomModel.trim()
        ? data.eqCustomModel.trim()
        : ""
      : data.eqModelKey && cat && data.eqBrandKey
        ? resolveModelDisplay(catId as EquipmentCategoryId, data.eqBrandKey, data.eqModelKey, "")
        : "";

  const subDisabled = !catId;
  const brandDisabled = !catId;
  const modelDisabled = !catId || !data.eqBrandKey;

  const applyGearDerived = (patch: Partial<WizardEquipmentFields>) => {
    const next: WizardEquipmentFields = { ...(data as WizardEquipmentFields), ...patch };
    const cid = (next.eqCategoryId || "") as EquipmentCategoryId | "";
    if (!cid) {
      updateData({ ...patch, gearCategoryField: "son", gearBrand: "", gearModel: "" });
      return;
    }
    const gearCategoryField = categoryIdToGearField(cid);
    const brand = resolveBrandDisplay(cid, next.eqBrandKey, next.eqCustomBrand);
    const model = resolveModelDisplay(cid, next.eqBrandKey, next.eqModelKey, next.eqCustomModel);
    updateData({
      ...patch,
      gearCategoryField,
      gearBrand: brand,
      gearModel: model,
    });
  };

  const onCategoryChange = (id: EquipmentCategoryId) => {
    applyGearDerived({
      eqCategoryId: id,
      eqSubcategoryId: "",
      eqBrandKey: "",
      eqModelKey: "",
      eqCustomBrand: "",
      eqCustomModel: "",
    });
  };

  const onSubcategoryChange = (subId: string) => {
    applyGearDerived({ eqSubcategoryId: subId });
  };

  const onBrandSelect = (key: string) => {
    applyGearDerived({
      eqBrandKey: key,
      eqModelKey: "",
      eqCustomModel: "",
      ...(key !== OTHER_KEY ? { eqCustomBrand: "" } : {}),
    });
  };

  const onModelSelect = (key: string) => {
    applyGearDerived({
      eqModelKey: key,
      ...(key !== OTHER_KEY ? { eqCustomModel: "" } : {}),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label
          label="Catégorie"
          hint="Famille de matériel (sono, DJ, micros…). Détermine marques et modèles proposés."
        />
        <select
          className="mt-1.5 h-11 w-full rounded-md border border-gs-line bg-white px-3 text-sm"
          value={catId}
          onChange={(e) => onCategoryChange(e.target.value as EquipmentCategoryId)}
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
          value={data.eqSubcategoryId}
          onChange={(e) => onSubcategoryChange(e.target.value)}
        >
          <option value="">{subDisabled ? "Choisissez d’abord une catégorie" : "Choisir…"}</option>
          {cat?.subcategories.map((s) => (
            <option key={s.id} value={s.id}>
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
            placeholder={brandDisabled ? "Choisissez d’abord une catégorie" : "Choisir une marque…"}
            valueKey={data.eqBrandKey}
            displayText={brandDisplayText}
            options={brandOptions}
            onSelect={onBrandSelect}
            otherRowLabel="Autre marque — saisie manuelle"
            onAdoptQueryAsCustom={(query) => {
              applyGearDerived({
                eqBrandKey: OTHER_KEY,
                eqCustomBrand: query,
                eqModelKey: "",
                eqCustomModel: "",
              });
            }}
          />
        </div>
        {data.eqBrandKey === OTHER_KEY ? (
          <Input
            className="mt-2 border-gs-line"
            placeholder="Nom de la marque"
            value={data.eqCustomBrand}
            onChange={(e) => applyGearDerived({ eqCustomBrand: e.target.value })}
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
                ? !data.eqBrandKey
                  ? "Choisissez d’abord une marque"
                  : "Choisissez d’abord une catégorie"
                : "Choisir un modèle…"
            }
            valueKey={data.eqModelKey}
            displayText={modelDisplayText}
            options={modelOptions}
            onSelect={onModelSelect}
            otherRowLabel="Autre modèle — saisie manuelle"
            onAdoptQueryAsCustom={(query) => {
              applyGearDerived({
                eqModelKey: OTHER_KEY,
                eqCustomModel: query,
              });
            }}
          />
        </div>
        {data.eqModelKey === OTHER_KEY ? (
          <Input
            className="mt-2 border-gs-line"
            placeholder="Référence ou nom du modèle"
            value={data.eqCustomModel}
            onChange={(e) => applyGearDerived({ eqCustomModel: e.target.value })}
          />
        ) : null}
      </div>
    </div>
  );
}
