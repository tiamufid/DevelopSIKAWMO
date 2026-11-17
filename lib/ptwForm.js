// Field yang tercetak di lembar PTW Pertamina (depan).
// Disimpan di kolom gas_measurement supaya tidak perlu migrasi skema.

export const CRITICAL_ACTIVITIES = [
  { key: "working_at_height", label: "Working at height" },
  { key: "critical_lift", label: "Critical lift" },
  { key: "ground_disturbance", label: "Ground disturbance" },
  { key: "diving_operation", label: "Diving operation" },
  { key: "live_electrical", label: "Working with live/high risk electrical" },
  { key: "radioactive", label: "Pekerjaan radioaktif" },
  { key: "abrasive_blasting", label: "Abrasive blasting" },
  { key: "over_the_side", label: "Over the side work" },
  { key: "pressurized_system", label: "Working on pressurized system" },
  { key: "explosive", label: "Bekerja dgn peledak" },
  { key: "other", label: "Lain-lain (sebutkan)" },
];

export const GAS_TYPES = [
  { key: "lel", label: "LEL" },
  { key: "o2", label: "O₂" },
  { key: "h2s", label: "H₂S" },
  { key: "co", label: "CO" },
  { key: "voc", label: "VOC" },
  { key: "benzene", label: "Benzene" },
  { key: "so2", label: "SO₂" },
  { key: "co2", label: "CO₂" },
];

export const DOC_LEFT = [
  { key: "ra", label: "Risk Assessment (RA)", placeholder: "Nomor dokumen RA" },
  { key: "jsa", label: "JSA", placeholder: "Nomor dokumen JSA" },
  { key: "icc", label: "ICC", placeholder: "Nomor ICC" },
  { key: "csep", label: "CSEP", placeholder: "Nomor CSEP" },
  { key: "sdiSldkb", label: "SDS/LDKB", placeholder: "Nomor SDS/LDKB" },
  { key: "swc", label: "SWC", placeholder: "Nomor SWC" },
  { key: "other", label: "Lain-lain", placeholder: "Nomor dokumen lain" },
];

export const DOC_RIGHT = [
  { key: "workProcedure", label: "Prosedur kerja", placeholder: "Nomor prosedur kerja" },
  { key: "excavationCert", label: "Excavation certificate", placeholder: "Nomor excavation certificate" },
  { key: "liftingPlan", label: "Lifting plan", placeholder: "Nomor lifting plan" },
  { key: "rp3k", label: "RP3K", placeholder: "Nomor RP3K" },
  { key: "gasTestRecord", label: "Gas test record", placeholder: "Nomor gas test record" },
  { key: "dispensasi", label: "Persetujuan dispensasi", placeholder: "Nomor persetujuan dispensasi" },
];

export const DOCUMENT_TYPES = [...DOC_LEFT, ...DOC_RIGHT];

export function normalizeOtherDocumentEntries(document) {
  const entries = Array.isArray(document?.entries) && document.entries.length > 0
    ? document.entries
    : [{ description: document?.description, number: document?.number }];

  return entries.map((entry) => ({
    description: String(entry?.description || ""),
    number: String(entry?.number || ""),
  }));
}

export function emptyGasMeasurement() {
  return {
    initial: false,
    continuous: false,
    periodic: false,
    periodicInterval: "",
    gases: { lel: false, o2: false, h2s: false, co: false, voc: false, benzene: false, so2: false, co2: false },
    otherGas: "",
    criticalActivities: [],
    criticalOther: "",
    remoteMode: null,
  };
}

export function normalizeGasMeasurement(raw) {
  const defaults = emptyGasMeasurement();
  if (!raw) return defaults;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      ...defaults,
      ...parsed,
      gases: { ...defaults.gases, ...(parsed.gases || {}) },
      otherGas: parsed.otherGas || "",
      criticalActivities: Array.isArray(parsed.criticalActivities) ? parsed.criticalActivities : [],
      criticalOther: parsed.criticalOther || "",
      remoteMode: parsed.remoteMode === true ? true : parsed.remoteMode === false ? false : null,
    };
  } catch {
    return defaults;
  }
}

export function durationText(start, end) {
  if (!start || !end) return "";
  const ms = new Date(end) - new Date(start);
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0 && hours > 0) return `${days} hari ${hours} jam`;
  if (days > 0) return `${days} hari`;
  return `${hours} jam`;
}
