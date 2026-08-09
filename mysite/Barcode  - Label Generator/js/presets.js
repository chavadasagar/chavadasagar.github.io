/**
 * Label Presets and Dimension Standards for Thermal Printers
 */

const LabelPresets = [
  {
    id: '50x25',
    name: '50 × 25 mm (2" × 1")',
    width: 50,
    height: 25,
    unit: 'mm',
    category: 'Retail & Shelf',
    description: 'Most popular retail price tag and barcode sticker size',
    barcodeHeight: 36,
    titleSize: 10,
    priceSize: 13,
    skuSize: 8,
    padding: 2
  },
  {
    id: '40x20',
    name: '40 × 20 mm (1.5" × 0.8")',
    width: 40,
    height: 20,
    unit: 'mm',
    category: 'Compact & Jewelry',
    description: 'Small items, cables, cosmetics, jewelry and electronics',
    barcodeHeight: 28,
    titleSize: 8.5,
    priceSize: 11,
    skuSize: 7.5,
    padding: 1.5
  },
  {
    id: '50x30',
    name: '50 × 30 mm (2" × 1.2")',
    width: 50,
    height: 30,
    unit: 'mm',
    category: 'Retail & Apparel',
    description: 'Garments, clothing tags, price & size stickers',
    barcodeHeight: 42,
    titleSize: 11,
    priceSize: 14,
    skuSize: 9,
    padding: 2.5
  },
  {
    id: '60x40',
    name: '60 × 40 mm (2.4" × 1.6")',
    width: 60,
    height: 40,
    unit: 'mm',
    category: 'Product & Box',
    description: 'Standard packaged product, carton, and box labels',
    barcodeHeight: 52,
    titleSize: 12,
    priceSize: 16,
    skuSize: 10,
    padding: 3
  },
  {
    id: '75x50',
    name: '75 × 50 mm (3" × 2")',
    width: 75,
    height: 50,
    unit: 'mm',
    category: 'Warehouse & Bin',
    description: 'Warehouse location, inventory bin, shipping carton',
    barcodeHeight: 65,
    titleSize: 14,
    priceSize: 18,
    skuSize: 11,
    padding: 4
  },
  {
    id: '100x50',
    name: '100 × 50 mm (4" × 2")',
    width: 100,
    height: 50,
    unit: 'mm',
    category: 'Logistics',
    description: 'Pallet, container, asset tracking, wide barcode tag',
    barcodeHeight: 70,
    titleSize: 15,
    priceSize: 20,
    skuSize: 12,
    padding: 4
  },
  {
    id: '100x150',
    name: '100 × 150 mm (4" × 6")',
    width: 100,
    height: 150,
    unit: 'mm',
    category: 'Shipping & Courier',
    description: 'Standard 4x6 courier shipping label (Zebra, Munbyn, Rollo)',
    barcodeHeight: 120,
    titleSize: 18,
    priceSize: 24,
    skuSize: 14,
    padding: 6
  },
  {
    id: 'a4_24',
    name: 'A4 Sheet (24 labels - 70×37mm)',
    width: 70,
    height: 37,
    unit: 'mm',
    category: 'A4 Sticker Sheets',
    description: 'Standard 3x8 laser/inkjet label sheets (Avery 7160)',
    barcodeHeight: 45,
    titleSize: 11,
    priceSize: 14,
    skuSize: 9,
    padding: 3
  },
  {
    id: 'custom',
    name: 'Custom Dimensions...',
    width: 50,
    height: 25,
    unit: 'mm',
    category: 'Custom',
    description: 'User specified width and height in mm',
    barcodeHeight: 38,
    titleSize: 10,
    priceSize: 13,
    skuSize: 8,
    padding: 2
  }
];

if (typeof window !== 'undefined') {
  window.LabelPresets = LabelPresets;
}
