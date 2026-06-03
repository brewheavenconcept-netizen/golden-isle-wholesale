// scripts/send_test_email.js
// Tests BOTH the /api/chat order email AND the new /api/invoice/:id POST email
// Run: node scripts/send_test_email.js

const BASE = "http://localhost:3000";
const RECIPIENT = "jiangeddy3@gmail.com";

// ── Test 1: New clean white invoice via POST /api/invoice/:id ─────────────
async function testInvoicePost() {
  console.log("\n📧 [1/2] Sending clean invoice via POST /api/invoice/...");
  const res = await fetch(`${BASE}/api/invoice/INV-1780454984769`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerEmail: RECIPIENT,
      customerName: "Eddy Jiang",
      items: [
        {
          name: "Duvel Belgian Golden Ale",
          description: "Premium Ale",
          quantity: 5,
          priceNum: 240,
          imageUrl: "https://images.unsplash.com/photo-1569919659476-f0852f682859?q=80&w=96&auto=format&fit=crop"
        }
      ],
      issueDate: "3 Jun 2026",
      dueDate: "10 Jun 2026",
      taxRate: 0.08
    })
  });
  const text = await res.text();
  if (res.ok) console.log("✅ Invoice POST success:", text);
  else        console.warn("⚠️  Invoice POST failed:", res.status, text);
}

// ── Test 2: Legacy order_created email via /api/chat ────────────────────
async function testOrderCreated() {
  console.log("\n📦 [2/2] Sending order_created email via /api/chat...");
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "order_created",
      orderId: "ORD-1780454984769",
      email: RECIPIENT,
      name: "Eddy Jiang",
      phone: "60123456789",
      cart: [
        {
          name: "Duvel Belgian Golden Ale",
          quantity: 5,
          price: "RM 240.00",
          priceNum: 240,
          category: "Premium Ale",
          image_url: "https://images.unsplash.com/photo-1569919659476-f0852f682859?q=80&w=120&auto=format&fit=crop"
        }
      ]
    })
  });
  const text = await res.text();
  if (res.ok) console.log("✅ Order email success:", text);
  else        console.warn("⚠️  Order email failed:", res.status, text);
}

// ── Run both ─────────────────────────────────────────────────────────────
(async () => {
  try {
    await testInvoicePost();
    await testOrderCreated();
    console.log("\n✅ All done — check jiangeddy3@gmail.com\n");
  } catch (e) {
    console.error("❌ Network error:", e.message);
  }
})();
