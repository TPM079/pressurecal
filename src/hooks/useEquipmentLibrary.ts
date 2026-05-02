import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase-browser";

export type EquipmentType = "machine" | "hose" | "nozzle" | "surface_cleaner" | "gun_lance";

export type EquipmentSpecs = Record<string, string | number | boolean | null>;

export type EquipmentItem = {
  id: string;
  userId: string;
  equipmentType: EquipmentType;
  name: string;
  specs: EquipmentSpecs;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type EquipmentItemInput = {
  equipmentType: EquipmentType;
  name: string;
  specs: EquipmentSpecs;
  notes?: string;
};

type EquipmentItemRow = {
  id: string;
  user_id: string;
  equipment_type: EquipmentType;
  name: string;
  specs: EquipmentSpecs | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type EquipmentQueryResult = {
  data: EquipmentItemRow[] | null;
  error: { message?: string } | null;
};

type EquipmentMutationResult = {
  data: EquipmentItemRow | null;
  error: { message?: string } | null;
};

const NOTES_MAX_CHARS = 600;
const NAME_MAX_CHARS = 120;

function cleanText(value: string, maxChars: number) {
  return value.trim().slice(0, maxChars);
}

function cleanSpecs(specs: EquipmentSpecs) {
  return Object.entries(specs).reduce<EquipmentSpecs>((next, [key, value]) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        next[key] = trimmed;
      }
      return next;
    }

    if (typeof value === "number") {
      if (Number.isFinite(value)) {
        next[key] = value;
      }
      return next;
    }

    if (typeof value === "boolean") {
      next[key] = value;
      return next;
    }

    return next;
  }, {});
}

function mapRow(row: EquipmentItemRow): EquipmentItem {
  return {
    id: row.id,
    userId: row.user_id,
    equipmentType: row.equipment_type,
    name: row.name,
    specs: row.specs ?? {},
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sortEquipmentItems(items: EquipmentItem[]) {
  return [...items].sort((a, b) => {
    const typeCompare = a.equipmentType.localeCompare(b.equipmentType);

    if (typeCompare !== 0) {
      return typeCompare;
    }

    return a.name.localeCompare(b.name);
  });
}

async function getCurrentUserId() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return session?.user?.id ?? null;
}

export function useEquipmentLibrary() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setIsReady(false);
    setError(null);

    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        setItems([]);
        setIsReady(true);
        return;
      }

      const result = (await supabase
        .from("equipment_items")
        .select("id, user_id, equipment_type, name, specs, notes, created_at, updated_at")
        .eq("user_id", userId)
        .order("equipment_type", { ascending: true })
        .order("name", { ascending: true })) as EquipmentQueryResult;

      if (result.error) {
        throw new Error(result.error.message ?? "Unable to load equipment library.");
      }

      setItems(sortEquipmentItems((result.data ?? []).map(mapRow)));
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load equipment library.";
      setError(message);
      setItems([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const countsByType = useMemo(() => {
    return items.reduce<Record<EquipmentType, number>>(
      (counts, item) => {
        counts[item.equipmentType] += 1;
        return counts;
      },
      {
        machine: 0,
        hose: 0,
        nozzle: 0,
        surface_cleaner: 0,
        gun_lance: 0,
      }
    );
  }, [items]);

  const saveItem = useCallback(
    async (input: EquipmentItemInput, existingId?: string | null) => {
      setIsWorking(true);
      setError(null);

      try {
        const userId = await getCurrentUserId();

        if (!userId) {
          throw new Error("Sign in before saving equipment.");
        }

        const name = cleanText(input.name, NAME_MAX_CHARS);

        if (!name) {
          throw new Error("Give this equipment item a name first.");
        }

        const payload = {
          user_id: userId,
          equipment_type: input.equipmentType,
          name,
          specs: cleanSpecs(input.specs),
          notes: cleanText(input.notes ?? "", NOTES_MAX_CHARS) || null,
        };

        const result = existingId
          ? ((await supabase
              .from("equipment_items")
              .update(payload)
              .eq("id", existingId)
              .eq("user_id", userId)
              .select("id, user_id, equipment_type, name, specs, notes, created_at, updated_at")
              .single()) as EquipmentMutationResult)
          : ((await supabase
              .from("equipment_items")
              .insert(payload)
              .select("id, user_id, equipment_type, name, specs, notes, created_at, updated_at")
              .single()) as EquipmentMutationResult);

        if (result.error || !result.data) {
          throw new Error(result.error?.message ?? "Unable to save equipment item.");
        }

        const saved = mapRow(result.data);

        setItems((current) => {
          const withoutCurrent = current.filter((item) => item.id !== saved.id);
          return sortEquipmentItems([...withoutCurrent, saved]);
        });

        return saved;
      } catch (saveError) {
        const message =
          saveError instanceof Error ? saveError.message : "Unable to save equipment item.";
        setError(message);
        throw saveError;
      } finally {
        setIsWorking(false);
      }
    },
    []
  );

  const deleteItem = useCallback(async (itemId: string) => {
    setIsWorking(true);
    setError(null);

    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        throw new Error("Sign in before deleting equipment.");
      }

      const { error } = await supabase
        .from("equipment_items")
        .delete()
        .eq("id", itemId)
        .eq("user_id", userId);

      if (error) {
        throw new Error(error.message);
      }

      setItems((current) => current.filter((item) => item.id !== itemId));
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Unable to delete equipment item.";
      setError(message);
      throw deleteError;
    } finally {
      setIsWorking(false);
    }
  }, []);

  const duplicateItem = useCallback(
    async (itemId: string) => {
      const item = items.find((candidate) => candidate.id === itemId);

      if (!item) {
        throw new Error("Equipment item not found.");
      }

      return saveItem({
        equipmentType: item.equipmentType,
        name: `${item.name} (copy)`,
        specs: item.specs,
        notes: item.notes,
      });
    },
    [items, saveItem]
  );

  return {
    items,
    countsByType,
    isReady,
    isWorking,
    error,
    reload: loadItems,
    saveItem,
    deleteItem,
    duplicateItem,
  };
}
