export interface Product {
  barcode: string;
  name: string;
  price: number;
  stock_quantity: number;
  tax_rate: number;
}

export interface SaleItem {
  product_id: string;
  name: string;
  quantity: number;
  price_at_sale: number;
}

export interface Sale {
  invoice_id: string;
  timestamp: string;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'upi';
  items: SaleItem[];
}
