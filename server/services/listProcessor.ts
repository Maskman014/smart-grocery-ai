import db from '../db.js';

// ... (existing imports and constants)

const ITEM_DATABASE: Record<string, { category: string; base_price: number }> = {
  milk: { category: 'Dairy', base_price: 3.50 },
  bread: { category: 'Bakery', base_price: 2.50 },
  eggs: { category: 'Dairy', base_price: 4.00 },
  banana: { category: 'Produce', base_price: 0.50 },
  apple: { category: 'Produce', base_price: 0.80 },
  chicken: { category: 'Meat', base_price: 8.00 },
  rice: { category: 'Grains', base_price: 5.00 },
  cheese: { category: 'Dairy', base_price: 6.00 },
  yogurt: { category: 'Dairy', base_price: 1.20 },
  potato: { category: 'Produce', base_price: 0.60 },
  onion: { category: 'Produce', base_price: 0.70 },
  tomato: { category: 'Produce', base_price: 0.90 },
  beef: { category: 'Meat', base_price: 12.00 },
  pasta: { category: 'Grains', base_price: 2.00 },
  cereal: { category: 'Breakfast', base_price: 4.50 },
  coffee: { category: 'Beverages', base_price: 10.00 },
  tea: { category: 'Beverages', base_price: 4.00 },
  sugar: { category: 'Baking', base_price: 2.50 },
  flour: { category: 'Baking', base_price: 3.00 },
  butter: { category: 'Dairy', base_price: 5.00 },
};

const STORES = [
  { name: 'Local Market', multiplier: 1.1, bulk_discount: 0.0, min_bulk_items: 0 },
  { name: 'SuperMart', multiplier: 1.0, bulk_discount: 0.05, min_bulk_items: 5 },
  { name: 'Wholesale Club', multiplier: 0.85, bulk_discount: 0.1, min_bulk_items: 10 },
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
  let bestStore = STORES[0];
  let lowestCost = Infinity;
  let explanation = "";

  for (const store of STORES) {
    let storeCost = totalBaseCost * store.multiplier;
    
    // Apply bulk discount
    if (totalItems >= store.min_bulk_items) {
      storeCost = storeCost * (1 - store.bulk_discount);
    }

    // Apply history bias (loyalty discount simulation)
    if (store.name === favoriteStore) {
      storeCost = storeCost * 0.95; // 5% "loyalty" bonus in calculation
    }

    if (storeCost < lowestCost) {
      lowestCost = storeCost;
      bestStore = store;
    }
  }

  // Generate Explanation
  if (bestStore.name === 'Wholesale Club') {
    explanation = `Recommended Wholesale Club because you are buying in bulk (${totalItems} items). The 15% lower base prices plus 10% bulk discount saves you the most.`;
  } else if (bestStore.name === 'SuperMart') {
    explanation = `SuperMart is the best balance. You have enough items for a 5% discount, but not enough to justify the Wholesale Club trip.`;
  } else {
    explanation = `Local Market is best for small trips. You only have a few items, so convenience outweighs the bulk savings.`;
  }

  if (favoriteStore && bestStore.name === favoriteStore) {
    explanation += ` Plus, it aligns with your recent shopping habits!`;
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
