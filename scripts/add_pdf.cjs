const fs = require("fs");
let code = fs.readFileSync("src/components/leads/LeadDetailsPage.tsx", "utf-8");

// 1. imports
if (!code.includes("import jsPDF")) {
  code = code.replace(
    'import { Link, useRouter } from "@tanstack/react-router";',
    'import { Link, useRouter } from "@tanstack/react-router";\nimport jsPDF from "jspdf";\nimport autoTable from "jspdf-autotable";',
  );
}

if (!code.includes("FileDown,")) {
  code = code.replace("FileText,", "FileText,\n  FileDown,");
}

// 2. handleDownloadNotesPdf
const funcCode = `
  const handleDownloadNotesPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("Lead Notes Report", 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text("Account Details", 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(\`Company: \${lead.company}\`, 14, 38);
    doc.text(\`Contact: \${lead.contact}\`, 14, 44);
    doc.text(\`Industry: \${lead.industry || "-"}\`, 14, 50);
    doc.text(\`Value: \${fmtMoney(lead.value)}\`, 14, 56);
    doc.text(\`Email: \${(lead as any).email || "-"}\`, 100, 38);
    doc.text(\`Location: \${[lead.city, leadDistricts[lead.id]].filter(Boolean).join(", ") || "-"}\`, 100, 44);

    const tableData = leadNotes.map(n => [
      fmtTime(n.created_at),
      n.text_en || n.text_ar || ""
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["Date / Time", "Note"]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 'auto' }
      }
    });

    doc.save(\`\${lead.company.replace(/\\s+/g, '_')}_Notes.pdf\`);
  };
`;

if (!code.includes("handleDownloadNotesPdf")) {
  code = code.replace(
    "const leadNotes = notesQuery.data ?? [];",
    "const leadNotes = notesQuery.data ?? [];\n" + funcCode,
  );
}

// 3. Section Component update
if (!code.includes("action?: React.ReactNode;")) {
  code = code.replace(
    "children: React.ReactNode;\n}) {",
    "children: React.ReactNode;\n  action?: React.ReactNode;\n}) {",
  );

  code = code.replace(
    '<div className="mb-4 flex items-center gap-2">\n        <Icon',
    '<div className="mb-4 flex items-center justify-between">\n        <div className="flex items-center gap-2">\n          <Icon',
  );

  code = code.replace(
    "</h3>\n      </div>\n      {children}",
    "</h3>\n        </div>\n        {action}\n      </div>\n      {children}",
  );
}

// 4. Update the Notes Section call
const btn = `action={
            <button
              onClick={handleDownloadNotesPdf}
              disabled={leadNotes.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent hover:text-primary disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5" /> Download PDF
            </button>
          }`;

if (!code.includes("Download PDF")) {
  code = code.replace(
    '<Section title={t("notes")} icon={FileText}>',
    `<Section title={t("notes")} icon={FileText} ${btn}>`,
  );
}

fs.writeFileSync("src/components/leads/LeadDetailsPage.tsx", code, "utf-8");
console.log("Done");
