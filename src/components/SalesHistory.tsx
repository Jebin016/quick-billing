import React, { useState, useEffect } from 'react';
import { db, auth } from '@/firebase';
import { collection, onSnapshot, query, orderBy, limit, where, deleteDoc, doc } from 'firebase/firestore';
import { Sale } from '@/types';
import { format } from 'date-fns';
import { History, IndianRupee, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'sales'), 
      where('uid', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc'), 
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as Sale));
      setSales(data);
    });
    return () => unsubscribe();
  }, []);

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'sales', saleToDelete));
      toast.success('Sale deleted');
      setSaleToDelete(null);
    } catch (error) {
      toast.error('Failed to delete sale');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-primary tracking-tight">Sales History</h2>
        <div className="bg-accent text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
          <IndianRupee className="w-6 h-6" />
          <div>
            <p className="text-[10px] font-bold uppercase opacity-70">Recent Revenue</p>
            <p className="text-xl font-black">₹{totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sales.map((sale) => (
          <div key={sale.invoice_id} className="bg-white p-6 rounded-3xl shadow-sm border border-primary/5 space-y-4 relative group">
            <button 
              onClick={() => setSaleToDelete(sale.invoice_id)}
              className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all md:opacity-0 md:group-hover:opacity-100"
              title="Delete Sale"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex justify-between items-start pr-8">
              <div>
                <p className="text-xs font-bold text-primary/40 uppercase">{sale.invoice_id}</p>
                <p className="text-sm font-medium text-primary/60 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(sale.timestamp), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <span className="px-3 py-1 bg-secondary text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
                {sale.payment_method}
              </span>
            </div>

            <div className="space-y-2">
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-primary/70">{item.quantity}x {item.name}</span>
                  <span className="font-medium">₹{(item.quantity * item.price_at_sale).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-primary/5 flex justify-between items-center">
              <span className="font-bold text-primary">Total Amount</span>
              <span className="text-xl font-black text-accent">₹{sale.total_amount.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {sales.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center text-primary/20 gap-4">
          <History className="w-16 h-16" />
          <p className="font-bold">No sales recorded yet</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {saleToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-primary text-center mb-2">Delete Sale?</h3>
            <p className="text-primary/60 text-center mb-8">This will permanently remove this sale record. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setSaleToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl font-bold text-primary/60 hover:bg-secondary transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSale}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
