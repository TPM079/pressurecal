import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSavedSetup,
  deleteSavedSetup as deleteSavedSetupRequest,
  duplicateSavedSetup as duplicateSavedSetupRequest,
  listSavedSetups,
  updateSavedSetup,
  type SaveSavedSetupInput,
  type SavedSetupRecord,
} from "../lib/savedSetups";

type SaveSetupInput = SaveSavedSetupInput & {
  id?: string;
};

type UseSavedSetupsResult = {
  setups: SavedSetupRecord[];
  isLoading: boolean;
  isReady: boolean;
  isMutating: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveSetup: (input: SaveSetupInput) => Promise<SavedSetupRecord>;
  deleteSetup: (setupId: string) => Promise<void>;
  duplicateSetup: (setupId: string) => Promise<SavedSetupRecord>;
  getSetupById: (setupId: string) => SavedSetupRecord | null;
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function useSavedSetups(userId: string | null): UseSavedSetupsResult {
  const [setups, setSetups] = useState<SavedSetupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSetups([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const next = await listSavedSetups(userId);
      setSetups(next);
    } catch (loadError) {
      setError(toErrorMessage(loadError, "Unable to load your saved setups."));
      setSetups([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveSetup = useCallback(
    async (input: SaveSetupInput) => {
      if (!userId) {
        throw new Error("Please sign in before saving setups.");
      }

      setIsMutating(true);
      setError(null);

      try {
        const saved = input.id
          ? await updateSavedSetup(input.id, {
              userId,
              name: input.name,
              notes: input.notes,
              machineLabel: input.machineLabel,
              rigInputs: input.rigInputs,
            })
          : await createSavedSetup({
              userId,
              name: input.name,
              notes: input.notes,
              machineLabel: input.machineLabel,
              rigInputs: input.rigInputs,
            });

        setSetups((current) => {
          const withoutCurrent = current.filter((setup) => setup.id !== saved.id);
          return [saved, ...withoutCurrent];
        });

        return saved;
      } catch (saveError) {
        const message = toErrorMessage(saveError, "Unable to save this setup.");
        setError(message);
        throw new Error(message);
      } finally {
        setIsMutating(false);
      }
    },
    [userId]
  );

  const deleteSetup = useCallback(
    async (setupId: string) => {
      if (!userId) {
        throw new Error("Please sign in before deleting setups.");
      }

      setIsMutating(true);
      setError(null);

      try {
        await deleteSavedSetupRequest(setupId, userId);
        setSetups((current) => current.filter((setup) => setup.id !== setupId));
      } catch (deleteError) {
        const message = toErrorMessage(deleteError, "Unable to delete this setup.");
        setError(message);
        throw new Error(message);
      } finally {
        setIsMutating(false);
      }
    },
    [userId]
  );

  const duplicateSetup = useCallback(
    async (setupId: string) => {
      if (!userId) {
        throw new Error("Please sign in before duplicating setups.");
      }

      setIsMutating(true);
      setError(null);

      try {
        const duplicate = await duplicateSavedSetupRequest(setupId, userId);
        setSetups((current) => [duplicate, ...current]);
        return duplicate;
      } catch (duplicateError) {
        const message = toErrorMessage(duplicateError, "Unable to duplicate this setup.");
        setError(message);
        throw new Error(message);
      } finally {
        setIsMutating(false);
      }
    },
    [userId]
  );

  const getSetupById = useCallback(
    (setupId: string) => setups.find((setup) => setup.id === setupId) ?? null,
    [setups]
  );

  return useMemo(
    () => ({
      setups,
      isLoading,
      isReady: !isLoading,
      isMutating,
      error,
      refresh,
      saveSetup,
      deleteSetup,
      duplicateSetup,
      getSetupById,
    }),
    [deleteSetup, duplicateSetup, error, getSetupById, isLoading, isMutating, refresh, saveSetup, setups]
  );
}
