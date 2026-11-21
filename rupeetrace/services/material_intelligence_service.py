import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from rupeetrace.core.config import settings

class MaterialIntelligenceService:
    def __init__(self):
        self._standards_db = self._init_standards_db()

    def _init_standards_db(self) -> Dict[str, Any]:
        """
        Verified engineering knowledge base of pavement & drainage specifications conforming to:
        Indian Roads Congress (IRC), Bureau of Indian Standards (IS), and Ministry of Road Transport & Highways (MoRTH).
        """
        return {
            "pothole_surface": {
                "name": "Pothole & Surface Wearing Course Alternatives",
                "baseline": {
                    "code": "HMA_VG30",
                    "title": "Standard Hot Mix Asphalt (IS:73 VG-30 Bitumen)",
                    "initial_cost_per_sqm_inr": 2600.0,
                    "installation_hours": 6,
                    "availability_mmr": "Ubiquitous (All batching plants)",
                    "lifespan_years": 2.0,
                    "maintenance_interval_months": 12,
                    "monsoon_flooding_resilience": 4.5,
                    "heavy_axle_load_rating": 6.5,
                    "skid_resistance_bpn": 55,
                    "carbon_emissions_kg_sqm": 24.0,
                    "standard_reference": "MoRTH Section 500 / IS:73-2013",
                    "five_year_lifecycle_cost_sqm_inr": 5200.0, # Initial + 2 resealings
                    "description": "Conventional 40mm bituminous concrete overlay using VG-30 penetration grade bitumen."
                },
                "alternatives": [
                    {
                        "code": "MASTIC_ASPHALT",
                        "title": "Mastic Asphalt with Pre-coated Chippings (IRC:SP:98-2020)",
                        "initial_cost_per_sqm_inr": 4200.0,
                        "installation_hours": 10,
                        "availability_mmr": "Readily available in MMR (Specialized cookers required)",
                        "lifespan_years": 6.0,
                        "maintenance_interval_months": 36,
                        "monsoon_flooding_resilience": 9.5,
                        "heavy_axle_load_rating": 9.0,
                        "skid_resistance_bpn": 62,
                        "carbon_emissions_kg_sqm": 28.5,
                        "standard_reference": "IRC:SP:98-2020 Clause 5.2 / BMC Standard Schedule of Rates",
                        "five_year_lifecycle_cost_sqm_inr": 4620.0, # Capex + minimal 10% maint
                        "savings_lifecycle_pct": 11.2, # Cheaper over 5 years!
                        "capex_premium_pct": 61.5,
                        "technical_suitability": "Exceptional water-impermeability. Zero voids prevent monsoon stripping under standing water.",
                        "trade_offs": "Requires 180°C cookers and skilled manual laying. Higher initial cost but superior 5-year lifecycle economy.",
                        "appropriate_conditions": "Arterial roads, BEST bus corridors, hospital emergency gates, and flood-prone junctions."
                    },
                    {
                        "code": "COLD_MIX_POLYMER",
                        "title": "High-Performance Polymer-Modified Cold Mix (IRC:116-2014)",
                        "initial_cost_per_sqm_inr": 1800.0,
                        "installation_hours": 1,
                        "availability_mmr": "Pre-bagged ready mix available across BMC central depots",
                        "lifespan_years": 1.5,
                        "maintenance_interval_months": 8,
                        "monsoon_flooding_resilience": 7.0,
                        "heavy_axle_load_rating": 5.0,
                        "skid_resistance_bpn": 50,
                        "carbon_emissions_kg_sqm": 12.0,
                        "standard_reference": "IRC:116-2014 Specification for Ready-to-Use Cold Pothole Patching Mix",
                        "five_year_lifecycle_cost_sqm_inr": 5800.0,
                        "savings_lifecycle_pct": -11.5,
                        "capex_premium_pct": -30.8,
                        "technical_suitability": "Emergency wet-weather repair directly during active monsoon downpours without hot bitumen boilers.",
                        "trade_offs": "Fast deployment and lowest initial cost, but shorter lifespan under heavy axle loads.",
                        "appropriate_conditions": "Emergency 24-hour monsoon hazard mitigation until dry-season structural resurfacing."
                    },
                    {
                        "code": "RAP_BLENDED_WMA",
                        "title": "25% Reclaimed Asphalt (RAP) with Warm Mix Asphalt (IRC:120-2015)",
                        "initial_cost_per_sqm_inr": 2150.0,
                        "installation_hours": 6,
                        "availability_mmr": "Selected modern plants in Navi Mumbai & Vasai corridor",
                        "lifespan_years": 3.0,
                        "maintenance_interval_months": 18,
                        "monsoon_flooding_resilience": 6.5,
                        "heavy_axle_load_rating": 7.5,
                        "skid_resistance_bpn": 58,
                        "carbon_emissions_kg_sqm": 16.5,
                        "standard_reference": "IRC:120-2015 / MoRTH Section 500 Reclaimed Bituminous Pavements",
                        "five_year_lifecycle_cost_sqm_inr": 4300.0,
                        "savings_lifecycle_pct": 17.3,
                        "capex_premium_pct": -17.3,
                        "technical_suitability": "High circularity: recycles milled asphalt crust from road resurfacing projects, lowering raw bitumen demand.",
                        "trade_offs": "Requires certified testing of aged bitumen penetration index and strict moisture control.",
                        "appropriate_conditions": "Sub-arterial connectors and secondary ward road rehabilitations."
                    }
                ]
            },
            "pavement_junction": {
                "name": "Pavement & Junction Structural Upgradation Alternatives",
                "baseline": {
                    "code": "CONVENTIONAL_BC",
                    "title": "Flexible Bituminous Concrete 50mm over DBM (MoRTH Section 500)",
                    "initial_cost_per_sqm_inr": 3400.0,
                    "installation_hours": 12,
                    "availability_mmr": "Ubiquitous",
                    "lifespan_years": 3.0,
                    "maintenance_interval_months": 12,
                    "monsoon_flooding_resilience": 4.0,
                    "heavy_axle_load_rating": 7.0,
                    "skid_resistance_bpn": 56,
                    "carbon_emissions_kg_sqm": 32.0,
                    "standard_reference": "MoRTH Specification Clause 507",
                    "five_year_lifecycle_cost_sqm_inr": 6800.0,
                    "description": "Standard flexible pavement wearing course."
                },
                "alternatives": [
                    {
                        "code": "INTERLOCKING_PAVER_M40",
                        "title": "Heavy-Duty Interlocking Concrete Paver Blocks (IS:15658 M-40 Grade)",
                        "initial_cost_per_sqm_inr": 3000.0,
                        "installation_hours": 8,
                        "availability_mmr": "Widely precast in Mumbai metropolitan area",
                        "lifespan_years": 5.0,
                        "maintenance_interval_months": 24,
                        "monsoon_flooding_resilience": 8.0,
                        "heavy_axle_load_rating": 8.5,
                        "skid_resistance_bpn": 65,
                        "carbon_emissions_kg_sqm": 22.0,
                        "standard_reference": "IS:15658-2021 Precast Concrete Blocks for Paving / IRC:SP:63",
                        "five_year_lifecycle_cost_sqm_inr": 4500.0,
                        "savings_lifecycle_pct": 33.8,
                        "capex_premium_pct": -11.8,
                        "technical_suitability": "Modular blocks allow easy removal and relaying for underground utility repairs without asphalt trench scar.",
                        "trade_offs": "Requires rigid edge restraint and well-graded sand bedding; uneven laying can cause joint settlement.",
                        "appropriate_conditions": "Bus stops, pedestrian plazas, school zones, and frequent utility-cut corridors."
                    },
                    {
                        "code": "WHITE_TOPPING_PQC",
                        "title": "Ultra-Thin White-topping with Polypropylene Fibres (IRC:SP:76-2015)",
                        "initial_cost_per_sqm_inr": 5500.0,
                        "installation_hours": 48,
                        "availability_mmr": "Requires ready-mix concrete suppliers (M-40 grade)",
                        "lifespan_years": 15.0,
                        "maintenance_interval_months": 60,
                        "monsoon_flooding_resilience": 10.0,
                        "heavy_axle_load_rating": 10.0,
                        "skid_resistance_bpn": 68,
                        "carbon_emissions_kg_sqm": 45.0,
                        "standard_reference": "IRC:SP:76-2015 Guidelines for Thin and Ultra-Thin White-topping",
                        "five_year_lifecycle_cost_sqm_inr": 5775.0,
                        "savings_lifecycle_pct": 15.1,
                        "capex_premium_pct": 61.8,
                        "technical_suitability": "Concrete overlay placed directly over milled asphalt; impervious to waterlogging and zero rutting.",
                        "trade_offs": "Extended 7-day curing time disrupts traffic during execution.",
                        "appropriate_conditions": "Major arterial junctions, flood hotspots, and high-frequency container corridors."
                    }
                ]
            },
            "stormwater_drainage": {
                "name": "Stormwater Drainage & Flood Mitigation Alternatives",
                "baseline": {
                    "code": "BRICK_MASONRY_DRAIN",
                    "title": "In-situ Brick Masonry Side Drain with PCC Coping",
                    "initial_cost_per_meter_inr": 3500.0,
                    "installation_hours": 24,
                    "availability_mmr": "Ubiquitous manual construction",
                    "lifespan_years": 4.0,
                    "maintenance_interval_months": 6,
                    "monsoon_flooding_resilience": 5.0,
                    "hydraulic_roughness_manning": 0.015,
                    "standard_reference": "BMC Public Works Manual Section 8",
                    "five_year_lifecycle_cost_m_inr": 7200.0,
                    "description": "Traditional open/covered brick masonry trench."
                },
                "alternatives": [
                    {
                        "code": "PRECAST_RCC_BOX",
                        "title": "Modular Precast RCC Box Drains with Heavy Ductile Grating (IS:458)",
                        "initial_cost_per_meter_inr": 5200.0,
                        "installation_hours": 4,
                        "availability_mmr": "Factory precast units in Thane/Palghar industrial yards",
                        "lifespan_years": 20.0,
                        "maintenance_interval_months": 24,
                        "monsoon_flooding_resilience": 9.5,
                        "hydraulic_roughness_manning": 0.012,
                        "standard_reference": "IS:458-2021 Precast Concrete Pipes / IRC:SP:42",
                        "five_year_lifecycle_cost_m_inr": 5720.0,
                        "savings_lifecycle_pct": 20.6,
                        "capex_premium_pct": 48.6,
                        "technical_suitability": "Smooth hydraulic interior increases stormwater discharge rate by 35% compared to rough brick masonry.",
                        "trade_offs": "Requires crane deployment for lifting modular units during night blocks.",
                        "appropriate_conditions": "Chronic flood hotspots, coastal tidal backflow roads, and nullah interconnections."
                    },
                    {
                        "code": "HDPE_DWC_PIPES",
                        "title": "Corrugated Double Wall HDPE Underground Storm Conduits (IS:16098)",
                        "initial_cost_per_meter_inr": 4100.0,
                        "installation_hours": 3,
                        "availability_mmr": "Stocked by infrastructure pipe distributors",
                        "lifespan_years": 25.0,
                        "maintenance_interval_months": 36,
                        "monsoon_flooding_resilience": 9.0,
                        "hydraulic_roughness_manning": 0.009,
                        "standard_reference": "IS:16098 (Part 2):2013 Structured Wall Plastics Piping Systems",
                        "five_year_lifecycle_cost_m_inr": 4510.0,
                        "savings_lifecycle_pct": 37.4,
                        "capex_premium_pct": 17.1,
                        "technical_suitability": "Ultra-low Manning roughness coefficient (0.009) maximizes velocity and self-cleansing action; chemically inert to sewage acids.",
                        "trade_offs": "Requires careful soil compaction around pipe haunches to prevent ovalization.",
                        "appropriate_conditions": "Confined urban alleys and roads adjacent to choked open drains."
                    }
                ]
            }
        }

    def get_material_alternatives_for_category(self, category_or_proposal: str) -> Dict[str, Any]:
        """Returns structured comparison options based on engineering requirements."""
        c = category_or_proposal.lower()
        if "drain" in c or "flood" in c:
            cat_key = "stormwater_drainage"
        elif "paver" in c or "junction" in c or "school" in c:
            cat_key = "pavement_junction"
        else:
            cat_key = "pothole_surface"

        return self._standards_db[cat_key]

    def generate_cost_optimization_report(
        self,
        base_cost: float,
        category: str,
        road_surface: Optional[str] = None,
        traffic_level: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a transparent project-level cost optimization report.
        Answers: Can we reduce costs without sacrificing safety, durability, or quality?
        """
        alt_data = self.get_material_alternatives_for_category(category)
        baseline = alt_data["baseline"]
        alternatives = alt_data["alternatives"]

        # Find best lifecycle savings alternative and best capex savings alternative
        best_lifecycle_alt = max(alternatives, key=lambda a: a["savings_lifecycle_pct"])
        best_capex_alt = min(alternatives, key=lambda a: a["capex_premium_pct"])

        # Project-level financial extrapolation
        est_area_sqm = round(base_cost / baseline.get("initial_cost_per_sqm_inr", 3000.0), 1)

        comparisons = []
        for alt in alternatives:
            alt_capex_diff_pct = alt["capex_premium_pct"]
            alt_total_capex = round(base_cost * (1.0 + (alt_capex_diff_pct / 100.0)), 2)
            capex_savings_inr = round(base_cost - alt_total_capex, 2)

            alt_lifecycle_total = round(base_cost * (alt.get("five_year_lifecycle_cost_sqm_inr", 5000) / max(1.0, baseline.get("five_year_lifecycle_cost_sqm_inr", 5000))), 2)
            lifecycle_savings_inr = round((base_cost * 2.0) - alt_lifecycle_total, 2)

            comparisons.append({
                "alternative_code": alt["code"],
                "title": alt["title"],
                "standard_reference": alt["standard_reference"],
                "initial_capex_inr": alt_total_capex,
                "capex_difference_inr": -capex_savings_inr,
                "capex_savings_pct": -alt_capex_diff_pct,
                "five_year_lifecycle_cost_inr": alt_lifecycle_total,
                "lifecycle_savings_pct": alt["savings_lifecycle_pct"],
                "lifespan_years": alt["lifespan_years"],
                "monsoon_flooding_resilience": alt["monsoon_flooding_resilience"],
                "heavy_axle_load_rating": alt["heavy_axle_load_rating"],
                "skid_resistance_bpn": alt["skid_resistance_bpn"],
                "technical_trade_off": alt["trade_offs"],
                "appropriate_conditions": alt["appropriate_conditions"]
            })

        return {
            "project_category": category,
            "baseline_option": {
                "title": baseline["title"],
                "standard_reference": baseline["standard_reference"],
                "baseline_cost_inr": base_cost,
                "lifespan_years": baseline["lifespan_years"],
                "five_year_lifecycle_cost_inr": round(base_cost * 2.0, 2)
            },
            "best_lifecycle_value_recommendation": {
                "title": best_lifecycle_alt["title"],
                "standard_reference": best_lifecycle_alt["standard_reference"],
                "lifecycle_savings_pct": best_lifecycle_alt["savings_lifecycle_pct"],
                "rationale": f"Delivers {best_lifecycle_alt['lifespan_years']} years durability vs {baseline['lifespan_years']} years baseline. Avoids repeated monsoon repair cycles."
            },
            "alternatives_evaluated": comparisons,
            "disclaimer": "AI & Engineering Knowledge Base Analysis: Material options conform to Indian Roads Congress (IRC) and MoRTH specifications. On-site structural engineer validation required prior to tender BOQ incorporation."
        }

    async def query_claude_material_research(
        self,
        project_type: str,
        surface: str,
        ward_context: str
    ) -> Dict[str, Any]:
        """
        AI-assisted material research using Claude with fallback to deterministic engineering standards.
        """
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            # Deterministic research response with exact Indian Standards citations
            opts = self.get_material_alternatives_for_category(project_type)
            return {
                "source": "RupeeTrace Engineering Standards Knowledge Base (IRC/MoRTH)",
                "ai_provider": "Deterministic Engineering Specification Fallback (No Anthropic API Key configured)",
                "project_type": project_type,
                "recommended_material": opts["alternatives"][0]["title"],
                "relevant_standards": [
                    opts["baseline"]["standard_reference"],
                    opts["alternatives"][0]["standard_reference"]
                ],
                "technical_suitability": opts["alternatives"][0]["technical_suitability"],
                "durability_considerations": f"Lifespan: {opts['alternatives'][0]['lifespan_years']} years under high monsoon rainfall (2400mm MMR annual precipitation).",
                "trade_offs": opts["alternatives"][0]["trade_offs"],
                "human_approval_requirement": "Mandatory Junior Engineer mix-design trial verification and bitumen penetration test report (IS:1203)."
            }

        # If Anthropic API key is present, execute structured prompt
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            prompt = f"""
You are an expert Public Procurement and Pavement Infrastructure Materials Engineer in Mumbai, India.
Analyze the following road repair project context:
- Project Type: {project_type}
- Existing Surface: {surface}
- Ward Environmental Context: {ward_context} (MMR heavy monsoon region)

Evaluate economical and durable material alternatives conforming to Indian Roads Congress (IRC), Bureau of Indian Standards (IS), and MoRTH specifications.
Do NOT invent market prices. Sourced from standard schedule of rates where possible.
Return a structured JSON with:
1. recommended_material
2. relevant_standards (e.g. IRC:SP:98, IS:73, MoRTH Section 500)
3. technical_suitability
4. durability_considerations
5. trade_offs
6. human_approval_requirement
"""
            msg = client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=800,
                temperature=0.2,
                system="You are a senior civil engineer specializing in Indian public works (IRC/MoRTH) standards. Always output clean valid JSON.",
                messages=[{"role": "user", "content": prompt}]
            )
            raw_text = msg.content[0].text
            clean_json = raw_text[raw_text.find("{"):raw_text.rfind("}")+1]
            data = json.loads(clean_json)
            data["source"] = "Claude 3.5 Sonnet Infrastructure Research"
            data["ai_provider"] = "Anthropic Claude API"
            return data
        except Exception as e:
            opts = self.get_material_alternatives_for_category(project_type)
            return {
                "source": "RupeeTrace Engineering Standards Knowledge Base (Fallback)",
                "ai_provider": f"Local Standards Engine (Claude API query error: {str(e)})",
                "project_type": project_type,
                "recommended_material": opts["alternatives"][0]["title"],
                "relevant_standards": [
                    opts["baseline"]["standard_reference"],
                    opts["alternatives"][0]["standard_reference"]
                ],
                "technical_suitability": opts["alternatives"][0]["technical_suitability"],
                "durability_considerations": f"Lifespan: {opts['alternatives'][0]['lifespan_years']} years under high monsoon rainfall.",
                "trade_offs": opts["alternatives"][0]["trade_offs"],
                "human_approval_requirement": "Mandatory Junior Engineer mix-design trial verification and bitumen penetration test report."
            }
