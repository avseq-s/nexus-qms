export const PRELOADED_SOPS = [
  {
    id: "SOP-QMS-001",
    title: "Quality Management System (QMS)",
    purpose: "To define the overarching principles and structure of the company's ISO certified Quality Management System.",
    scope: "Applies to all departments and personnel.",
    procedure: "[ADMIN: Paste the text from '1. Quality Management System' here]",
    rev: "A", status: "APPROVED", lastUpdated: "2026-04-03", author: "Management", approver: "Director"
  },
  {
    id: "SOP-QA-001",
    title: "Quality Procedures",
    purpose: "Ensure all products and incoming parts meet required specifications.",
    scope: "Incoming (IQC), In-process (IPQC), and Final Output.",
    procedure: "[ADMIN: Paste the text from '3. Quality' here]",
    rev: "A", status: "APPROVED", lastUpdated: "2026-04-03", author: "QC Head", approver: "Director"
  },
  {
    id: "SOP-STR-001",
    title: "Store & Inventory Management",
    purpose: "To define the procedure for receiving, storing, and issuing electronic components safely.",
    scope: "Warehouse, receiving docks, material issue to EMS.",
    procedure: "[ADMIN: Paste the text from '4. Store' here]",
    rev: "A", status: "APPROVED", lastUpdated: "2026-04-03", author: "Store Manager", approver: "Director"
  },
  {
    id: "SOP-PRD-001",
    title: "Production Operations",
    purpose: "To standardize the manufacturing lines, EMS coordination, and assembly procedures.",
    scope: "All production stages including SMT, programming, testing, and boxing.",
    procedure: "[ADMIN: Paste the text from '7. Production' here]",
    rev: "A", status: "APPROVED", lastUpdated: "2026-04-03", author: "Production Head", approver: "Director"
  },
  {
    id: "SOP-PUR-001",
    title: "Purchase & Vendor Operations",
    purpose: "To govern how vendors are approved, POs are issued, and supply chain continuity is maintained.",
    scope: "Purchasing team and ASL interactions.",
    procedure: "[ADMIN: Paste the text from '6. Purchase' here]",
    rev: "A", status: "APPROVED", lastUpdated: "2026-04-03", author: "Procurement Lead", approver: "Director"
  }
];

export const FORMAT_TEMPLATES = [
  {
    id: "FMT-GRN-01",
    name: "Goods Receipt Note Format",
    fields: ["GRN Number", "Supplier", "Invoice Ref", "Date Received", "Receiver Name", "Visual Condition"]
  },
  {
    id: "FMT-IQC-01",
    name: "IQC Inspection Report",
    fields: ["GRN Ref", "Part Number", "Lot Number", "Sample Size", "Visual Result", "Electrical Result", "Inspector Sign"]
  },
  {
    id: "FMT-NCR-01",
    name: "Non-Conformance Report",
    fields: ["NCR Number", "Date Raised", "Reel/Lot ID", "Defect Description", "Containment Action", "Root Cause", "CAPA Ref"]
  }
];
