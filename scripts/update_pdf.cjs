const fs = require("fs");
const path = require("path");

let code = fs.readFileSync("src/components/leads/LeadDetailsPage.tsx", "utf-8");

// Read logo as base64
const logoPath = path.join(__dirname, "public", "logo.png");
const logoBase64 = fs.readFileSync(logoPath).toString("base64");

// Replace the handleDownloadNotesPdf function
const oldFn = code.substring(
  code.indexOf("  const handleDownloadNotesPdf"),
  code.indexOf("  };\n", code.indexOf("  const handleDownloadNotesPdf")) + 4,
);

const newFn = `  const handleDownloadNotesPdf = () => {
    const BRAND = [245, 130, 32] as [number, number, number]; // #F58220
    const DARK  = [15, 23, 42]  as [number, number, number];  // slate-900
    const MUTED = [100, 116, 139] as [number, number, number]; // slate-500
    const WHITE = [255, 255, 255] as [number, number, number];
    const LIGHT = [249, 250, 251] as [number, number, number]; // gray-50

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const logoData = 'data:image/png;base64,${logoBase64}';

    // ── Header bar ──────────────────────────────────────────────
    doc.setFillColor(...DARK);
    doc.rect(0, 0, W, 28, 'F');

    // Logo (max 20×20mm, aligned left)
    doc.addImage(logoData, 'PNG', 10, 4, 20, 20);

    // App name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('Integrated Technics CRM', 34, 14);

    // Report type tag
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND);
    doc.text('LEAD NOTES REPORT', 34, 20);

    // Date printed (right-aligned)
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.setFontSize(8);
    doc.setTextColor(180, 190, 200);
    doc.text(\`Printed: \${dateStr}\`, W - 10, 20, { align: 'right' });

    // ── Company name (hero) ──────────────────────────────────────
    let y = 36;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(lead.company, 14, y);

    // Status pill
    const statusLabel = lead.status.charAt(0).toUpperCase() + lead.status.slice(1);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(...BRAND);
    const pillW = doc.getTextWidth(statusLabel) + 6;
    doc.roundedRect(W - 14 - pillW, y - 5.5, pillW, 7, 1.5, 1.5, 'F');
    doc.setTextColor(...WHITE);
    doc.text(statusLabel, W - 14 - pillW / 2, y - 0.5, { align: 'center' });

    y += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(\`Contact: \${lead.contact || '—'}\`, 14, y);

    // ── Divider ──────────────────────────────────────────────────
    y += 6;
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(0.5);
    doc.line(14, y, W - 14, y);

    // ── Lead Details grid (2 columns) ────────────────────────────
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text('LEAD DETAILS', 14, y);
    y += 5;

    const fields: [string, string][] = [
      ['Stage',          lead.status || '—'],
      ['Owner',          lead.owner || '—'],
      ['Industry',       lead.industry || '—'],
      ['Email',          (lead as any).email || '—'],
      ['Source',         (lead as any).source || '—'],
      ['Value',          fmtMoney(lead.value)],
      ['Probability',    lead.probability != null ? \`\${lead.probability}%\` : '—'],
      ['Expected Close', (lead as any).expectedCloseDate || '—'],
      ['Location',       [lead.city, leadDistricts[lead.id]].filter(Boolean).join(', ') || '—'],
      ['Phone',          (lead as any).phone || '—'],
    ];

    const colW = (W - 28) / 2;
    const rowH = 9;
    fields.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 14 + col * colW;
      const rowY = y + row * rowH;

      // Zebra background
      if (Math.floor(i / 2) % 2 === 0) {
        doc.setFillColor(...LIGHT);
        doc.rect(x, rowY - 4.5, colW - 2, rowH, 'F');
      }

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...MUTED);
      doc.text(label.toUpperCase(), x + 2, rowY);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.text(value, x + 2, rowY + 4.5);
    });

    const detailRows = Math.ceil(fields.length / 2);
    y += detailRows * rowH + 6;

    // ── Divider ──────────────────────────────────────────────────
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, y, W - 14, y);
    y += 8;

    // ── Notes table ──────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text('NOTES', 14, y);
    y += 5;

    const tableData = leadNotes.map(n => [
      fmtTime(n.created_at),
      n.text_en || n.text_ar || ''
    ]);

    if (tableData.length === 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...MUTED);
      doc.text('No notes recorded for this lead.', 14, y + 4);
    } else {
      autoTable(doc, {
        startY: y,
        head: [['Date / Time', 'Note']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: DARK,
          textColor: WHITE,
          fontSize: 9,
          fontStyle: 'bold',
          cellPadding: 4,
        },
        alternateRowStyles: { fillColor: LIGHT },
        styles: { fontSize: 9, cellPadding: 4, textColor: DARK },
        columnStyles: {
          0: { cellWidth: 38, fontStyle: 'bold' },
          1: { cellWidth: 'auto' },
        },
      });
    }

    // ── Footer ───────────────────────────────────────────────────
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const footY = doc.internal.pageSize.getHeight() - 8;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, footY - 3, W - 14, footY - 3);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text('Integrated Technics CRM — Confidential', 14, footY);
      doc.text(\`Page \${p} of \${pageCount}\`, W - 14, footY, { align: 'right' });
    }

    doc.save(\`\${lead.company.replace(/\\s+/g, '_')}_Notes.pdf\`);
  };`;

code = code.replace(oldFn, newFn);

fs.writeFileSync("src/components/leads/LeadDetailsPage.tsx", code, "utf-8");
console.log("Done — logo embedded, brand colors applied, lead details added.");
