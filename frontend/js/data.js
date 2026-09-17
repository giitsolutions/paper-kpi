/* ---------------------------------------------------------
   KPI DATA MODEL — Paper Industry benchmarks

   direction: "higher" (bigger = better) or "lower" (smaller = better)

   best / goodEdge / avgEdge define the three benchmark band edges
--------------------------------------------------------- */

function buildCategories(material, product, woodSource) {

  const isRCF = material === "waste";
  const isAgro = material === "agro";
  const isImportedPulp = woodSource === "imported";

  /* ---------- Material-specific electricity ---------- */

  const electricity = isRCF
    ? {
        id: "electricity",
        label: "Electricity (RCF / packaging paper)",
        unit: "kWh/MT",
        direction: "lower",
        best: 700,
        goodEdge: 900,
        avgEdge: 1150
      }
    : {
        id: "electricity",
        label: "Electricity (integrated wood-based mill)",
        unit: "kWh/MT",
        direction: "lower",
        best: 950,
        goodEdge: 1150,
        avgEdge: 1400
      };


  /* ---------- Material-specific fibre KPI ---------- */

  const fibreWood = isImportedPulp
    ? {
        id: "fibre_wood",
        label: "Fibre procurement (Wood/Pulp, imported blend)",
        unit: "Rs/ton Fibre",
        direction: "lower",
        best: 55000,
        goodEdge: 65000,
        avgEdge: 75000
      }
    : {
        id: "fibre_wood",
        label: "Fibre procurement (Wood/Pulp, domestic)",
        unit: "Rs/ton Fibre",
        direction: "lower",
        best: 38000,
        goodEdge: 48000,
        avgEdge: 58000
      };


  /* ---------- Show only selected material KPI ---------- */

  const fibreKpis = isRCF
    ? [
        {
          id: "fibre_waste",
          label: "Fibre procurement (Waste Paper)",
          unit: "Rs/ton Fibre",
          direction: "lower",
          best: 13000,
          goodEdge: 16000,
          avgEdge: 20000
        }
      ]
    : isAgro
      ? [
          {
            id: "fibre_agro",
            label: "Fibre procurement (Agro Waste)",
            unit: "Rs/ton Fibre",
            direction: "lower",
            best: 5500,
            goodEdge: 7000,
            avgEdge: 9000
          }
        ]
      : [
          fibreWood
        ];


  /* ---------- Material-specific fibre yield ---------- */

  const fibreYield = {
    id: "fiber_yield",
    label: "Fiber Yield (Raw Material to Pulp)",
    unit: "%",
    direction: "higher",
    best: isAgro ? 48 : 52,
    goodEdge: 45,
    avgEdge: 38
  };


  /* ---------- Product-specific OEE ---------- */

  const oeeKpi =
    product === "board"
      ? {
          id: "oee_board",
          label: "Overall Operational Efficiency (Board)",
          unit: "%",
          direction: "higher",
          best: 90,
          goodEdge: 85,
          avgEdge: 78
        }
      : {
          id: "oee_newsprint",
          label: "Overall Operational Efficiency (Newsprint/Writing)",
          unit: "%",
          direction: "higher",
          best: 88,
          goodEdge: 82,
          avgEdge: 75
        };


  return [

    /* =====================================================
       FINANCIAL PERFORMANCE
    ===================================================== */

    {
      id: "financial",

      title: "Financial Performance",

      kpis: [

        {
          id: "growth",
          label: "Growth (YoY)",
          unit: "Last 5-yr CAGR %",
          direction: "higher",
          best: 12,
          goodEdge: 8,
          avgEdge: 4
        },

        {
          id: "ebitda",
          label: "EBITDA margin",
          unit: "% of sales",
          direction: "higher",
          best: 20,
          goodEdge: 14,
          avgEdge: 8
        }

      ]
    },


    /* =====================================================
       FIBRE & RAW MATERIAL
       Only selected material KPI is shown
    ===================================================== */

    {
      id: "fibre",

      title: "Fibre & Raw Material",

      kpis: [

        ...fibreKpis,

        fibreYield

      ]
    },


    /* =====================================================
       UTILITIES & ENERGY
    ===================================================== */

    {
      id: "utilities",

      title: "Utilities & Energy",

      kpis: [

        electricity,

        {
          id: "steam",
          label: "Specific Steam Consumption",
          unit: "MT Steam/MT Paper",
          direction: "lower",
          best: 1.2,
          goodEdge: 1.6,
          avgEdge: 2.2
        },

        {
          id: "evap_ratio",
          label: "Evaporation Ratio (Steam to Coal)",
          unit: "MT Steam/MT Coal",
          direction: "higher",
          best: 6.0,
          goodEdge: 5.0,
          avgEdge: 4.0
        }

      ]
    },


    /* =====================================================
       CHEMICAL CONSUMPTION
    ===================================================== */

    {
      id: "chemical",

      title: "Chemical Consumption",

      kpis: [

        {
          id: "h2o2",
          label: "H₂O₂",
          unit: "Kg/MT",
          direction: "lower",
          best: 8,
          goodEdge: 15,
          avgEdge: 25
        },

        {
          id: "na2s2o4",
          label: "Na₂S₂O₄",
          unit: "Kg/MT",
          direction: "lower",
          best: 3,
          goodEdge: 6,
          avgEdge: 10
        },

        {
          id: "rosin",
          label: "Rosin",
          unit: "Kg/MT",
          direction: "lower",
          best: 3,
          goodEdge: 5,
          avgEdge: 8
        },

        {
          id: "pac",
          label: "PAC",
          unit: "Kg/MT",
          direction: "lower",
          best: 5,
          goodEdge: 8,
          avgEdge: 12
        },

        {
          id: "oba",
          label: "OBA",
          unit: "Kg/MT",
          direction: "lower",
          best: 1.5,
          goodEdge: 3,
          avgEdge: 5
        },

        {
          id: "starch",
          label: "Starch (Wet & Dry End)",
          unit: "Kg/MT",
          direction: "lower",
          best: 18,
          goodEdge: 30,
          avgEdge: 45
        },

        {
          id: "akd",
          label: "AKD",
          unit: "Kg/MT",
          direction: "lower",
          best: 0.8,
          goodEdge: 1.5,
          avgEdge: 2.5
        },

        {
          id: "gcc",
          label: "GCC",
          unit: "Kg/MT",
          direction: "lower",
          best: 80,
          goodEdge: 150,
          avgEdge: 250
        }

      ]
    },


    /* =====================================================
       OPERATIONAL EFFICIENCY
       Only selected product OEE is shown
    ===================================================== */

    {
      id: "operational",

      title: "Operational Efficiency & Productivity",

      kpis: [

        {
          id: "manpower",
          label: "Manpower per ton",
          unit: "Employees/1,000 TPA",
          direction: "lower",
          best: 0.4,
          goodEdge: 0.8,
          avgEdge: 1.5
        },

        /* Only selected product OEE */
        oeeKpi,

        {
          id: "finishing_yield",
          label: "Finishing House Yield",
          unit: "%",
          direction: "higher",
          best: 98.5,
          goodEdge: 97,
          avgEdge: 95
        },

        {
          id: "inventory",
          label: "Inventory (Post Jumbo Stage)",
          unit: "Days",
          direction: "lower",
          best: 7,
          goodEdge: 15,
          avgEdge: 30
        }

      ]
    },


    /* =====================================================
       QUALITY & DELIVERY
    ===================================================== */

    {
      id: "quality",

      title: "Quality & Delivery",

      kpis: [

        {
          id: "otif",
          label: "On Time In Full (OTIF) Delivery",
          unit: "%",
          direction: "higher",
          best: 98,
          goodEdge: 95,
          avgEdge: 90
        },

        {
          id: "coating_yield",
          label: "Coating Yield",
          unit: "%",
          direction: "higher",
          best: 98.5,
          goodEdge: 97,
          avgEdge: 95
        },

        {
          id: "condensate",
          label: "Condensate Recovery",
          unit: "%",
          direction: "higher",
          best: 85,
          goodEdge: 70,
          avgEdge: 50
        },

        {
          id: "breaks",
          label: "Breaks per Day",
          unit: "Number",
          direction: "lower",
          best: 2,
          goodEdge: 5,
          avgEdge: 10
        },

        {
          id: "b_grade",
          label: "B Grade Generation",
          unit: "%",
          direction: "lower",
          best: 2,
          goodEdge: 4,
          avgEdge: 8
        },

        {
          id: "repulp",
          label: "Repulp",
          unit: "%",
          direction: "lower",
          best: 3,
          goodEdge: 5,
          avgEdge: 8
        },

        {
          id: "complaints",
          label: "Customer Complaints Index",
          unit: "No./1000 MT shipped",
          direction: "lower",
          best: 0.5,
          goodEdge: 1.5,
          avgEdge: 3.0
        }

      ]
    }

  ];
}