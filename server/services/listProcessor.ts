import db from '../db.js';

// ... (existing imports and constants)

const ITEM_DATABASE: Record<string, { category: string; base_price: number }> = {
  milk: { category: 'Dairy', base_price: 64.00 }, // Corrected to realistic price (approx ₹32/500ml)
  bread: { category: 'Bakery', base_price: 50.00 },
  eggs: { category: 'Dairy', base_price: 84.00 }, // approx ₹7 per egg
  banana: { category: 'Produce', base_price: 60.00 }, // per dozen
  apple: { category: 'Produce', base_price: 200.00 }, // per kg
  chicken: { category: 'Meat', base_price: 240.00 }, // per kg
  rice: { category: 'Grains', base_price: 60.00 }, // per kg (Sona Masoori/Kolam)
  basmati: { category: 'Grains', base_price: 140.00 }, // per kg
  dal: { category: 'Grains', base_price: 160.00 }, // per kg (Toor/Arhar)
  toor: { category: 'Grains', base_price: 160.00 },
  moong: { category: 'Grains', base_price: 120.00 },
  masoor: { category: 'Grains', base_price: 100.00 },
  urad: { category: 'Grains', base_price: 140.00 },
  oil: { category: 'Pantry', base_price: 130.00 }, // per liter (Sunflower)
  ghee: { category: 'Pantry', base_price: 600.00 }, // per kg
  cheese: { category: 'Dairy', base_price: 450.00 }, // per kg
  yogurt: { category: 'Dairy', base_price: 40.00 },
  curd: { category: 'Dairy', base_price: 40.00 },
  paneer: { category: 'Dairy', base_price: 400.00 }, // per kg
  potato: { category: 'Produce', base_price: 35.00 }, // per kg
  onion: { category: 'Produce', base_price: 40.00 }, // per kg
  tomato: { category: 'Produce', base_price: 40.00 }, // per kg
  ginger: { category: 'Produce', base_price: 120.00 }, // per kg
  garlic: { category: 'Produce', base_price: 200.00 }, // per kg
  chilli: { category: 'Produce', base_price: 80.00 }, // per kg
  beef: { category: 'Meat', base_price: 400.00 }, // per kg
  mutton: { category: 'Meat', base_price: 800.00 }, // per kg
  fish: { category: 'Meat', base_price: 350.00 }, // per kg
  pasta: { category: 'Grains', base_price: 100.00 },
  maggi: { category: 'Grains', base_price: 14.00 }, // per pack
  noodles: { category: 'Grains', base_price: 50.00 },
  cereal: { category: 'Breakfast', base_price: 350.00 },
  coffee: { category: 'Beverages', base_price: 600.00 }, // Instant coffee jar
  tea: { category: 'Beverages', base_price: 400.00 }, // Premium tea powder
  sugar: { category: 'Baking', base_price: 44.00 },
  salt: { category: 'Pantry', base_price: 24.00 },
  flour: { category: 'Baking', base_price: 45.00 },
  atta: { category: 'Grains', base_price: 45.00 },
  maida: { category: 'Baking', base_price: 40.00 },
  butter: { category: 'Dairy', base_price: 540.00 },
  biscuits: { category: 'Snacks', base_price: 30.00 },
  chips: { category: 'Snacks', base_price: 20.00 },
  chocolate: { category: 'Snacks', base_price: 80.00 },
  soap: { category: 'Household', base_price: 40.00 },
  shampoo: { category: 'Household', base_price: 180.00 },
  toothpaste: { category: 'Household', base_price: 90.00 },
  detergent: { category: 'Household', base_price: 200.00 },
};

const STORES = [
  { name: 'Reliance Fresh', multiplier: 1.02, bulk_discount: 0.03, min_bulk_items: 5 },
  { name: 'BigBasket', multiplier: 1.0, bulk_discount: 0.05, min_bulk_items: 8 },
  { name: 'DMart (Wholesale)', multiplier: 0.96, bulk_discount: 0.08, min_bulk_items: 15 },
];

export interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimated_price: number;
}

export interface Recommendation {
  parsed_items: ParsedItem[];
  total_estimated_cost: number;
  analysis: {
    total_items: number;
    bulk_items: number;
    categories: Record<string, number>;
  };
  recommended_store: string;
  confidence_score: number;
  explanation_text: string;
}

export function processGroceryList(rawText: string, userId?: number): Recommendation {
  const lines = rawText.split(/[\n,]+/).map(line => line.trim()).filter(line => line.length > 0);
  const parsedItems: ParsedItem[] = [];
  let totalBaseCost = 0;

  // Regex to extract quantity, unit, and item name
  // Group 1: Qty (start), Group 2: Unit (start), Group 3: Name (start)
  // Group 4: Name (end), Group 5: Qty (end), Group 6: Unit (end)
  const units = "kg|g|l|ml|liter|liters|kilogram|kilograms|lb|lbs|oz|pcs|pack|box|dozen";
  
  // Pattern 1: "2kg rice" or "2 rice"
  const qtyFirstRegex = new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${units})?\\s*(?:x\\s*)?(.*)$`, 'i');
  
  // Pattern 2: "rice 2kg" or "rice 2"
  const qtyLastRegex = new RegExp(`^(.*)\\s+(\\d+(?:\\.\\d+)?)\\s*(${units})?$`, 'i');

  for (const line of lines) {
    let quantity = 1;
    let unit = 'qty';
    let name = line.toLowerCase();

    const matchFirst = line.match(qtyFirstRegex);
    const matchLast = line.match(qtyLastRegex);

    if (matchFirst) {
      quantity = parseFloat(matchFirst[1]);
      unit = matchFirst[2] ? matchFirst[2].toLowerCase() : 'qty';
      name = matchFirst[3].trim().toLowerCase();
    } else if (matchLast) {
      name = matchLast[1].trim().toLowerCase();
      quantity = parseFloat(matchLast[2]);
      unit = matchLast[3] ? matchLast[3].toLowerCase() : 'qty';
    }

    // Strip price info like (₹120) or - ₹120 from name
    name = name.replace(/\s*\(?₹\s*\d+(?:\.\d+)?\)?/g, '').replace(/\s*-\s*₹\s*\d+(?:\.\d+)?/g, '').trim();

    // Normalize units
    if (['kilogram', 'kilograms'].includes(unit)) unit = 'kg';
    if (['liter', 'liters'].includes(unit)) unit = 'l';
    if (['dozen'].includes(unit)) {
      quantity *= 12;
      unit = 'qty';
    }

    // Simple fuzzy match or direct lookup
    let bestMatchKey = Object.keys(ITEM_DATABASE).find(key => name.includes(key));
    
    // Default fallback
    let category = 'Uncategorized';
    let price = 50.00; // Default price guess (updated from 2.00)

    if (bestMatchKey) {
      const data = ITEM_DATABASE[bestMatchKey];
      category = data.category;
      price = data.base_price;
    }

    // Adjust price for specific units if needed (very basic logic)
    // Assuming base_price is per kg or per liter for bulk items, or per unit for others
    // For hackathon simplicity, we'll just multiply by quantity regardless of unit
    // unless it's grams/ml which are small
    let costMultiplier = quantity;
    if (unit === 'g' || unit === 'ml') {
      costMultiplier = quantity / 1000;
    }

    parsedItems.push({
      name: name,
      quantity: quantity,
      unit: unit,
      category: category,
      estimated_price: price * costMultiplier
    });

    totalBaseCost += price * costMultiplier;
  }

  // Analysis
  const totalItems = parsedItems.reduce((sum, item) => sum + item.quantity, 0);
  const categoryCounts: Record<string, number> = {};
  parsedItems.forEach(item => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + item.estimated_price;
  });

  // Fetch User History if userId provided
  let favoriteStore = '';
  if (userId) {
    try {
      const stmt = db.prepare('SELECT store_recommendation FROM grocery_lists WHERE user_id = ? ORDER BY created_at DESC LIMIT 5');
      const rows = stmt.all(userId) as { store_recommendation: string }[];
      if (rows.length > 0) {
        const storeCounts: Record<string, number> = {};
        rows.forEach(row => {
          storeCounts[row.store_recommendation] = (storeCounts[row.store_recommendation] || 0) + 1;
        });
        // Find store with max count
        favoriteStore = Object.keys(storeCounts).reduce((a, b) => storeCounts[a] > storeCounts[b] ? a : b);
      }
    } catch (e) {
      console.error('Error fetching history:', e);
    }
  }

  // Store Recommendation Logic
  const storesWithCosts = STORES.map(store => {
    let storeCost = totalBaseCost * store.multiplier;
    
    // Apply bulk discount
    if (totalItems >= store.min_bulk_items) {
      storeCost = storeCost * (1 - store.bulk_discount);
    }

    // Category-specific adjustments
    // Reliance is better for fresh produce
    if (store.name === 'Reliance Fresh' && (categoryCounts['Produce'] || 0) > (totalBaseCost * 0.3)) {
       storeCost *= 0.92; // 8% discount on produce-heavy lists
    }

    // BigBasket is better for small, quick lists (convenience)
    if (store.name === 'BigBasket' && totalItems < 8) {
       storeCost *= 0.95; // 5% convenience factor
    }

    // DMart is only good for really big bulk lists
    if (store.name === 'DMart (Wholesale)' && totalItems < 10) {
       storeCost *= 1.10; // 10% penalty for small lists (travel cost/time)
    }

    // Apply history bias (loyalty discount simulation)
    if (store.name === favoriteStore) {
      storeCost = storeCost * 0.95; // 5% "loyalty" bonus in calculation
    }

    return { ...store, totalCost: storeCost };
  }).sort((a, b) => a.totalCost - b.totalCost);

  const bestStore = storesWithCosts[0];
  const lowestCost = bestStore.totalCost;
  let explanation = "";

  // Generate Detailed Explanation
  const savingsVsNextBest = storesWithCosts.length > 1 
    ? Math.abs(storesWithCosts[1].totalCost - bestStore.totalCost).toFixed(2)
    : "0.00";
  
  if (bestStore.name === 'DMart (Wholesale)') {
    explanation = `DMart is your best bet for this list. By buying in bulk, you're saving approximately ₹${savingsVsNextBest} compared to retail stores. We've prioritized DMart because your list contains heavy staples like ${parsedItems[0]?.name || 'grains'} which are significantly cheaper at wholesale rates.`;
  } else if (bestStore.name === 'BigBasket') {
    explanation = `We recommend BigBasket for this order. For smaller lists like yours (${totalItems} items), their quick delivery and lack of minimum order surcharge makes them the most economical choice. You'll save about ₹${savingsVsNextBest} and save time compared to visiting a wholesale store.`;
  } else {
    explanation = `Reliance Fresh is the winner for this specific trip. Although their unit prices are slightly higher, their 'Freshness Guarantee' for ${parsedItems.find(i => i.category === 'Produce')?.name || 'vegetables'} and the lack of a minimum order value makes them ₹${savingsVsNextBest} cheaper than paying delivery fees elsewhere for a small list.`;
  }

  if (favoriteStore && bestStore.name === favoriteStore) {
    explanation += ` This also perfectly aligns with your preference for ${favoriteStore}, allowing you to collect loyalty points on this ₹${bestStore.totalCost.toFixed(2)} purchase!`;
  }

  return {
    parsed_items: parsedItems,
    total_estimated_cost: parseFloat(lowestCost.toFixed(2)),
    analysis: {
      total_items: totalItems,
      bulk_items: totalItems, // Simplified for now
      categories: categoryCounts
    },
    recommended_store: bestStore.name,
    confidence_score: 0.85 + (Math.random() * 0.1), // Mock confidence
    explanation_text: explanation
  };
}
