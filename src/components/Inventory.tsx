import React, { useState, useEffect } from 'react';
import { db, auth } from '@/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, getDoc, where } from 'firebase/firestore';
import { Product } from '@/types';
import { Plus, Search, Trash2, Edit2, Save, X, Barcode, Package, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn, playBeep } from '@/lib/utils';
import Scanner from '@/components/Scanner';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastLookedUp, setLastLookedUp] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    barcode: '',
    name: '',
    price: 0,
    stock_quantity: 0,
    tax_rate: 0
  });

  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const handleLookup = async (barcode: string) => {
    if (!barcode || !auth.currentUser) return;
    try {
      const productDoc = await getDoc(doc(db, 'products', `${barcode}_${auth.currentUser.uid}`));
      if (productDoc.exists()) {
        setLastLookedUp(productDoc.data() as Product);
        playBeep('success');
      } else {
        setLastLookedUp(null);
        toast.error('Product not found in inventory');
      }
    } catch (error) {
      toast.error('Lookup error');
    }
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'products'), 
      where('uid', '==', auth.currentUser.uid),
      orderBy('name')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Product);
      setProducts(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (product: Product) => {
    if (!auth.currentUser) return;
    try {
      const productWithUid = { ...product, uid: auth.currentUser.uid };
      await setDoc(doc(db, 'products', `${product.barcode}_${auth.currentUser.uid}`), productWithUid);
      toast.success('Product saved successfully');
      setIsEditing(null);
      if (!isEditing) {
        setNewProduct({ barcode: '', name: '', price: 0, stock_quantity: 0, tax_rate: 0 });
      }
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  const confirmDelete = async () => {
    if (!auth.currentUser || !productToDelete) return;
    try {
      await deleteDoc(doc(db, 'products', `${productToDelete}_${auth.currentUser.uid}`));
      toast.success('Product deleted');
      setProductToDelete(null);
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleDelete = (barcode: string) => {
    setProductToDelete(barcode);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold text-primary tracking-tight">Inventory Management</h2>
        <div className="flex gap-4 w-full md:w-auto">
          <button
            onClick={() => setShowScanner(true)}
            className="p-2 bg-accent text-white rounded-xl hover:bg-primary transition-all shadow-md flex items-center gap-2 px-4"
          >
            <Camera className="w-5 h-5" />
            <span className="text-xs font-bold uppercase">Scan</span>
          </button>
          <div className="relative w-full md:w-64">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 w-5 h-5" />
            <input
              type="text"
              placeholder="Quick Lookup..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-primary/10 focus:border-accent outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLookup((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 w-5 h-5" />
            <input
              type="text"
              placeholder="Search Table..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-primary/10 focus:border-accent outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showScanner && (
        <Scanner 
          onScan={(barcode) => {
            handleLookup(barcode);
          }} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {/* Lookup Result */}
      {lastLookedUp && (
        <div className="bg-accent text-white p-6 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase opacity-70 tracking-widest">Lookup Result</p>
              <h3 className="text-2xl font-black">{lastLookedUp.name}</h3>
              <p className="font-mono text-sm opacity-80">{lastLookedUp.barcode}</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="text-3xl font-black">₹{lastLookedUp.price.toFixed(2)}</div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">Stock: {lastLookedUp.stock_quantity}</span>
              <button 
                onClick={() => setLastLookedUp(null)}
                className="p-1 hover:bg-white/20 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Card */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-primary/5">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-accent" />
          Register New Product
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-primary/50">Barcode</label>
            <input
              type="text"
              placeholder="Barcode"
              className="w-full px-3 py-2 text-sm rounded-lg border border-primary/10 focus:border-accent outline-none"
              value={newProduct.barcode}
              onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-primary/50">Name</label>
            <input
              type="text"
              placeholder="Product Name"
              className="w-full px-3 py-2 text-sm rounded-lg border border-primary/10 focus:border-accent outline-none"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-primary/50">Price</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm rounded-lg border border-primary/10 focus:border-accent outline-none"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-primary/50">Stock</label>
            <input
              type="number"
              placeholder="0"
              className="w-full px-3 py-2 text-sm rounded-lg border border-primary/10 focus:border-accent outline-none"
              value={newProduct.stock_quantity}
              onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <button
              onClick={() => handleSave(newProduct as Product)}
              disabled={!newProduct.barcode || !newProduct.name}
              className="w-full bg-accent text-white py-2 rounded-lg font-bold hover:bg-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-2xl shadow-sm border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-primary/5">
              <tr>
                <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase text-primary/50">Barcode</th>
                <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase text-primary/50">Product Name</th>
                <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase text-primary/50">Price</th>
                <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase text-primary/50">Stock</th>
                <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase text-primary/50">Tax %</th>
                <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase text-primary/50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filteredProducts.map((product) => (
                <tr key={product.barcode} className="hover:bg-primary/5 transition-colors">
                  <td className="px-4 md:px-6 py-4 font-mono text-xs md:text-sm">{product.barcode}</td>
                  <td className="px-4 md:px-6 py-4 font-medium text-sm md:text-base">{product.name}</td>
                  <td className="px-4 md:px-6 py-4 text-sm md:text-base">₹{product.price.toFixed(2)}</td>
                  <td className="px-4 md:px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] md:text-xs font-bold",
                      product.stock_quantity < 10 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                    )}>
                      {product.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-sm md:text-base">{product.tax_rate}%</td>
                  <td className="px-4 md:px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleDelete(product.barcode)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">Delete Product?</h3>
            <p className="text-primary/60 text-center mb-8">
              This action cannot be undone. Are you sure you want to remove this item from your inventory?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-3 rounded-xl font-bold text-primary/60 hover:bg-secondary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
