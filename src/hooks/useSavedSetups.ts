import { useCallback, useEffect, useMemo, useState } from "react";

export type SavedSetup = {
  id: string;
  userId: string;
  name: string;
  notes: string | null;
  machinePsi: number | null;
  machineLpm: number | null;
  hoseLengthM: number | null;
  hoseIdMm: number | null;
  nozzleSize: string | null;
  createdAt: string;
  updatedAt: string;
};

type SaveSetupInput = {
  id?: string;
  name: string;
  notes?: string | null;
  machinePsi?: number | null;
  machineLpm?: number | null;
  hoseLengthM?: number | null;
  hoseIdMm?: number | null;
  nozzleSize?: string | null;
};

function buildStorageKey(userId: string) {
  return `pressurecal:saved-setups:${userId}`;
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `setup_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useSavedSetups(userId: string | null) {
  const [setups, setSetups] = useState<SavedSetup[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!userId) {
      setSetups([]);
      setIsReady(true);
      return;
    }

    const storageKey = buildStorageKey(userId);

    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as SavedSetup[]) : [];
      setSetups(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error(error);
      setSetups([]);
    }

    setIsReady(true);
  }, [userId]);

  const persist = useCallback(
    (nextSetups: SavedSetup[]) => {
      setSetups(nextSetups);

      if (!userId) {
        return;
      }

      window.localStorage.setItem(buildStorageKey(userId), JSON.stringify(nextSetups));
    },
    [userId]
  );

  const saveSetup = useCallback(
    (input: SaveSetupInput) => {
      if (!userId) {
        throw new Error("Cannot save setup without a signed-in user.");
      }

      const timestamp = new Date().toISOString();

      const existing = input.id ? setups.find((setup) => setup.id === input.id) : null;

      const nextSetup: SavedSetup = {
        id: existing?.id ?? makeId(),
        userId,
        name: input.name,
        notes: input.notes ?? null,
        machinePsi: input.machinePsi ?? null,
        machineLpm: input.machineLpm ?? null,
        hoseLengthM: input.hoseLengthM ?? null,
        hoseIdMm: input.hoseIdMm ?? null,
        nozzleSize: input.nozzleSize ?? null,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };

      const nextSetups = existing
        ? setups.map((setup) => (setup.id === existing.id ? nextSetup : setup))
        : [nextSetup, ...setups];

      persist(nextSetups);
      return nextSetup;
    },
    [persist, setups, userId]
  );

  const deleteSetup = useCallback(
    (setupId: string) => {
      persist(setups.filter((setup) => setup.id !== setupId));
    },
    [persist, setups]
  );

  const duplicateSetup = useCallback(
    (setupId: string) => {
      const source = setups.find((setup) => setup.id === setupId);

      if (!source || !userId) {
        return null;
      }

      const timestamp = new Date().toISOString();
      const copy: SavedSetup = {
        ...source,
        id: makeId(),
        name: `${source.name} (copy)`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      persist([copy, ...setups]);
      return copy;
    },
    [persist, setups, userId]
  );

  const getSetupById = useCallback(
    (setupId: string) => setups.find((setup) => setup.id === setupId) ?? null,
    [setups]
  );

  return useMemo(
    () => ({
      setups,
      isReady,
      saveSetup,
      deleteSetup,
      duplicateSetup,
      getSetupById,
    }),
    [deleteSetup, duplicateSetup, getSetupById, isReady, saveSetup, setups]
  );
}
