const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function extractTextFromPdf(file) {
  const data = new Uint8Array(fs.readFileSync(file));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let pageText = '';
    let lastY = null;
    for (const item of textContent.items) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += '\n';
      }
      pageText += item.str + ' ';
      lastY = item.transform[5];
    }
    fullText += pageText + '\n';
  }
  return fullText;
}

async function parsePoPdf(file) {
    const text = await extractTextFromPdf(file);
    const lines = text.split('\n')
        .map(l => l.trim())
        .flatMap(l => l.split(/ {2,}/))
        .map(l => l.trim())
        .filter(Boolean);

    let items = [];
    let parsingItems = false;
    let expectedRowIndex = 1;
    let currentItem = null;

    for (let i = 0; i < lines.length; i++) {
        let token = lines[i];
        
        if (token.includes("Item & Description") || token.includes("HSN/SAC")) {
            parsingItems = true;
            continue;
        }
        
        if (parsingItems && (token.includes("Sub Total") || token.includes("Total") || expectedRowIndex > 50)) {
            break;
        }

        if (parsingItems) {
            if (token === String(expectedRowIndex)) {
                if (currentItem) {
                   currentItem.description = currentItem.description.join(" ").trim();
                   currentItem.component = currentItem.partNumber + " - " + currentItem.description; // For backwards compatibility
                   items.push(currentItem);
                }
                currentItem = { 
                   id: expectedRowIndex,
                   partNumber: "", 
                   description: [], 
                   hsn: "",
                   declaredQty: "", 
                   unit: "",
                   rate: "",
                   amount: "",
                   countedQty: "" 
                };
                expectedRowIndex++;
                continue;
            }

            if (currentItem) {
                if (/^\d{6,8}$/.test(token)) {
                    currentItem.hsn = token;
                    let qtyToken = lines[++i];
                    if (qtyToken) {
                        currentItem.declaredQty = qtyToken.replace(/,/g, '');
                    }
                    currentItem.unit = lines[++i] || "";
                    currentItem.rate = lines[++i] || "";
                    currentItem.amount = lines[++i] || "";
                } else if (!/^[0-9]$/.test(token)) {
                    if (!currentItem.partNumber) {
                        currentItem.partNumber = token;
                    } else {
                        currentItem.description.push(token);
                    }
                }
            }
        }
    }
    
    if (currentItem) {
        currentItem.description = currentItem.description.join(" ").trim();
        currentItem.component = currentItem.partNumber + " - " + currentItem.description; // For backwards compatibility
        items.push(currentItem);
    }
    console.log(items);
}

parsePoPdf('PO25-260679.pdf').catch(console.error);
