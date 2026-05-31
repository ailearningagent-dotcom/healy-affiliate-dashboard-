import { NextResponse } from "next/server";
import { getAgentManager } from "@/lib/agents/agent-manager";

function escapeCsv(value: unknown): string {
  const str = value == null ? "" : String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  try {
    const manager = getAgentManager();
    const leads = await manager.getLeads();

    const headers = ["Name", "Company", "Role", "Email", "Phone", "Status", "Score", "Persona", "Source", "Notes", "Created"];

    const rows = leads.map((lead) => [
      lead.name,
      lead.company,
      lead.role,
      lead.email,
      lead.phone ?? "",
      lead.status,
      String(lead.score),
      lead.personaType,
      lead.source,
      lead.notes,
      lead.createdAt?.toISOString().split("T")[0] ?? "",
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const encoder = new TextEncoder();
    const buffer = encoder.encode(csvContent);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
