// Main Navigation Component
// Includes brand navigation and dynamic brand links

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SearchBar from './SearchBar';
import { useCurrency, EXCHANGE_RATES, CURRENCY_SYMBOLS } from '../context/CurrencyContext';
import { Globe } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  featured: boolean;
}

const Nav: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isBrandsOpen, setIsBrandsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();

  // Fetch brands for navigation
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        // In a real implementation, this would fetch from the brands API
        const mockBrands: Brand[] = [
          { id: '1', name: 'Cherokee', slug: 'cherokee', featured: true },
          { id: '2', name: 'Dickies', slug: 'dickies', featured: true },
          { id: '3', name: 'WonderWink', slug: 'wonderwink', featured: false },
          { id: '4', name: 'Grey\'s Anatomy', slug: 'greys-anatomy', featured: false }
        ];

        setBrands(mockBrands);
      } catch (error) {
        console.error('Error fetching brands:', error);
      }
    };

    fetchBrands();
  }, []);

  const featuredBrands = brands.filter(brand => brand.featured);
  const regularBrands = brands.filter(brand => !brand.featured);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              Dav Egypt
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Main Links */}
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors">
              Home
            </Link>

            <Link href="/catalog" className="text-gray-700 hover:text-blue-600 transition-colors">
              Catalog
            </Link>

            {/* Search Bar */}
            <div className="w-80">
              <SearchBar
                placeholder="Search products..."
                className="w-full"
                showSuggestions={true}
              />
            </div>

            {/* Brands Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsBrandsOpen(!isBrandsOpen)}
                className="text-gray-700 hover:text-blue-600 transition-colors flex items-center"
              >
                Brands
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Brands Dropdown Menu */}
              {isBrandsOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                  {/* Featured Brands */}
                  {featuredBrands.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-sm font-medium text-gray-500 uppercase tracking-wide">
                        Featured Brands
                      </div>
                      {featuredBrands.map((brand) => (
                        <Link
                          key={brand.id}
                          href={`/brand/${brand.slug}`}
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                          onClick={() => setIsBrandsOpen(false)}
                        >
                          {brand.name}
                        </Link>
                      ))}
                      <div className="border-t border-gray-100 my-2" />
                    </div>
                  )}

                  {/* All Brands */}
                  <div className="px-4 py-2 text-sm font-medium text-gray-500 uppercase tracking-wide">
                    All Brands
                  </div>
                  {regularBrands.map((brand) => (
                    <Link
                      key={brand.id}
                      href={`/brand/${brand.slug}`}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                      onClick={() => setIsBrandsOpen(false)}
                    >
                      {brand.name}
                    </Link>
                  ))}

                  {/* View All Brands */}
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <Link
                      href="/brands"
                      className="block px-4 py-2 text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={() => setIsBrandsOpen(false)}
                    >
                      View All Brands →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link href="/about" className="text-gray-700 hover:text-blue-600 transition-colors">
              About
            </Link>

            <Link href="/contact" className="text-gray-700 hover:text-blue-600 transition-colors">
              Contact
            </Link>

            {/* Currency Selector */}
            <div className="relative">
              <button
                onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-gray-50"
              >
                <Globe className="h-4 w-4" />
                <span className="font-medium">{currency}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Currency Dropdown */}
              {isCurrencyOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
                    Select Currency
                  </div>
                  {Object.keys(EXCHANGE_RATES).map((curr) => (
                    <button
                      key={curr}
                      onClick={() => {
                        setCurrency(curr);
                        setIsCurrencyOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                        currency === curr ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{curr}</span>
                        <span className="text-xs text-gray-500">
                          {CURRENCY_SYMBOLS[curr]}
                        </span>
                      </span>
                      {currency === curr && (
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/wishlist" className="text-gray-700 hover:text-red-500 transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Wishlist
            </Link>
            <Link href="/account" className="text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Account
            </Link>
            <Link href="/cart" className="text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13v8a2 2 0 002 2h10a2 2 0 002-2v-3" />
              </svg>
              Cart
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-blue-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-4">
              <Link href="/" className="block text-gray-700 hover:text-blue-600 transition-colors">
                Home
              </Link>

              <Link href="/catalog" className="block text-gray-700 hover:text-blue-600 transition-colors">
                Catalog
              </Link>

              {/* Mobile Search */}
              <div className="px-4">
                <SearchBar
                  placeholder="Search products..."
                  className="w-full"
                  showSuggestions={true}
                />
              </div>

              {/* Mobile Brands */}
              <div>
                <button
                  onClick={() => setIsBrandsOpen(!isBrandsOpen)}
                  className="flex items-center justify-between w-full text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Brands
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isBrandsOpen && (
                  <div className="mt-2 ml-4 space-y-2">
                    {brands.map((brand) => (
                      <Link
                        key={brand.id}
                        href={`/brand/${brand.slug}`}
                        className="block text-gray-600 hover:text-blue-600 transition-colors"
                        onClick={() => {
                          setIsBrandsOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        {brand.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link href="/about" className="block text-gray-700 hover:text-blue-600 transition-colors">
                About
              </Link>

              <Link href="/contact" className="block text-gray-700 hover:text-blue-600 transition-colors">
                Contact
              </Link>

              <div className="border-t border-gray-200 pt-4 space-y-4">
                <Link href="/wishlist" className="flex items-center gap-2 text-gray-700 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Wishlist
                </Link>
                <Link href="/account" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Account
                </Link>
                <Link href="/cart" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13v8a2 2 0 002 2h10a2 2 0 002-2v-3" />
                  </svg>
                  Cart
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close dropdowns */}
      {(isBrandsOpen || isCurrencyOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsBrandsOpen(false);
            setIsCurrencyOpen(false);
          }}
        />
      )}
    </nav>
  );
};

export default Nav;