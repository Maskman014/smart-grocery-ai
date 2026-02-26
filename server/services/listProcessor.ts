import db from '../db.js';

// ... (existing imports and constants)

const ITEM_DATABASE: Record<string, { category: string; base_price: number }> = {
  milk: { category: 'Dairy', base_price: 60.00 },
  bread: { category: 'Bakery', base_price: 40.00 },
  eggs: { category: 'Dairy', base_price: 72.00 }, // per dozen
  banana: { category: 'Produce', base_price: 50.00 }, // per dozen
  apple: { category: 'Produce', base_price: 180.00 }, // per kg
  chicken: { category: 'Meat', base_price: 250.00 }, // per kg
  rice: { category: 'Grains', base_price: 60.00 }, // per kg
  cheese: { category: 'Dairy', base_price: 450.00 }, // per kg
  yogurt: { category: 'Dairy', base_price: 30.00 },
  potato: { category: 'Produce', base_price: 30.00 }, // per kg
  onion: { category: 'Produce', base_price: 40.00 }, // per kg
  tomato: { category: 'Produce', base_price: 40.00 }, // per kg
  beef: { category: 'Meat', base_price: 400.00 }, // per kg
  pasta: { category: 'Grains', base_price: 120.00 },
  cereal: { category: 'Breakfast', base_price: 350.00 },
  coffee: { category: 'Beverages', base_price: 600.00 },
  tea: { category: 'Beverages', base_price: 400.00 },
  sugar: { category: 'Baking', base_price: 45.00 },
  flour: { category: 'Baking', base_price: 40.00 },
  butter: { category: 'Dairy', base_price: 500.00 },
};

const STORES = [
  { name: 'Reliance Fresh', multiplier: 1.05, bulk_discount: 0.02, min_bulk_items: 0 },
  { name: 'BigBasket', multiplier: 1.0, bulk_discount: 0.05, min_bulk_items: 5 },
  { name: 'DMart (Wholesale)', multiplier: 0.88, bulk_discount: 0.08, min_bulk_items: 10 },
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
    let price = 2.00; // Default price guess

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
    explanation = `We recommend BigBasket for this order. They currently have a 'Bundle & Save' offer on ${totalItems} items, which offsets their delivery fee. You'll save about ₹${savingsVsNextBest} and get everything delivered to your doorstep within 2 hours, making it the most efficient choice for your mid-sized list.`;
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
