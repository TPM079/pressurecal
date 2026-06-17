import type { SavedSetup } from "../hooks/useSavedSetups";

export type SavedSetupHoseDisplay = {
  isSplit: boolean;
  heading: string;
  value: string;
  detailLines: string[];
  compactValue: string;
  comparisonValue: string;
};

function toFiniteNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number | null | undefined, decimals = 2) {
  const numberValue = toFiniteNumber(value);

  if (numberValue === null) {
    return "—";
  }

  return numberValue.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatLength(value: number | null | undefined, unit: string) {
  return `${formatNumber(value, 1)} ${unit}`;
}

function formatHoseId(value: number | null | undefined, unit: string) {
  return `${formatNumber(value, unit === "in" ? 3 : 2)} ${unit}`;
}

export function getSavedSetupHoseDisplay(setup: SavedSetup): SavedSetupHoseDisplay {
  const lengthUnit = setup.hoseLengthUnit ?? "m";
  const idUnit = setup.hoseIdUnit ?? "mm";
  const isSplit = setup.hoseSetupMode === "mainLeader";

  if (!isSplit) {
    const value = `${formatLength(setup.hoseLength, lengthUnit)} · ${formatHoseId(
      setup.hoseId,
      idUnit
    )}`;

    return {
      isSplit: false,
      heading: "Single hose",
      value,
      detailLines: [value],
      compactValue: value,
      comparisonValue: value,
    };
  }

  const mainLength = toFiniteNumber(setup.mainHoseLength) ?? toFiniteNumber(setup.hoseLength);
  const leaderLength = toFiniteNumber(setup.leaderHoseLength);
  const totalLength =
    mainLength !== null && leaderLength !== null ? mainLength + leaderLength : null;

  const mainId = toFiniteNumber(setup.mainHoseId) ?? toFiniteNumber(setup.hoseId);
  const leaderId = toFiniteNumber(setup.leaderHoseId);

  const totalLine = `Total: ${formatLength(totalLength, lengthUnit)}`;
  const mainLine = `Main: ${formatLength(mainLength, lengthUnit)} · ${formatHoseId(
    mainId,
    idUnit
  )}`;
  const leaderLine = `Leader: ${formatLength(leaderLength, lengthUnit)} · ${formatHoseId(
    leaderId,
    idUnit
  )}`;

  return {
    isSplit: true,
    heading: "Main + Leader",
    value: "Main + Leader",
    detailLines: [totalLine, mainLine, leaderLine],
    compactValue: `Main + Leader · ${totalLine}`,
    comparisonValue: `Main + Leader · ${totalLine} · ${mainLine} · ${leaderLine}`,
  };
}
