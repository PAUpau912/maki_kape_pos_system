import { useState, useEffect } from "react";
import Sidebar from "./assets/components/sidebar";
import { supabase } from "../src/supabaseClient";
import "../src/assets/css/inventory.css";

/* ================= INTERFACES ================= */

interface InventoryProduct {
  id: number;
  product_name: string;
  category: string;
  price: string;      // keep as string for form inputs
  stock: string;
  min_stock: string;
  unit: string;
  status: string;
}

interface Product {
  product_id: number;
  product_name: string;
  category_id: number;
  category_name?: string;
  price: number;
  stock: number;
  status: string;
}

/* ================= COMPONENT ================= */

const Inventory = () => {
  const [items, setItems] = useState<InventoryProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryProduct | null>(null);

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productForm, setProductForm] = useState({
    price: 0,
    stock: 0,
    status: "available",
  });

  const [form, setForm] = useState({
    product_name: "",
    category: "",
    price: "",
    stock: "",
    min_stock: "",
    unit: "",
  });

  /* ================= FETCH INVENTORY ================= */
  const fetchSupplies = async () => {
    const { data } = await supabase
      .from("inventory_products")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data || []);
  };

  /* ================= FETCH PRODUCTS ================= */
  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select(`product_id, product_name, category_id, price, stock, status, categories(category_name)`);

    const formatted = data?.map((p: any) => ({
      ...p,
      category_name: p.categories?.category_name || "Unknown",
    })) || [];

    setProducts(formatted);
  };

  useEffect(() => {
    fetchSupplies();
    fetchProducts();
  }, []);

  /* ================= SAVE INVENTORY ================= */
  const handleSave = async () => {
    const priceNum = Number(form.price);
    const stockNum = Number(form.stock);
    const minStockNum = Number(form.min_stock);
    const status = stockNum <= minStockNum ? "LOW STOCK" : "IN STOCK";

    if (!form.product_name || !form.category) {
      alert("Please fill all required fields!");
      return;
    }

    if (editingItem) {
      await supabase
        .from("inventory_products")
        .update({
          product_name: form.product_name,
          category: form.category,
          price: priceNum,
          stock: stockNum,
          min_stock: minStockNum,
          unit: form.unit,
          status,
        })
        .eq("id", editingItem.id);
    } else {
      await supabase.from("inventory_products").insert({
        product_name: form.product_name,
        category: form.category,
        price: priceNum,
        stock: stockNum,
        min_stock: minStockNum,
        unit: form.unit,
        status,
      });
    }

    setShowModal(false);
    fetchSupplies();
  };

  /* ================= PRODUCT EDIT ================= */
  const startEditProduct = (p: Product) => {
    setEditingProductId(p.product_id);
    setProductForm({
      price: p.price,
      stock: p.stock,
      status: p.status.toLowerCase(),
    });
  };

  const saveProduct = async (id: number) => {
    const { error } = await supabase
      .from("products")
      .update({
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        status: productForm.status.toLowerCase(),
      })
      .eq("product_id", id);

    if (error) {
      console.error("Update error:", error.message);
      return;
    }

    setEditingProductId(null);
    fetchProducts();
  };

  /* ================= FILTERS ================= */
  const filteredItems = items.filter(i =>
    i.product_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = products
    .filter(p => p.product_name.toLowerCase().includes(productSearch.toLowerCase()))
    .filter(p => categoryFilter === "" || p.category_name === categoryFilter);

  const uniqueCategories = Array.from(new Set(products.map(p => p.category_name || "Unknown")));

  /* ================= UI ================= */
  return (
    <div className="inventory-container">
      <Sidebar />

      <div className="inventory-main">
        <h2>Supplies Inventory</h2>

        <div className="inventory-header">
          <input
            className="inventory-search"
            placeholder="Search supply..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            className="btn-add-inventory"
            onClick={() => {
              setEditingItem(null);
              setForm({
                product_name: "",
                category: "",
                price: "",
                stock: "",
                min_stock: "",
                unit: "",
              });
              setShowModal(true);
            }}
          >
            + Add Inventory
          </button>
        </div>

        <table className="inventory-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Unit</th>
              <th>Min</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id}>
                <td>{item.product_name}</td>
                <td>{item.category}</td>
                <td>{item.stock}</td>
                <td>{item.unit}</td>
                <td>{item.min_stock}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ================= MODAL ================= */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>{editingItem ? "Edit Inventory" : "Add Inventory"}</h3>
              <div className="modal-body">
                <input
                  placeholder="Product Name"
                  value={form.product_name}
                  onChange={e => setForm({ ...form, product_name: e.target.value })}
                />
                <input
                  placeholder="Category"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Stock"
                  value={form.stock}
                  onChange={e => setForm({ ...form, stock: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Min Stock"
                  value={form.min_stock}
                  onChange={e => setForm({ ...form, min_stock: e.target.value })}
                />
                <input
                  placeholder="Unit"
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button onClick={handleSave} className="btn-save">
                  {editingItem ? "Save Changes" : "Add Inventory"}
                </button>
                <button onClick={() => setShowModal(false)} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= PRODUCTS TABLE ================= */}
        <h2 style={{ marginTop: "40px" }}>Products</h2>

        <div className="filters-row">
          <input
            className="inventory-search"
            placeholder="Search product..."
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
          />
          <select
            className="category-filter"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => (
              <tr key={p.product_id}>
                <td>{p.product_name}</td>
                <td>{p.category_name}</td>

                {editingProductId === p.product_id ? (
                  <>
                    <td>
                      <input
                        className="edit-input"
                        type="number"
                        value={productForm.price}
                        onChange={e =>
                          setProductForm({ ...productForm, price: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="edit-input"
                        type="number"
                        value={productForm.stock}
                        onChange={e =>
                          setProductForm({ ...productForm, stock: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td>
                      <select
                        className={`edit-select ${productForm.status === "available" ? "available" : "unavailable"}`}
                        value={productForm.status}
                        onChange={e =>
                          setProductForm({ ...productForm, status: e.target.value.toLowerCase() })
                        }
                      >
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </td>
                    <td>
                      <button className="btn-save-product" onClick={() => saveProduct(p.product_id)}>
                        Save
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>₱{p.price}</td>
                    <td className={`stock-cell ${p.stock <= 0 ? "low" : "ok"}`}>{p.stock}</td>
                    <td>
                      <span className={`status-badge ${p.status.toLowerCase() === "available" ? "available" : "unavailable"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-edit-product" onClick={() => startEditProduct(p)}>
                        Edit
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
