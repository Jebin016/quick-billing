/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';
import Layout from '@/components/Layout';
import Checkout from '@/components/Checkout';
import Inventory from '@/components/Inventory';
import SalesHistory from '@/components/SalesHistory';
import Login from '@/components/Login';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'checkout' | 'inventory' | 'history'>('checkout');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <Login />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === 'checkout' && <Checkout />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'history' && <SalesHistory />}
      </Layout>
    </>
  );
}
