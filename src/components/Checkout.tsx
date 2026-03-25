import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/firebase';
import { collection, onSnapshot, doc, setDoc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { Product, Sale, SaleItem } from '@/types';
import { Search, ShoppingCart, Trash2, Printer, CheckCircle, AlertCircle, Plus, Minus, Barcode, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn, playBeep } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import Scanner from '@/components/Scanner';

export default function Checkout() {
  const [lastScanned, setLastScanned] = useState<Product | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the barcode input
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, []);

  const handleScan = async (e?: React.FormEvent, manualBarcode?: string) => {
    if (e) e.preventDefault();
    const barcode = manualBarcode || barcodeInput;
    if (!barcode.trim() || !auth.currentUser) return;

    try {
      const productDoc = await getDoc(doc(db, 'products', `${barcode}_${auth.currentUser.uid}`));
      if (productDoc.exists()) {
        const product = productDoc.data() as Product;
        setLastScanned(product);
        
        if (product.stock_quantity <= 0) {
          toast.error('Out of stock!');
          playBeep('error');
          setBarcodeInput('');
          return;
        }

        setCart(prev => {
          const existing = prev.find(item => item.product_id === product.barcode);
          if (existing) {
            return prev.map(item => 
              item.product_id === product.barcode 
                ? { ...item, quantity: item.quantity + 1 } 
                : item
            );
          }
          return [...prev, {
            product_id: product.barcode,
            name: product.name,
            quantity: 1,
            price_at_sale: product.price
          }];
        });
        
        playBeep('success');
      } else {
        setLastScanned(null);
        playBeep('error');
        toast.error('Product not found');
      }
    } catch (error) {
      toast.error('Scan error');
    }
    setBarcodeInput('');
  };

  const onCameraScan = (barcode: string) => {
    handleScan(undefined, barcode);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price_at_sale * item.quantity), 0);
  const tax = subtotal * 0.05; // Assuming flat 5% for simplicity
  const total = subtotal + tax;

  const generateInvoice = (sale: Sale) => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 200] // Thermal printer size
    });

    doc.setFontSize(14);
    doc.text('QUICKSCAN POS', 40, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`Invoice: ${sale.invoice_id}`, 10, 20);
    doc.text(`Date: ${format(new Date(sale.timestamp), 'dd/MM/yyyy HH:mm')}`, 10, 25);
    doc.text('------------------------------------------', 10, 30);

    let y = 35;
    sale.items.forEach(item => {
      doc.text(`${item.name}`, 10, y);
      doc.text(`${item.quantity} x Rs.${item.price_at_sale.toFixed(2)}`, 10, y + 4);
      doc.text(`Rs.${(item.quantity * item.price_at_sale).toFixed(2)}`, 70, y + 4, { align: 'right' });
      y += 10;
    });

    doc.text('------------------------------------------', 10, y);
    doc.text(`Subtotal: Rs.${subtotal.toFixed(2)}`, 70, y + 5, { align: 'right' });
    doc.text(`Tax (5%): Rs.${tax.toFixed(2)}`, 70, y + 9, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`TOTAL: Rs.${sale.total_amount.toFixed(2)}`, 70, y + 15, { align: 'right' });
    
    doc.setFontSize(8);
    doc.text('Thank you for shopping!', 40, y + 25, { align: 'center' });

    doc.save(`invoice-${sale.invoice_id}.pdf`);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0 || !auth.currentUser) return;
    setIsProcessing(true);

    const invoiceId = `INV-${Date.now()}`;
    const sale: Sale = {
      invoice_id: invoiceId,
      timestamp: new Date().toISOString(),
      total_amount: total,
      payment_method: paymentMethod,
      items: cart,
      uid: auth.currentUser.uid
    };

    try {
      // Update stock and record sale
      for (const item of cart) {
        await updateDoc(doc(db, 'products', `${item.product_id}_${auth.currentUser.uid}`), {
          stock_quantity: increment(-item.quantity)
        });
      }
      
      await setDoc(doc(db, 'sales', invoiceId), sale);
      
      generateInvoice(sale);
      toast.success('Sale completed!');
      setCart([]);
      playBeep('success');
    } catch (error) {
      toast.error('Failed to complete sale');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8 min-h-[calc(100vh-8rem)]">
      {/* Left: Cart Area */}
      <div className="lg:col-span-2 flex flex-col gap-6 order-2 lg:order-1">
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-primary/5 flex-1 flex flex-col min-h-[400px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-accent" />
              Current Order
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowScanner(true)}
                className="p-2 bg-accent text-white rounded-xl hover:bg-primary transition-all shadow-md flex items-center gap-2 px-3 md:px-4"
              >
                <Camera className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-[10px] md:text-xs font-bold uppercase">Scan</span>
              </button>
              <form onSubmit={handleScan} className="relative flex-1 sm:w-48 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 w-4 h-4" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Barcode..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-secondary/50 border-2 border-transparent focus:border-accent outline-none transition-all"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                />
              </form>
            </div>
          </div>

          {showScanner && (
            <Scanner 
              onScan={onCameraScan} 
              onClose={() => setShowScanner(false)} 
            />
          )}

          {/* Last Scanned Display */}
          {lastScanned && (
            <div className="mb-6 p-4 bg-accent/10 border-2 border-accent/20 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent text-white rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-accent tracking-widest">Last Scanned</p>
                  <h3 className="text-xl font-black text-primary">{lastScanned.name}</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-accent">₹{lastScanned.price.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-primary/40 uppercase">Tax: {lastScanned.tax_rate}%</p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto space-y-4 pr-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-primary/30 gap-4">
                <Barcode className="w-16 h-16 opacity-20" />
                <p className="font-medium">Ready to scan products...</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product_id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-primary/5 group relative">
                  <div className="flex-1">
                    <h4 className="font-bold text-primary text-sm md:text-base">{item.name}</h4>
                    <p className="text-[10px] md:text-xs text-primary/50 font-mono">{item.product_id}</p>
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <button 
                        onClick={() => updateQuantity(item.product_id, -1)}
                        className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white border border-primary/10 flex items-center justify-center hover:bg-accent hover:text-white transition-all"
                      >
                        <Minus className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                      <span className="w-6 md:w-8 text-center font-bold text-sm md:text-base">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product_id, 1)}
                        className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white border border-primary/10 flex items-center justify-center hover:bg-accent hover:text-white transition-all"
                      >
                        <Plus className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                    </div>
                    <div className="text-right font-bold text-sm md:text-base min-w-[80px]">
                      ₹{(item.price_at_sale * item.quantity).toFixed(2)}
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.product_id)}
                      className="p-2 text-red-400 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: Summary Area */}
      <div className="bg-primary text-secondary p-6 md:p-8 rounded-3xl shadow-xl flex flex-col gap-6 md:gap-8 order-1 lg:order-2">
        <h3 className="text-lg md:text-xl font-bold uppercase tracking-widest opacity-50">Order Summary</h3>
        
        <div className="space-y-4 flex-1">
          <div className="flex justify-between items-center">
            <span className="opacity-70 text-sm md:text-base">Subtotal</span>
            <span className="font-bold text-base md:text-lg">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="opacity-70 text-sm md:text-base">Tax (5%)</span>
            <span className="font-bold text-base md:text-lg">₹{tax.toFixed(2)}</span>
          </div>
          <div className="h-px bg-secondary/10 my-4" />
          <div className="flex justify-between items-center">
            <span className="text-lg md:text-xl font-bold">Total</span>
            <span className="text-2xl md:text-3xl font-black text-accent">₹{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-50">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {(['cash', 'card', 'upi'] as const).map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={cn(
                  "py-2 md:py-3 rounded-xl border-2 transition-all font-bold uppercase text-[10px] md:text-xs",
                  paymentMethod === method 
                    ? "bg-accent border-accent text-white" 
                    : "border-secondary/10 hover:border-secondary/30"
                )}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCompleteSale}
          disabled={cart.length === 0 || isProcessing}
          className="w-full bg-accent hover:bg-white hover:text-primary text-white py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          ) : (
            <>
              <Printer className="w-5 h-5 md:w-6 md:h-6" />
              COMPLETE SALE
            </>
          )}
        </button>
      </div>
    </div>
  );
}
