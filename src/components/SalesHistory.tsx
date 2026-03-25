import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Sale } from '@/types';
import { format } from 'date-fns';
import { History, IndianRupee, Calendar, CreditCard } from 'lucide-react';

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Sale);
      setSales(data);
    });
    return () => unsubscribe();
  }, []);

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
          <div key={sale.invoice_id} className="bg-white p-6 rounded-3xl shadow-sm border border-primary/5 space-y-4">
            <div className="flex justify-between items-start">
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
    </div>
  );
}
