const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Copy generated images from the brain folder to public/products/
const brainDir = 'C:\\Users\\eddyr\\.gemini\\antigravity-ide\\brain\\3cbb7ac8-038e-448b-a9fd-1ca72abd13f2';
const publicProductsDir = path.join(__dirname, '..', 'public', 'products');

// Create public/products dir if it doesn't exist
if (!fs.existsSync(publicProductsDir)) {
  fs.mkdirSync(publicProductsDir, { recursive: true });
}

const imagesToCopy = [
  { srcName: 'macallan_18_1779940747826.png', destName: 'macallan_18.png' },
  { srcName: 'jw_blue_1779940769090.png', destName: 'jw_blue.png' },
  { srcName: 'penfolds_bin_389_1779940793140.png', destName: 'penfolds_bin_389.png' },
  { srcName: 'brewdog_punk_ipa_1779940811717.png', destName: 'brewdog_punk_ipa.png' }
];

console.log('Copying images...');
imagesToCopy.forEach(img => {
  const srcPath = path.join(brainDir, img.srcName);
  const destPath = path.join(publicProductsDir, img.destName);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${img.srcName} to ${destPath}`);
  } else {
    console.warn(`Source image not found: ${srcPath}`);
  }
});

// 2. Connect to Supabase and update products
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}="?([^"\n]+)"?`));
  return match ? match[1] : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const storeId = '00000000-0000-0000-0000-000000000000';

const productsToUpsert = [
  // Existing products to update
  {
    id: '698c2534-fdbd-43f1-ac66-d87213a4b9fe',
    store_id: storeId,
    name: 'Macallan 18 Year Double Cask',
    category: 'Whisky',
    price: 1450.00,
    stock_status: 'in_stock',
    stock_quantity: 15,
    image_url: '/products/macallan_18.png',
    description: 'An exquisite single malt Scotch whisky matured in a harmonious union of American and European sherry seasoned oak casks. Rich aromas of dried fruit, ginger, and sweet butterscotch, leading to a warm oak finish.'
  },
  {
    id: '882b8ac3-5b09-4e7e-8c56-f9a5aa8b82da',
    store_id: storeId,
    name: 'Johnnie Walker Blue Label',
    category: 'Whisky',
    price: 920.00,
    stock_status: 'in_stock',
    stock_quantity: 8,
    image_url: '/products/jw_blue.png',
    description: "An unrivaled masterpiece. An exquisite blend of Scotland's rarest and most exceptional whiskies. Velvety smooth with layers of dried fruits, citrus smoke, honey, sweet spice, and complex wood notes."
  },
  {
    id: 'a530053a-442e-460a-a3b3-bf8f6e57cf4e',
    store_id: storeId,
    name: 'Glenfiddich 15 Year Solera',
    category: 'Whisky',
    price: 380.00,
    stock_status: 'in_stock',
    stock_quantity: 24,
    image_url: '/products/macallan_18.png',
    description: 'Intriguingly complex and exceptionally smooth. Matured in European oak sherry casks and new oak casks, then mellowed in our unique Solera Vat. Boasts warm spice, honey, and rich fruit flavors.'
  },
  {
    id: '330d67b2-4184-41bc-8ebc-ba7a44c0a24e',
    store_id: storeId,
    name: 'Yamazaki 12 Year Single Malt',
    category: 'Whisky',
    price: 1250.00,
    stock_status: 'out_of_stock',
    stock_quantity: 0,
    image_url: '/products/jw_blue.png',
    description: "Suntory's flagship single malt whisky. A delicate yet complex profile characterized by notes of succulent peach, pineapple, grapefruit, Japanese oak (mizunara), and a long, spicy finish."
  },
  {
    id: '71ad76d8-2b1d-4556-b2bf-57e0402f2abc',
    store_id: storeId,
    name: 'Penfolds Bin 389 Cabernet Shiraz',
    category: 'Wine',
    price: 340.00,
    stock_status: 'in_stock',
    stock_quantity: 45,
    image_url: '/products/penfolds_bin_389.png',
    description: "Often referred to as 'Baby Grange', Bin 389 is a quintessential Australian red wine. A masterfully balanced blend of Cabernet Sauvignon and Shiraz, offering rich dark fruit, sweet oak, and smooth tannins."
  },
  {
    id: 'c43f6670-5265-4d61-b49a-89090df9f4af',
    store_id: storeId,
    name: 'BrewDog Punk IPA',
    category: 'Craft Beer',
    price: 180.00,
    stock_status: 'in_stock',
    stock_quantity: 18,
    image_url: '/products/brewdog_punk_ipa.png',
    description: 'The iconic post-modern classic IPA that started a revolution. Light golden in color, bursting with tropical fruits, pineapple, and sharp grapefruit aromas, balanced by a spiky, bitter finish.'
  },
  // New products to add
  {
    id: '11111111-1111-1111-1111-111111111111',
    store_id: storeId,
    name: 'Château Lafite Rothschild 2018',
    category: 'Wine',
    price: 4850.00,
    stock_status: 'in_stock',
    stock_quantity: 3,
    image_url: '/products/penfolds_bin_389.png',
    description: 'A legendary Premier Grand Cru Classé from Pauillac, Bordeaux. An exceptionally deep, structured vintage offering magnificent layers of black currant, graphite, cedar, and velvety tannins. Cellar worthy.'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    store_id: storeId,
    name: 'Duvel Belgian Golden Ale',
    category: 'Craft Beer',
    price: 240.00,
    stock_status: 'out_of_stock',
    stock_quantity: 0,
    image_url: '/products/brewdog_punk_ipa.png',
    description: 'A natural beer with a subtle bitterness, a refined flavor, and a distinctive hop character. Brewed with premium barley, Styrian Goldings and Saaz hops. Delivers a robust and high-carbonation finish.'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    store_id: storeId,
    name: 'Heineken Lager Beer Carton (24x320ml)',
    category: 'Beer',
    price: 155.00,
    stock_status: 'in_stock',
    stock_quantity: 100,
    image_url: '/products/brewdog_punk_ipa.png',
    description: 'The classic premium lager. A perfectly carbonated alcoholic beverage with a refreshing bitterness and subtle fruity notes.'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    store_id: storeId,
    name: 'Chivas Regal 12 Year Old',
    category: 'Whisky',
    price: 280.00,
    stock_status: 'in_stock',
    stock_quantity: 40,
    image_url: '/products/jw_blue.png',
    description: 'A rich and generous blended Scotch whisky. Radiant, warm amber color with an aromatic infusion of wild herbs, heather, honey, and orchard fruits.'
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    store_id: storeId,
    name: 'Jack Daniel\\'s Old No. 7 Tennessee Whiskey',
    category: 'Whisky',
    price: 250.00,
    stock_status: 'in_stock',
    stock_quantity: 50,
    image_url: '/products/jw_blue.png',
    description: 'Mellowed drop by drop through 10-feet of sugar maple charcoal, then matured in handcrafted barrels of our own making. Smooth with notes of vanilla, toasted oak, and caramel.'
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    store_id: storeId,
    name: 'Moët & Chandon Impérial Brut',
    category: 'Champagne',
    price: 320.00,
    stock_status: 'in_stock',
    stock_quantity: 20,
    image_url: '/products/penfolds_bin_389.png',
    description: 'The iconic Champagne of the House. Created in 1869, it embodies Moët & Chandon’s unique style, a style distinguished by its bright fruitiness, its seductive palate, and its elegant maturity.'
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    store_id: storeId,
    name: 'Hennessy V.S.O.P Privilège Cognac',
    category: 'Cognac',
    price: 450.00,
    stock_status: 'in_stock',
    stock_quantity: 15,
    image_url: '/products/jw_blue.png',
    description: 'A balanced and harmonious cognac expressing 200 years of Hennessy\'s know-how. Aromas of fresh fruit and vanilla, with a smooth, perfectly balanced palate.'
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    store_id: storeId,
    name: 'Grey Goose Vodka',
    category: 'Vodka',
    price: 210.00,
    stock_status: 'in_stock',
    stock_quantity: 30,
    image_url: '/products/jw_blue.png',
    description: 'Crafted using the finest French winter wheat and spring water from the Cognac region. Exceptionally smooth, crisp, and clean.'
  },
  {
    id: '99999999-9999-9999-9999-999999999999',
    store_id: storeId,
    name: 'Suntory Roku Gin',
    category: 'Gin',
    price: 180.00,
    stock_status: 'in_stock',
    stock_quantity: 25,
    image_url: '/products/jw_blue.png',
    description: 'A perfectly balanced, exceptional gin crafted by Japanese artisans. Contains 6 uniquely Japanese botanicals including Sakura flower, Sakura leaf, Yuzu peel, Sencha tea, Gyokuro tea, and Sansho pepper.'
  }
];

async function run() {
  console.log('Upserting products into Supabase...');
  for (const product of productsToUpsert) {
    const { error } = await supabase.from('products').upsert(product);
    if (error) {
      console.error(`Failed to upsert product ${product.name}:`, error);
    } else {
      console.log(`Successfully upserted: ${product.name}`);
    }
  }
  console.log('Database product update complete!');
}

run();
