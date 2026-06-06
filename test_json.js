const query = 'Check craft beer';
const top3 = [
    { name: 'Beer A', category: 'beer', price: 'RM 10.00', description: 'Desc A', image_url: 'url', badge: 'TERSEDIA', whatsapp_message: 'Hi' }
];
const result = {
    summary: 'Jumpa ' + top3.length + ' produk untuk "' + query + '":',
    products: top3
};
const reply = 'TOOL_RESULT_PRODUCT_CARDS:' + JSON.stringify(result);
console.log("REPLY LENGTH:", reply.length);
try {
  const data = JSON.parse(reply.substring('TOOL_RESULT_PRODUCT_CARDS:'.length));
  console.log('Parsed successfully:', data);
} catch (e) {
  console.error('Parse error:', e);
}
