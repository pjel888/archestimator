# Component Category Library Taxonomy

**Date:** 2026-05-22  
**Status:** Draft V3 implemented in `/workshop/components`  
**Scope:** Category tree for reusable estimate row items and future reporting rollups  
**Companion JSON:** `.ai/03_plans/component-category-library-taxonomy/category-taxonomy.v2.json`

## Purpose

This taxonomy is for categorizing reusable estimate row items. It is not a spec-book folder dump and it is not an FF&E procurement package. The visible tree must support clean reporting questions such as:

- How much is this project spending on doors?
- How much is this project spending on windows?
- How much is material cost versus finish cost?
- How much is furniture cost versus fixture cost versus equipment cost?
- Which reusable items belong to plumbing systems versus plumbing fixtures?

## Core Rule

The tree describes what the item is. Metadata describes where it is used, who installs it, who supplies it, how it is procured, and which standards it maps to.

Tree depth is intentionally simple:

```text
Organizer
  Category
    Subcategory
```

The nine top-level nodes are organizers only. They are not reporting categories by themselves.

## Research Basis

- FF&E is a common acronym for Furniture, Fixtures, and Equipment, but it is a procurement/accounting scope term rather than a clean component category. USACE's 2024 Standard FF&E Nomenclature describes FF&E as a standard framework for tagging and cataloging items by category/function, not as one combined folder.
- The Colorado BEST FF&E guidance similarly defines FF&E around furniture, fixtures, or equipment that typically has no permanent connection to the building or utilities, reinforcing that project teams use it as a funding/procurement scope.
- CSI MasterFormat, OmniClass, UniFormat, Uniclass, and NRM remain useful as crosswalks and alternate views. They should not force the primary user browse tree into contractor-spec divisions.

Key references:

- USACE Standard FF&E Nomenclature, via WBDG: https://www.wbdg.org/FFC/ARMYCOE/RESOURCES/USACE_Standard_FFE_Nomenclature_2024.pdf
- Colorado Department of Education BEST FF&E Guidelines: https://www.cde.state.co.us/capitalconstruction/bestfurniturefixturesandequipmentffeguidelines-pdf
- CSI MasterFormat: https://www.csiresources.org/standards/masterformat2026
- CSI OmniClass: https://www.csiresources.org/standards/omniclass/standards-omniclass-about
- NBS Uniclass: https://uniclass.thenbs.com/
- CSI UniFormat: https://www.csiresources.org/standards/uniformat/about-uniformat
- NIST UNIFORMAT II: https://www.nist.gov/publications/uniformat-ii-elemental-classification-building-specifications-cost-estimating-and-cost
- RICS NRM: https://www.rics.org/profession-standards/rics-standards-and-guidance/sector-standards/construction-standards/nrm

## Nine Organizer Groups

| Organizer | Category examples |
| --- | --- |
| Administration | Project Requirements, Temporary Works, Existing Conditions, Demolition |
| Site | Civil, Landscape, Exterior Works |
| Structure | Foundations, Concrete Work, Reinforcement, Structural Steel, Structural Timber, Structural Masonry |
| Envelope | Roofing, Waterproofing, Exterior Walls, Exterior Cladding, Curtain Walls, Windows, Louvers, Exterior Shading, Insulation, Sealants |
| Architecture | Doors, Partitions, Interior Glazing, Ceilings, Stairs, Railings, Millwork, Casework, Specialties, Signage |
| Materials | Concrete, Masonry, Stone, Tile, Wood, Metal, Glass, Gypsum, Plaster, Resin, Fabric, Composite Materials, Reclaimed Materials |
| Finishes | Floor Finishes, Wall Finishes, Ceiling Finishes, Countertop Finishes, Paint, Coatings, Tile Finishes, Wood Finishes, Finish Accessories |
| Objects | Fixtures, Furniture, Equipment, Appliances, Electrical Devices, Controls, Faceplates, Accessories, Soft Furnishings, Window Treatments, Artwork, Decorative Objects |
| Systems | HVAC, Plumbing Systems, Sanitary Systems, Stormwater Systems, Fuel Gas Systems, Electrical Power, Lighting Systems, Communications, Audio Visual, Security, Building Automation, Fire Protection, Fire Alarm, Life Safety, Vertical Transportation |

## Non-Negotiable Separations

- `Furniture`, `Fixtures`, and `Equipment` are separate categories.
- `FF&E` is only a procurement scope tag.
- `Materials` and `Finishes` are separate categories.
- `Doors` and `Windows` are separate categories for estimate reporting.
- `Plumbing Systems`, `Sanitary Systems`, `Plumbing Fixtures`, and `Sanitary Fixtures` are separate.
- `Lighting Fixtures` and `Lighting Systems` are separate.
- `Fire Protection`, `Fire Alarm`, and `Life Safety` are separate.
- `Assemblies`, `Templates`, and `Palettes` are not mixed into this primary estimate-row category tree.

## Forbidden Visible Folder Labels

Do not use these as tree labels:

```text
FF&E
FFE
Furniture, Fixtures, and Equipment
Furniture, Fixtures & Equipment
Furniture & Fixtures
Furniture & Equipment
Fixtures & Equipment
Furnishings & Equipment
Architectural & Interiors
Architecture & Interiors
Plumbing & Sanitary
Electrical & Low Voltage
Fire Protection & Life Safety
Assemblies & Templates
```

## Required Metadata

Every component should eventually support:

```text
Primary Category
Subcategory
Secondary Tags
Discipline
Room Type
Host Surface
System
Procurement Scope
Installation Type
Manufacturer
Model
Supplier
Finish Code
Material Code
CSI Code
Uniclass Code
OmniClass Code
UniFormat Code
Cost Code
BIM Category
LOD Level
Region
Status
Approved By
Date Added
Last Reviewed
```

## Assignment Examples

| Item | Primary category | Subcategory or tag |
| --- | --- | --- |
| LED downlight | Fixtures | Lighting Fixtures |
| Lighting driver | Lighting Systems | Drivers |
| Faucet | Fixtures | Plumbing Fixtures |
| Water closet | Fixtures | Sanitary Fixtures |
| PPR pipe | Plumbing Systems | Domestic Cold Water |
| PVC soil pipe | Sanitary Systems | Soil Waste Vent |
| Ceramic tile box | Tile | material item |
| Installed ceramic bathroom floor | Floor Finishes | Tile Flooring |
| Interior door leaf | Doors | Interior Doors |
| Window unit | Windows | Fixed Windows or Sliding Windows |
| Dining chair | Furniture | Dining Chairs, procurementScope=FF&E |
| Commercial range | Equipment | Commercial Kitchen Equipment |
| Refrigerator | Appliances | Refrigerators |

## Implementation Notes

1. `category-taxonomy.v2.json` is the shared source for the UI taxonomy seed.
2. Top-level organizer rows should use the same tree row typography and icon sizing as category and subcategory rows.
3. Category IDs must stay stable even when labels improve.
4. Standards codes are optional crosswalk metadata, not embedded licensed tables.
5. Search aliases can include `FFE` and `FF&E`, but matching those terms must route to separate `Furniture`, `Fixtures`, and `Equipment` categories rather than creating a combined folder.

## Definition of Done

- JSON parses.
- `/workshop/components` renders the nine organizer groups.
- Tree rows have consistent text size, icon size, and non-uppercase folder labels.
- `Fixtures`, `Furniture`, and `Equipment` render separately.
- `Doors`, `Windows`, `Materials`, and `Finishes` render separately.
- Forbidden blended labels are absent from the visible category tree.
