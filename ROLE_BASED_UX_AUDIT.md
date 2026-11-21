# RupeeTrace — Role-Based UX Audit & Information Architecture Analysis

## 1. Executive Summary

Prior to this sprint, RupeeTrace operated with a cosmetic role toggle ("Citizen" vs "Officer") in the header that changed minimal UI state. Both user personas were presented with identical navigation menus, technical accounting jargon, 7-chapter audit dossiers, and an unconstrained visual money graph containing hundreds of tangled nodes.

This audit details the root-cause cognitive failures of the monolithic UI and specifies the architectural separation implemented in the Neo-Brutalist authenticated role system.

---

## 2. Cognitive Load & Usability Deficiencies in Monolithic Design

| Feature Area | Previous Monolithic Experience | UX Failure Mode | Redesigned Authenticated Experience |
|---|---|---|---|
| **Role Toggle** | Cosmetic switch without authentication | False sense of security; no authorization checks; identical clutter | Real token auth (`Bearer <token>`), server-enforced RBAC (`require_role`), persona profiles |
| **Navigation** | 5-7 overloaded rows with identical endpoints | Visual fatigue; user confused regarding relevant actions | Role-specific primary navigation bar: Citizen (5 public tabs) vs Officer (5 forensic tabs) |
| **Road Passport** | Raw algorithmic audit anomalies and internal rate-card flags exposed to public | Citizen alarmed by technical internal variance codes without context | Chapter 5 separated into Public Warranty & Durability for Citizens, Forensic Audits for Officers |
| **Money Trace Graph** | Loaded entire municipal dataset (24 wards, all roads) as a global hairball | Canvas unreadable; browser lag; 0 analytical focus | 6 Scoped Investigation Modes with 1-hop initial neighborhood and explicit expansion |
| **Issue Reporting** | Disconnected from warranty claims and citizen tracking | Citizen had no visibility into defect liability enforcement | "My Activity" tracking dashboard linking complaints directly to contractor escrow holds |
| **Assistance** | Multiple floating widgets and chat heads | Obstructed bottom action buttons | Single unified Command Palette / AI Assistant Drawer invoked via `Cmd+K` / `Ctrl+K` |

---

## 3. Information Architecture Restructuring

```
                     [RUPEETRACE PLATFORM]
                               |
               +---------------+---------------+
               |                               |
       [CITIZEN WORKSPACE]             [OFFICER WORKSPACE]
       (Sunita Sharma, Resident)       (Er. R. K. Patil, EE)
               |                               |
    +----------+----------+         +----------+----------+
    |                     |         |                     |
  [Home]             [JANMAT]   [Overview]           [Next Rupee]
  [Explore Roads]    [My Act.]  [Investigate]        [Citizen Mgmt]
  [Report Issue]                [Accountability]
```

### 3.1 Citizen Workspace Principles
- **No Accounting or Forensic Jargon**: Terms like "knapsack allocation" or "rate-card variance" replaced with "Recommended Projects" and "Budget Utilization".
- **Action-Oriented Verbs**: "Explore", "Report", "Verify", "Vote".
- **Empowerment via Escrow**: Clearly convey how citizen verification protects municipal retainage escrows against bad contractor repairs.

### 3.2 Officer Workspace Principles
- **Investigative Focus**: Deep forensic tools (6-mode Scoped Graph, DLP Sentinel, Repair Durability, Tender Advisor).
- **Executive Triage**: Rapid citizen complaint resolution and warranty notice enforcement.
- **Capital Planning**: Multi-criteria budget simulation with IRC material alternatives.

---

## 4. Design System Alignment (Neo-Brutalist)

- **Contrast**: High-contrast borders (`3px solid #171717`), bold primary yellow (`#FFDE59`), mint green (`#B9D9D1`), and alert coral (`#FF3B30`).
- **Typography**: Clash Display / Space Grotesk headline weights paired with JetBrains Mono data tables.
- **Tactile Feedback**: `active:translate-x-[1px] active:translate-y-[1px]` hard shadow shifts for physical municipal stamp aesthetics.
