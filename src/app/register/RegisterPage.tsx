'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BreadCrumb from '../../../components/ui/BreadCrumb';
import EditText from '../../../components/ui/EditText';
import { useAuth } from '../../hooks/useAuth';
import MainLayout from '@/components/MainLayout';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, auth } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get redirect URL from search params
  const redirectTo = searchParams.get('redirect') || '/';

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError(null); // Clear error when user starts typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setError(null);
      await register(formData.email, formData.password, formData.name);

      // Redirect to specified page or home after successful registration
      if (!auth.error) {
        router.push(redirectTo);
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    }
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Create Account | Join', href: '/register', isActive: true }
  ];

  return (
    <MainLayout>
      <div className="flex flex-col items-center w-full min-h-screen bg-white">
      <main className="w-full max-w-[1520px] mx-auto px-4 py-10">
        <div className="flex flex-col items-center w-full">
          {/* Breadcrumb */}
          <div className="w-full mb-10">
            <BreadCrumb 
              items={breadcrumbItems}
              className="w-full"
            />
          </div>

          {/* Header */}
          <div className="text-center mb-2">
            <h1 className="text-5xl font-medium text-gray-900 mb-2">
              Create Account | Join
            </h1>
            <p className="text-base text-gray-900">
              Creating an account is easy. Fill out the form below and enjoy the exclusive benefits.
            </p>
          </div>

          {/* Registration Form */}
          <div className="w-full max-w-[900px] mt-12">
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-8">
              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm text-sm">
                  {error}
                </div>
              )}
              
              {/* Name Field */}
              <div className="mb-6">
                <div className="flex flex-col">
                  <label className="text-xs font-bold tracking-widest uppercase text-gray-900 mb-2">
                    FULL NAME *
                  </label>
                  <EditText
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-sm px-3 py-3 text-base"
                    fill_background_color="bg-white"
                    text_color="text-gray-900"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="mb-6">
                <div className="flex flex-col">
                  <label className="text-xs font-bold tracking-widest uppercase text-gray-900 mb-2">
                    EMAIL ADDRESS *
                  </label>
                  <EditText
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full border border-gray-300 rounded-sm px-3 py-3 text-base"
                    fill_background_color="bg-white"
                    text_color="text-gray-900"
                  />
                </div>
              </div>

              {/* Password Fields Row */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="flex flex-col">
                  <label className="text-xs font-bold tracking-widest uppercase text-gray-900 mb-2">
                    PASSWORD *
                  </label>
                  <div className="relative">
                    <EditText
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Show"
                      className="w-full border border-gray-300 rounded-sm px-3 py-3 pr-16 text-base"
                      fill_background_color="bg-white"
                      text_color="text-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-700 mt-2 leading-relaxed">
                    Password must be at least 8 characters and include Uppercase,
                    Lowercase, Number and Special Character.
                  </p>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold tracking-widest uppercase text-gray-900 mb-2">
                    CONFIRM PASSWORD *
                  </label>
                  <div className="relative">
                    <EditText
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Show"
                      className="w-full border border-gray-300 rounded-sm px-3 py-3 pr-16 text-base"
                      fill_background_color="bg-white"
                      text_color="text-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={auth.isLoading}
                className="bg-black text-white text-sm font-normal tracking-wider uppercase px-8 py-3 border border-black rounded-sm hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {auth.isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
    </MainLayout>
  );
}

export default function RegisterPage() {
 return (
   <Suspense fallback={<div>Loading...</div>}>
     <RegisterPageContent />
   </Suspense>
 );
}
