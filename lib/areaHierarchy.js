/**
 * Area & Facility Hierarchy Configuration for SIKA PHE WMO
 * 5 Area:
 * 1. ORF (1 layout)
 * 2. WEST: LQ (1), CPP 1 (3), CPP 2 (3), NUI (8) -> 15 layouts
 * 3. EAST: PPP (3), AW (3), NUI (2) -> 8 layouts
 * 4. FSO Abherka (4 layouts)
 * 5. LSB (1 layout)
 * Total: 29 Layout Drawings
 */

export const AREA_HIERARCHY = {
  ORF: {
    id: "ORF",
    name: "ORF",
    fullName: "Onshore Receiving Facility",
    description: "Fasilitas penerimaan dan pemrosesan gas onshore di Madura",
    icon: "🏭",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    themeClass: "from-blue-600 to-blue-800",
    facilities: {
      ORF: {
        id: "ORF",
        name: "ORF Facility",
        decks: {
          DEFAULT: {
            id: "DEFAULT",
            name: "Layout Denah ORF",
            shortName: "Main Layout",
            image: "/images/layout-orf.png",
            layoutId: "orf_default"
          }
        }
      }
    }
  },
  WEST: {
    id: "WEST",
    name: "WEST",
    fullName: "West Offshore Area",
    description: "Wilayah operasi offshore barat (LQ, CPP 1, CPP 2, NUI)",
    icon: "⚡",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    themeClass: "from-emerald-600 to-emerald-800",
    facilities: {
      LQ: {
        id: "LQ",
        name: "LQ (Living Quarters)",
        decks: {
          DEFAULT: {
            id: "DEFAULT",
            name: "Living Quarters Layout",
            shortName: "LQ Layout",
            image: "/images/layouts/west/lq/layout.png",
            layoutId: "west_lq_default"
          }
        }
      },
      CPP1: {
        id: "CPP1",
        name: "CPP 1",
        fullName: "Central Processing Platform 1",
        decks: {
          MAIN: {
            id: "MAIN",
            name: "Main Deck",
            shortName: "Main Deck",
            image: "/images/layouts/west/cpp1/main-deck.png",
            layoutId: "west_cpp1_main"
          },
          CELLAR: {
            id: "CELLAR",
            name: "Cellar Deck",
            shortName: "Cellar Deck",
            image: "/images/layouts/west/cpp1/cellar-deck.png",
            layoutId: "west_cpp1_cellar"
          },
          SUB_CELLAR: {
            id: "SUB_CELLAR",
            name: "Sub Cellar Deck",
            shortName: "Sub Cellar",
            image: "/images/layouts/west/cpp1/sub-cellar-deck.png",
            layoutId: "west_cpp1_sub_cellar"
          }
        }
      },
      CPP2: {
        id: "CPP2",
        name: "CPP 2",
        fullName: "Central Processing Platform 2",
        decks: {
          MAIN: {
            id: "MAIN",
            name: "Main Deck",
            shortName: "Main Deck",
            image: "/images/layouts/west/cpp2/main-deck.png",
            layoutId: "west_cpp2_main"
          },
          CELLAR: {
            id: "CELLAR",
            name: "Cellar Deck",
            shortName: "Cellar Deck",
            image: "/images/layouts/west/cpp2/cellar-deck.png",
            layoutId: "west_cpp2_cellar"
          },
          SUB_CELLAR: {
            id: "SUB_CELLAR",
            name: "Sub Cellar Deck",
            shortName: "Sub Cellar",
            image: "/images/layouts/west/cpp2/sub-cellar-deck.png",
            layoutId: "west_cpp2_sub_cellar"
          }
        }
      },
      NUI: {
        id: "NUI",
        name: "NUI (Normally Unattended)",
        fullName: "NUI Platforms West",
        decks: {
          PHE12: {
            id: "PHE12",
            name: "PHE-12 Platform",
            shortName: "PHE-12",
            image: "/images/layouts/west/nui/phe12.png",
            layoutId: "west_nui_phe12"
          },
          PHE24: {
            id: "PHE24",
            name: "PHE-24 Platform",
            shortName: "PHE-24",
            image: "/images/layouts/west/nui/phe24.png",
            layoutId: "west_nui_phe24"
          },
          PHE32: {
            id: "PHE32",
            name: "PHE-32 Platform",
            shortName: "PHE-32",
            image: "/images/layouts/west/nui/phe32.png",
            layoutId: "west_nui_phe32"
          },
          PHE40: {
            id: "PHE40",
            name: "PHE-40 Platform",
            shortName: "PHE-40",
            image: "/images/layouts/west/nui/phe40.png",
            layoutId: "west_nui_phe40"
          },
          PHE38A: {
            id: "PHE38A",
            name: "PHE-38A Platform",
            shortName: "PHE-38A",
            image: "/images/layouts/west/nui/phe38a.png",
            layoutId: "west_nui_phe38a"
          },
          PHE38B: {
            id: "PHE38B",
            name: "PHE-38B Platform",
            shortName: "PHE-38B",
            image: "/images/layouts/west/nui/phe38b.png",
            layoutId: "west_nui_phe38b"
          },
          PHE39: {
            id: "PHE39",
            name: "PHE-39 Platform",
            shortName: "PHE-39",
            image: "/images/layouts/west/nui/phe39.png",
            layoutId: "west_nui_phe39"
          },
          PHE54: {
            id: "PHE54",
            name: "PHE-54 Platform",
            shortName: "PHE-54",
            image: "/images/layouts/west/nui/phe54.png",
            layoutId: "west_nui_phe54"
          }
        }
      }
    }
  },
  EAST: {
    id: "EAST",
    name: "EAST",
    fullName: "East Offshore Area",
    description: "Wilayah operasi offshore timur (PPP, AW, NUI)",
    icon: "🌊",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    themeClass: "from-amber-600 to-amber-800",
    facilities: {
      PPP: {
        id: "PPP",
        name: "PPP",
        fullName: "Poleng Processing Platform",
        decks: {
          MAIN: {
            id: "MAIN",
            name: "Main Deck",
            shortName: "Main Deck",
            image: "/images/layouts/east/ppp/main-deck.png",
            layoutId: "east_ppp_main"
          },
          CELLAR: {
            id: "CELLAR",
            name: "Cellar Deck",
            shortName: "Cellar Deck",
            image: "/images/layouts/east/ppp/cellar-deck.png",
            layoutId: "east_ppp_cellar"
          },
          SUB_CELLAR: {
            id: "SUB_CELLAR",
            name: "Sub Cellar Deck",
            shortName: "Sub Cellar",
            image: "/images/layouts/east/ppp/sub-cellar-deck.png",
            layoutId: "east_ppp_sub_cellar"
          }
        }
      },
      AW: {
        id: "AW",
        name: "AW",
        fullName: "AW Platform",
        decks: {
          MAIN: {
            id: "MAIN",
            name: "Main Deck",
            shortName: "Main Deck",
            image: "/images/layouts/east/aw/main-deck.png",
            layoutId: "east_aw_main"
          },
          CELLAR: {
            id: "CELLAR",
            name: "Cellar Deck",
            shortName: "Cellar Deck",
            image: "/images/layouts/east/aw/cellar-deck.png",
            layoutId: "east_aw_cellar"
          },
          SUB_CELLAR: {
            id: "SUB_CELLAR",
            name: "Sub Cellar Deck",
            shortName: "Sub Cellar",
            image: "/images/layouts/east/aw/sub-cellar-deck.png",
            layoutId: "east_aw_sub_cellar"
          }
        }
      },
      NUI: {
        id: "NUI",
        name: "NUI (Normally Unattended)",
        fullName: "NUI Platforms East",
        decks: {
          PHE12: {
            id: "PHE12",
            name: "PHE-12 Platform",
            shortName: "PHE-12",
            image: "/images/layouts/east/nui/phe12.png",
            layoutId: "east_nui_phe12"
          },
          PHE30: {
            id: "PHE30",
            name: "PHE-30 Platform",
            shortName: "PHE-30",
            image: "/images/layouts/east/nui/phe30.png",
            layoutId: "east_nui_phe30"
          }
        }
      }
    }
  },
  FSO: {
    id: "FSO",
    name: "FSO Abherka",
    fullName: "FSO Abherka (Floating Storage & Offloading)",
    description: "Fasilitas kapal penampung & penyalur minyak terapung",
    icon: "🚢",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    themeClass: "from-indigo-600 to-indigo-800",
    facilities: {
      ABHERKA: {
        id: "ABHERKA",
        name: "FSO Abherka",
        decks: {
          TANK_PLAN: {
            id: "TANK_PLAN",
            name: "Tank Plan",
            shortName: "Tank Plan",
            image: "/images/layouts/fso/tank-plan.png",
            layoutId: "fso_tank_plan"
          },
          MAIN_FLOOR: {
            id: "MAIN_FLOOR",
            name: "Main Floor",
            shortName: "Main Floor",
            image: "/images/layouts/fso/main-floor.png",
            layoutId: "fso_main_floor"
          },
          LOWER_ENGINE: {
            id: "LOWER_ENGINE",
            name: "Lower Engine Plant",
            shortName: "Lower Engine",
            image: "/images/layouts/fso/lower-engine-plant.png",
            layoutId: "fso_lower_engine"
          },
          UPPER_ENGINE: {
            id: "UPPER_ENGINE",
            name: "Upper Engine Plant",
            shortName: "Upper Engine",
            image: "/images/layouts/fso/upper-engine-plant.png",
            layoutId: "fso_upper_engine"
          }
        }
      }
    }
  },
  LSB: {
    id: "LSB",
    name: "LSB",
    fullName: "Logistic Supply Base",
    description: "Pangkalan logistik, dermaga & pergudangan operasional",
    icon: "⚓",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    themeClass: "from-purple-600 to-purple-800",
    facilities: {
      LSB: {
        id: "LSB",
        name: "LSB Shorebase",
        decks: {
          DEFAULT: {
            id: "DEFAULT",
            name: "Layout Denah LSB",
            shortName: "LSB Layout",
            image: "/images/layouts/lsb/layout.png",
            layoutId: "lsb_default"
          }
        }
      }
    }
  }
};

/**
 * Mendapatkan daftar semua area utama
 */
export const getAreaList = () => Object.values(AREA_HIERARCHY);

/**
 * Mendapatkan daftar fasilitas dari area tertentu
 */
export const getFacilitiesByArea = (areaId) => {
  if (!areaId || !AREA_HIERARCHY[areaId]) return [];
  return Object.values(AREA_HIERARCHY[areaId].facilities || {});
};

/**
 * Mendapatkan daftar deck/platform dari area & fasilitas tertentu
 */
export const getDecksByFacility = (areaId, facilityId) => {
  const facilities = AREA_HIERARCHY[areaId]?.facilities;
  if (!facilities || !facilities[facilityId]) return [];
  return Object.values(facilities[facilityId].decks || {});
};

/**
 * Mencari layout berdasarkan area, fasilitas, dan deck
 */
export const getLayout = (areaId, facilityId, deckId) => {
  if (!areaId) return null;
  const area = AREA_HIERARCHY[areaId];
  if (!area) return null;

  const fac = facilityId ? area.facilities?.[facilityId] : Object.values(area.facilities || {})[0];
  if (!fac) return null;

  const deck = deckId ? fac.decks?.[deckId] : Object.values(fac.decks || {})[0];
  if (!deck) return null;

  return {
    ...deck,
    areaId: area.id,
    areaName: area.name,
    facilityId: fac.id,
    facilityName: fac.name,
    deckId: deck.id,
    deckName: deck.name,
  };
};

/**
 * Mencari layout berdasarkan layoutId unik (misal: 'west_cpp1_main')
 */
export const getLayoutById = (layoutId) => {
  if (!layoutId) return null;
  for (const area of Object.values(AREA_HIERARCHY)) {
    for (const fac of Object.values(area.facilities || {})) {
      for (const deck of Object.values(fac.decks || {})) {
        if (deck.layoutId === layoutId) {
          return {
            ...deck,
            areaId: area.id,
            areaName: area.name,
            facilityId: fac.id,
            facilityName: fac.name,
            deckId: deck.id,
            deckName: deck.name,
          };
        }
      }
    }
  }
  return null;
};

/**
 * Format string lokasi lengkap yang rapi dan konsisten
 * Contoh: "WEST - CPP 1 (Main Deck)" atau "ORF" atau "FSO Abherka (Tank Plan)"
 */
export const formatLocationPath = (areaId, facilityId, deckId) => {
  if (!areaId) return "ORF";
  const area = AREA_HIERARCHY[areaId];
  if (!area) return areaId;

  // Jika area hanya punya 1 fasilitas & 1 deck (seperti ORF atau LSB)
  const facList = Object.values(area.facilities || {});
  if (facList.length === 1 && Object.values(facList[0].decks || {}).length === 1) {
    return area.name;
  }

  const fac = area.facilities?.[facilityId];
  const deck = fac?.decks?.[deckId];

  // Untuk FSO (karena fasilitasnya langsung Abherka, tampilkan Deck)
  if (areaId === "FSO") {
    return deck ? `FSO Abherka - ${deck.name}` : "FSO Abherka";
  }

  // Untuk area dengan fasilitas & deck
  if (fac && deck) {
    if (deck.id === "DEFAULT") {
      return `${area.name} - ${fac.name}`;
    }
    return `${area.name} - ${fac.name} (${deck.name})`;
  }

  if (fac) return `${area.name} - ${fac.name}`;
  return area.name;
};

/**
 * Mengambil semua 29 layout secara flat array
 */
export const getAllLayouts = () => {
  const layouts = [];
  for (const area of Object.values(AREA_HIERARCHY)) {
    for (const fac of Object.values(area.facilities || {})) {
      for (const deck of Object.values(fac.decks || {})) {
        layouts.push({
          ...deck,
          areaId: area.id,
          areaName: area.name,
          facilityId: fac.id,
          facilityName: fac.name,
          deckId: deck.id,
          deckName: deck.name,
          formattedLocation: formatLocationPath(area.id, fac.id, deck.id)
        });
      }
    }
  }
  return layouts;
};

/**
 * Parsing data lokasi permit untuk mencocokkan ke layoutId tertentu
 */
export const parseLocationFromPermit = (permit) => {
  if (!permit) return { areaId: "ORF", facilityId: "ORF", deckId: "DEFAULT", layoutId: "orf_default" };
  
  const rawArea = permit.areaName || "ORF";
  const areaKey = Object.keys(AREA_HIERARCHY).find(
    k => k.toLowerCase() === rawArea.toLowerCase()
  ) || "ORF";

  // Cek apakah koordinat menyimpan layoutId
  if (permit.coordinates) {
    try {
      const parsed = JSON.parse(permit.coordinates);
      if (parsed.layoutId) {
        const found = getLayoutById(parsed.layoutId);
        if (found) return found;
      }
      if (parsed.facility && parsed.deck) {
        const found = getLayout(areaKey, parsed.facility, parsed.deck);
        if (found) return found;
      }
    } catch {}
  }

  // Cek dari string workLocation
  const loc = (permit.workLocation || "").toUpperCase();
  const area = AREA_HIERARCHY[areaKey] || AREA_HIERARCHY.ORF;

  for (const fac of Object.values(area.facilities || {})) {
    if (loc.includes(fac.id) || loc.includes(fac.name.toUpperCase())) {
      for (const deck of Object.values(fac.decks || {})) {
        if (
          loc.includes(deck.id) ||
          loc.includes(deck.shortName.toUpperCase()) ||
          loc.includes(deck.name.toUpperCase())
        ) {
          return {
            ...deck,
            areaId: area.id,
            areaName: area.name,
            facilityId: fac.id,
            facilityName: fac.name,
            deckId: deck.id,
            deckName: deck.name,
          };
        }
      }
      // Jika fasilitas cocok tapi deck belum spesifik, default ke deck pertama
      const firstDeck = Object.values(fac.decks || {})[0];
      if (firstDeck) {
        return {
          ...firstDeck,
          areaId: area.id,
          areaName: area.name,
          facilityId: fac.id,
          facilityName: fac.name,
          deckId: firstDeck.id,
          deckName: firstDeck.name,
        };
      }
    }
  }

  // Fallback ke fasilitas & deck pertama di area tersebut
  const firstFac = Object.values(area.facilities || {})[0];
  const firstDeck = firstFac ? Object.values(firstFac.decks || {})[0] : null;

  return {
    layoutId: firstDeck?.layoutId || `${areaKey.toLowerCase()}_default`,
    areaId: area.id,
    areaName: area.name,
    facilityId: firstFac?.id || "DEFAULT",
    facilityName: firstFac?.name || area.name,
    deckId: firstDeck?.id || "DEFAULT",
    deckName: firstDeck?.name || "Main Layout",
    image: firstDeck?.image || "/images/layout-orf.png"
  };
};
