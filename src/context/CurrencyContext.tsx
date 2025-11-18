'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  exchangeRate: number;
  convertPrice: (price: number) => number;
  formatPrice: (price: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const EXCHANGE_RATES: { [key: string]: number } = {
  'USD': 1,
  'EGP': 49.50,  // Egyptian Pound
  'EUR': 0.92,   // Euro
  'GBP': 0.79,   // British Pound
  'SAR': 3.75,   // Saudi Riyal
  'AED': 3.67,   // UAE Dirham
};

const CURRENCY_SYMBOLS: { [key: string]: string } = {
  'USD': '$',
  'EGP': 'ج.م',
  'EUR': '€',
  'GBP': '£',
  'SAR': 'ر.س',
  'AED': 'د.إ',
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<string>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(1);

  useEffect(() => {
    // Load saved currency from localStorage
    const saved = localStorage.getItem('selected_currency');
    if (saved && EXCHANGE_RATES[saved]) {
      setCurrency(saved);
      setExchangeRate(EXCHANGE_RATES[saved]);
    }
  }, []);

  const handleSetCurrency = (newCurrency: string) => {
    setCurrency(newCurrency);
    setExchangeRate(EXCHANGE_RATES[newCurrency] || 1);
    localStorage.setItem('selected_currency', newCurrency);
  };

  const convertPrice = (price: number): number => {
    return price * exchangeRate;
  };

  const formatPrice = (price: number): string => {
    const converted = convertPrice(price);
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    
    if (currency === 'EGP' || currency === 'SAR' || currency === 'AED') {
      return `${symbol} ${converted.toFixed(2)}`;
    }
    return `${symbol}${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency: handleSetCurrency,
        exchangeRate,
        convertPrice,
        formatPrice
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export { EXCHANGE_RATES, CURRENCY_SYMBOLS };