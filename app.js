// =========================
// CONFIG (SUPABASE)
// =========================
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_KEY = window.SUPABASE_ANON_KEY;

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =========================
// INVENTORY LOGIC
// =========================
async function fetchInventory() {
  const { data, error } = await supabase.from("inventory_items").select("*");
  if (error) return console.error(error);

  renderInventory(data);
  updateInventoryKPIs(data);
}

function renderInventory(items) {
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8">No inventory yet</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => {
    const available = item.on_hand_qty - item.reserved_qty;
    const isLow = available <= item.low_stock_alert;

    return `
      <tr>
        <td>${item.product_name}</td>
        <td>${item.variant} / ${item.size}</td>
        <td>${item.on_hand_qty}</td>
        <td>${item.production_qty}</td>
        <td>${item.reserved_qty}</td>
        <td>${available}</td>
        <td>${isLow ? "Low" : "OK"}</td>
        <td>
          <button onclick="editInventory('${item.id}')">Edit</button>
        </td>
      </tr>
    `;
  }).join("");
}

function updateInventoryKPIs(items) {
  const total = items.length;
  const onHand = items.reduce((a,b)=>a+b.on_hand_qty,0);
  const production = items.reduce((a,b)=>a+b.production_qty,0);
  const reserved = items.reduce((a,b)=>a+b.reserved_qty,0);
  const available = items.reduce((a,b)=>a+(b.on_hand_qty - b.reserved_qty),0);

  document.getElementById("kpiTotalVariants").textContent = total;
  document.getElementById("kpiOnHandUnits").textContent = onHand;
  document.getElementById("kpiProductionUnits").textContent = production;
  document.getElementById("kpiReservedUnits").textContent = reserved;
  document.getElementById("kpiAvailableUnits").textContent = available;
}

// =========================
// SAVE INVENTORY
// =========================
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "inventoryForm") return;

  e.preventDefault();

  const payload = {
    category: document.getElementById("invCategory").value,
    product_name: document.getElementById("invProductName").value,
    variant: document.getElementById("invVariant").value,
    size: document.getElementById("invSize").value,
    on_hand_qty: Number(document.getElementById("invOnHandQty").value),
    production_qty: Number(document.getElementById("invProductionQty").value),
    reserved_qty: Number(document.getElementById("invReservedQty").value),
    low_stock_alert: Number(document.getElementById("invLowStockAlert").value),
  };

  const { error } = await supabase.from("inventory_items").insert([payload]);

  if (error) {
    console.error(error);
    alert("Error saving inventory");
  } else {
    alert("Saved!");
    fetchInventory();
  }
});

// =========================
// ORDER STOCK DEDUCTION
// =========================
async function deductStock(orderItems, orderType) {
  for (const item of orderItems) {
    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("product_name", item.product)
      .eq("variant", item.variant)
      .eq("size", item.size)
      .single();

    if (!data) continue;

    if (orderType === "onhand") {
      await supabase
        .from("inventory_items")
        .update({
          on_hand_qty: data.on_hand_qty - item.qty
        })
        .eq("id", data.id);
    }

    if (orderType === "mto") {
      await supabase
        .from("inventory_items")
        .update({
          production_qty: data.production_qty - item.qty
        })
        .eq("id", data.id);
    }
  }
}

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
  fetchInventory();
});