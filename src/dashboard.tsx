import { useState, useEffect } from "react";
import Sidebar from "./assets/components/sidebar";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "../src/supabaseClient";
import "../src/assets/css/dashboard.css";

interface InventoryProduct {
  id: string;
  product_name: string;
  category: string;
  price: number;
  stock: number;
  min_stock: number;
  unit: string;
  status: string;
  created_at: string;
}

interface Sale {
  sale_id: string;
  total_amount: number;
  sale_date: string;
  user_id: string;
}

interface SalesItem {
  sales_item_id: number;
  sale_id: string;
  product_id: number;
  quantity: number;
  price: number;
  subtotal: number;
  products?: { product_name: string };
}

const Dashboard = () => {
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");

  // --- Fetch Inventory Products ---
  useEffect(() => {
    const fetchInventoryProducts = async () => {
      const { data, error } = await supabase.from("inventory_products").select("*");
      if (!error) setInventoryProducts(data || []);
    };
    fetchInventoryProducts();
  }, []);

  // --- Fetch Sales ---
  useEffect(() => {
    const fetchSales = async () => {
      const { data, error } = await supabase.from("sales").select("*");
      if (!error) setSales(data || []);
    };
    fetchSales();
  }, []);

  // --- Fetch Sales Items ---
  useEffect(() => {
    const fetchSalesItems = async () => {
      const { data, error } = await supabase
        .from("sales_items")
        .select(`sales_item_id, sale_id, product_id, quantity, price, subtotal, products (product_name)`);
      if (!error)
        setSalesItems(
          (data || []).map((item: any) => ({
            ...item,
            products: Array.isArray(item.products) ? item.products[0] : item.products,
          }))
        );
    };
    fetchSalesItems();
  }, []);

  // --- Filtered Inventory Products ---
  const filteredInventoryProducts = inventoryProducts.filter(p =>
    p.product_name.toLowerCase().includes(inventorySearchQuery.toLowerCase())
  );

  // --- Top Seller This Month ---
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const salesItemsThisMonth = salesItems.filter(item => {
    const sale = sales.find(s => s.sale_id === item.sale_id);
    if (!sale) return false;
    const saleDate = new Date(sale.sale_date);
    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
  });

  const topSellerMonth = salesItemsThisMonth.reduce<{ [key: string]: number }>((acc, item) => {
    acc[item.products?.product_name || "Unknown"] =
      (acc[item.products?.product_name || "Unknown"] || 0) + item.quantity;
    return acc;
  }, {});

  const topSellerNameMonth = Object.keys(topSellerMonth).reduce(
    (a, b) => (topSellerMonth[a] > topSellerMonth[b] ? a : b),
    ""
  );

  // --- Compute totals for top cards ---
  const totalSalesAmount = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const totalItemsSold = salesItems.reduce((sum, item) => sum + item.quantity, 0);

  // --- Monthly Sales Data ---
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlySalesData: { month: string; sales: number }[] = [];
  sales.forEach(sale => {
    const date = new Date(sale.sale_date);
    const month = monthNames[date.getMonth()] + " " + date.getFullYear();
    const existing = monthlySalesData.find(d => d.month === month);
    if (existing) existing.sales += Number(sale.total_amount);
    else monthlySalesData.push({ month, sales: Number(sale.total_amount) });
  });

  // --- Weekly Sales Data (current month) ---
  const currentMonthSales = sales.filter(sale => {
    const date = new Date(sale.sale_date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const getWeekOfMonth = (date: Date) => Math.ceil(date.getDate() / 7);

  const weeklySalesData: { week: string; sales: number }[] = [];
  currentMonthSales.forEach(sale => {
    const date = new Date(sale.sale_date);
    const weekNum = getWeekOfMonth(date);
    const weekLabel = `Week ${weekNum}`;
    const existing = weeklySalesData.find(d => d.week === weekLabel);
    if (existing) existing.sales += Number(sale.total_amount);
    else weeklySalesData.push({ week: weekLabel, sales: Number(sale.total_amount) });
  });

  return (
    <div className="dashboard">
      <Sidebar />

      <div className="dashboard__content">
        {/* --- Top Cards --- */}
        <div className="cards-row">
          <div className="card">
            <h3>Total Sales</h3>
            <p>₱ {totalSalesAmount.toFixed(2)}</p>
          </div>
          <div className="card">
            <h3>Top Seller (This Month)</h3>
            <p>{topSellerNameMonth || "N/A"}</p>
          </div>
          <div className="card">
            <h3>Total Items Sold</h3>
            <p>{totalItemsSold}</p>
          </div>
        </div>

        {/* --- Charts Row --- */}
        <div className="charts-row">
          <div className="card">
            <h3>Monthly Sales</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlySalesData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#6f4e37" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3>Weekly Sales (Current Month)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklySalesData}>
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#FF7F50" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- Inventory Section --- */}
        <div className="inventory-section">
          <h2>Inventory</h2>
          <div className="inventory-tables-row">
            <div className="card product-inventory">
              <h3>Inventory Products</h3>
              <input
                type="text"
                placeholder="Search inventory..."
                value={inventorySearchQuery}
                onChange={e => setInventorySearchQuery(e.target.value)}
                className="search-input"
              />
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Min Stock</th>
                    <th>Unit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventoryProducts.map(p => (
                    <tr key={p.id}>
                      <td>{p.product_name}</td>
                      <td>{p.category}</td>
                      <td style={{ textAlign: "right" }}>{p.stock}</td>
                      <td style={{ textAlign: "right" }}>{p.min_stock || 0}</td>
                      <td>{p.unit || "pcs"}</td>
                      <td
                        style={{
                          color: p.stock <= (p.min_stock || 0) ? "red" : "green",
                          fontWeight: "bold",
                          textAlign: "center",
                        }}
                      >
                        {p.stock <= (p.min_stock || 0) ? "Low" : "OK"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* --- Recent Orders --- */}
        <div className="card recent-orders">
          <h3>Recent Orders</h3>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price/unit</th>
                <th>Subtotal</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {salesItems.map((item, idx) => {
                const sale = sales.find(s => s.sale_id === item.sale_id);
                if (!sale) return null;
                const subtotal = item.quantity * item.price;
                return (
                  <tr key={`${item.sales_item_id}-${idx}`}>
                    <td>{item.products?.product_name ?? "Unknown Product"}</td>
                    <td>{item.quantity}</td>
                    <td>₱{item.price.toFixed(2)}</td>
                    <td>₱{subtotal.toFixed(2)}</td>
                    <td>{new Date(sale.sale_date).toLocaleString("en-PH")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
