import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function extractPdfText(buffer:Buffer){
 const direct=await pdfParse(buffer);if(direct.text.replace(/\s/g,"").length>=30)return {text:direct.text,usedOcr:false};
 const [{pdf},{createWorker},turData]=await Promise.all([import("pdf-to-img"),import("tesseract.js"),import("@tesseract.js-data/tur")]);
 const document=await pdf(`data:application/pdf;base64,${buffer.toString("base64")}`,{scale:2.5});if(document.length>20){await document.destroy();throw new Error("OCR için PDF en fazla 20 sayfa olabilir")}
 const worker=await createWorker("tur",1,{langPath:turData.default.langPath,gzip:turData.default.gzip});let text="";
 try{for(let page=1;page<=document.length;page++){const result=await worker.recognize(await document.getPage(page));text+=`\n${result.data.text}`}}finally{await worker.terminate();await document.destroy()}
 return {text,usedOcr:true};
}
