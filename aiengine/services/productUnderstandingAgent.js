export async function enrichRequest(rawDescription) {
    const text = rawDescription.toLowerCase();
  
    let quantity = null;
    const qtyMatch = text.match(/(\d+)\s*(units|pcs|pieces|routers|laptops|items)?/);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
    }
  
    let destination_country = null;
    if (text.includes('india')) {
      destination_country = 'India';
    } else if (text.includes('usa') || text.includes('united states')) {
      destination_country = 'USA';
    }
  
    let currency = null;
    if (text.includes('inr') || text.includes('₹') || text.includes('lakh')) {
      currency = 'INR';
    } else if (text.includes('usd') || text.includes('$')) {
      currency = 'USD';
    }
  
    let urgency = 'normal';
    if (text.includes('urgent') || text.includes('asap') || text.includes('immediately')) {
      urgency = 'urgent';
    }
  
    let title = 'Requested product';
    let category = null;
    if (text.includes('laptop')) {
      title = 'Laptops';
      category = 'Electronics';
    } else if (text.includes('router')) {
      title = 'Routers';
      category = 'Networking';
    }
  
    return {
      title,
      category,
      specs: { raw: rawDescription },
      quantity,
      budget_min: null,
      budget_max: null,
      currency,
      destination_country,
      urgency,
      notes: null,
    };
  }