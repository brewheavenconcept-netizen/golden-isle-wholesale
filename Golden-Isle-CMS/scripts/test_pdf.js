const { generateInvoicePdf } = require('../lib/pdfGenerator');
const fs = require('fs');
const path = require('path');

const mockData = {
    orderId: "ORD-TEST-JSPDF-001",
    name: "Kimi Code Ujian",
    phone: "60123456789",
    language: "ms",
    timestamp: new Date().toISOString(),
    cart: [
        {
            name: "Yamazaki 12 Year Single Malt",
            category: "Whisky",
            price: "RM 920.00",
            priceNum: 920,
            quantity: 2,
            total: "RM 1840.00"
        },
        {
            name: "Duvel Belgian Golden Ale",
            category: "Beer",
            price: "RM 240.00",
            priceNum: 240,
            quantity: 6,
            total: "RM 1440.00"
        },
        {
            name: "Chateau Lafite Rothschild 2018",
            category: "Wine",
            price: "RM 4850.00",
            priceNum: 4850,
            quantity: 1,
            total: "RM 4850.00"
        }
    ]
};

async function test() {
    console.log("Testing jsPDF generation...");
    try {
        const buffer = await generateInvoicePdf(mockData);
        const outputPath = path.join(__dirname, 'test_output_jspdf.pdf');
        fs.writeFileSync(outputPath, buffer);
        console.log(`PDF successfully generated at: ${outputPath}`);
        console.log(`Buffer size: ${buffer.length} bytes`);
    } catch (err) {
        console.error("PDF generation failed:", err);
    }
}

test();
