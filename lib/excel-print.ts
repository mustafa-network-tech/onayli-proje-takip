import * as XLSX from "xlsx-js-style";

/** Persist print settings in OOXML: xlsx-js-style omits pageSetup on write. */
export function a4LandscapeExcelBuffer(book: XLSX.WorkBook): Buffer {
  const names = book.Workbook?.Names?.filter(name =>
    name.Name !== "_xlnm.Print_Area" && name.Name !== "_xlnm.Print_Titles") ?? [];
  book.SheetNames.forEach((name, index) => {
    const sheet = book.Sheets[name];
    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
    const quotedName = `'${name.replace(/'/g, "''")}'`;
    names.push(
      { Name: "_xlnm.Print_Area", Sheet: index, Ref: `${quotedName}!$A$1:$${XLSX.utils.encode_col(range.e.c)}$${range.e.r + 1}` },
      { Name: "_xlnm.Print_Titles", Sheet: index, Ref: `${quotedName}!$1:$1` },
    );
    sheet["!margins"] = { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 };
  });
  book.Workbook = { ...book.Workbook, Names: names };
  const archive = XLSX.CFB.read(XLSX.write(book, { type: "buffer", bookType: "xlsx", compression: true }), { type: "buffer" });
  book.SheetNames.forEach((_, index) => {
    const path = `/xl/worksheets/sheet${index + 1}.xml`;
    const entry = XLSX.CFB.find(archive, path);
    let xml = Buffer.from(entry.content).toString("utf8");
    const setup = '<pageSetUpPr fitToPage="1"/>';
    if (/<sheetPr\b[^>]*\/>/.test(xml)) xml = xml.replace(/<sheetPr\b([^>]*)\/>/, `<sheetPr$1>${setup}</sheetPr>`);
    else if (xml.includes("</sheetPr>")) xml = xml.replace("</sheetPr>", `${setup}</sheetPr>`);
    else xml = xml.replace(/(<worksheet\b[^>]*>)/, `$1<sheetPr>${setup}</sheetPr>`);
    xml = xml.replace(/(<pageMargins\b[^>]*\/>)/, '$1<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
    if (!xml.includes('fitToWidth="1"')) throw new Error("Excel A4 print settings could not be saved.");
    XLSX.CFB.utils.cfb_add(archive, path, Buffer.from(xml, "utf8"));
  });
  return XLSX.CFB.write(archive, { type: "buffer", fileType: "zip", compression: true });
}
