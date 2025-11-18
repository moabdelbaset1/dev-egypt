import Image from "next/image";
import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import { ShoppingBag, ArrowRight, Star } from "lucide-react";

export default function Home() {
  const brands = [
    {
      id: 'omaima',
      name: 'OMAIMA',
      tagline: 'Professional Medical Wear',
      description: 'Premium uniforms designed for healthcare professionals. Combining comfort, durability, and style.',
      image: '/images/brands/hero-omaima.jpg',
      color: 'from-blue-600 to-blue-800',
      categories: ['Uniforms', 'Medical Scrubs', 'Formal Wear'],
      link: '/brand/omaima'
    },
    {
      id: 'hleo',
      name: 'H LEO',
      tagline: 'Oversized Comfort',
      description: 'Modern oversized fashion that moves with you. Ultimate comfort meets contemporary street style.',
      image: '/images/brands/T6_img3_ShopCategories_Jumpsuit_desk_asset.webp',
      color: 'from-red-600 to-red-800',
      categories: ['Hoodies', 'Oversized Tees', 'Joggers'],
      link: '/brand/hleo'
    },
    {
      id: 'seen',
      name: 'SEEN',
      tagline: 'Slim Fit Elegance',
      description: 'Tailored perfection for the modern gentleman. Sharp, sophisticated, and impeccably fitted.',
      image: '/images/brands/T6_img4_ShopCategories_Jackets_desk_asset.webp',
      color: 'from-slate-700 to-slate-900',
      categories: ['Slim Shirts', 'Fitted Pants', 'Blazers'],
      link: '/brand/seen'
    }
  ];

  return (
    <MainLayout>
      <div className="font-sans w-full min-h-screen bg-white text-black">
      <main className="w-full flex flex-col items-center">
        {/* Hero Section with Background Image */}
        <section className="w-full relative min-h-[600px] md:min-h-[700px] lg:min-h-[800px] overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="/images/brands/hero-section.jpg"
              alt="Dav Egypt Fashion"
              fill
              className="object-cover"
              priority
            />
            {/* Dark Overlay for better text readability */}
            <div className="absolute inset-0 bg-black/40"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-32 lg:py-40">
            <div className="text-center text-white">
              {/* Main Title */}
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 drop-shadow-2xl">
                <span className="text-white">Dav</span> <span className="text-red-600">Egypt</span>
              </h1>
              
              <p className="text-xl md:text-2xl mb-12 text-gray-100 max-w-3xl mx-auto drop-shadow-lg">
                Premium Fashion Collections
              </p>

              {/* Three Brands Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
                {/* OMAIMA Brand */}
                <Link href="/brand/omaima" className="group bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-2xl p-8 border border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
                   <div className="text-center">
                     <h3 className="text-3xl font-bold mb-3 text-white group-hover:text-blue-400 transition-colors">
                       OMAIMA
                     </h3>
                     <div className="w-16 h-1 bg-gradient-to-r from-blue-400 to-blue-600 mx-auto mb-4 rounded-full"></div>
                     <p className="text-lg text-gray-200 mb-2">Professional Medical Wear</p>
                     <p className="text-sm text-gray-300">Premium uniforms for healthcare professionals</p>
                   </div>
                 </Link>

                 {/* H LEO Brand */}
                 <Link href="/brand/hleo" className="group bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-2xl p-8 border border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
                   <div className="text-center">
                     <h3 className="text-3xl font-bold mb-3 text-white group-hover:text-red-400 transition-colors">
                       H LEO
                     </h3>
                     <div className="w-16 h-1 bg-gradient-to-r from-red-400 to-red-600 mx-auto mb-4 rounded-full"></div>
                     <p className="text-lg text-gray-200 mb-2">Oversized Comfort</p>
                     <p className="text-sm text-gray-300">Modern oversized fashion that moves with you</p>
                   </div>
                 </Link>

                 {/* SEEN Brand */}
                 <Link href="/brand/seen" className="group bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-2xl p-8 border border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
                   <div className="text-center">
                     <h3 className="text-3xl font-bold mb-3 text-white group-hover:text-gray-300 transition-colors">
                       SEEN
                     </h3>
                     <div className="w-16 h-1 bg-gradient-to-r from-gray-400 to-gray-600 mx-auto mb-4 rounded-full"></div>
                     <p className="text-lg text-gray-200 mb-2">Slim Fit Elegance</p>
                     <p className="text-sm text-gray-300">Tailored perfection for the modern gentleman</p>
                   </div>
                 </Link>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-4 justify-center flex-wrap">
                <Link href="/catalog" className="inline-flex items-center gap-2 px-10 py-5 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 shadow-2xl">
                  <ShoppingBag className="w-6 h-6" />
                  Shop All Collections
                </Link>
                <Link href="/catalog?new=true" className="inline-flex items-center gap-2 px-10 py-5 bg-white/90 hover:bg-white text-gray-900 font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 shadow-2xl">
                  New Arrivals
                  <ArrowRight className="w-6 h-6" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Our Premium Brands</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">Three distinct brands, each crafted for a unique lifestyle and purpose</p>
              <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mt-6"></div>
            </div>

            <div className="space-y-20">
              {brands.map((brand, index) => (
                <div key={brand.id} className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 items-center`}>
                  <div className="w-full lg:w-1/2 relative group">
                    <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                      <Image src={brand.image} alt={brand.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className={`absolute inset-0 bg-gradient-to-t ${brand.color} opacity-30 group-hover:opacity-20 transition-opacity`}></div>
                    </div>
                  </div>

                  <div className="w-full lg:w-1/2 space-y-6">
                    <div>
                      <h3 className="text-5xl font-bold mb-2 text-gray-900">{brand.name}</h3>
                      <p className="text-xl text-gray-600 italic">{brand.tagline}</p>
                    </div>
                    <p className="text-lg text-gray-700 leading-relaxed">{brand.description}</p>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900">Product Categories:</h4>
                      <div className="flex flex-wrap gap-2">
                        {brand.categories.map((category, idx) => (
                          <span key={idx} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">{category}</span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Link href={brand.link} className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${brand.color} text-white font-medium rounded-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
                        Explore {brand.name}
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                      <Link href={`/catalog?brand=${brand.id}`} className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:border-gray-900 hover:text-gray-900 transition-all duration-300">
                        <ShoppingBag className="w-5 h-5" />
                        Shop Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-16 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Shop by Category</h2>
              <p className="text-xl text-gray-600">Find exactly what you're looking for</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Tops', image: '/images/brands/T6_img1_ShopCategories_Tops_desk_asset.webp', link: '/catalog?category=tops' },
                { name: 'Pants', image: '/images/brands/T6_img2_ShopCategories_Pants_desk_asset.jpg', link: '/catalog?category=pants' },
                { name: 'Jumpsuits', image: '/images/brands/T6_img3_ShopCategories_Jumpsuit_desk_asset.webp', link: '/catalog?category=jumpsuits' },
                { name: 'Jackets', image: '/images/brands/T6_img4_ShopCategories_Jackets_desk_asset.webp', link: '/catalog?category=jackets' }
              ].map((category, idx) => (
                <Link key={idx} href={category.link} className="group relative h-80 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                  <Image src={category.image} alt={category.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">{category.name}</h3>
                      <span className="text-white inline-flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">Shop Now <ArrowRight className="w-4 h-4" /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Link href="/catalog?new=true" className="group relative h-96 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
                <Image src="/images/brands/T6_2up_img2_ShopCategories_All_desk_asset.webp" alt="New Arrivals" fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-8">
                  <h3 className="text-4xl font-bold text-white mb-2">New Arrivals</h3>
                  <p className="text-white text-lg mb-4">Discover our latest collections</p>
                  <span className="inline-flex items-center gap-2 text-white font-medium group-hover:gap-4 transition-all">Explore Now <ArrowRight className="w-5 h-5" /></span>
                </div>
              </Link>

              <Link href="/catalog?sale=true" className="group relative h-96 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
                <Image src="/images/brands/hero-omaima.jpg" alt="Sale" fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/80 via-red-900/40 to-transparent flex flex-col justify-end p-8">
                  <div className="inline-block px-4 py-2 bg-red-600 text-white font-bold text-2xl mb-4 w-fit rounded-lg">SALE</div>
                  <h3 className="text-4xl font-bold text-white mb-2">Special Offers</h3>
                  <p className="text-white text-lg mb-4">Up to 50% off selected items</p>
                  <span className="inline-flex items-center gap-2 text-white font-medium group-hover:gap-4 transition-all">Shop Sale <ArrowRight className="w-5 h-5" /></span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section className="w-full py-16 px-4 bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex justify-center gap-1 mb-4">{[...Array(5)].map((_, i) => (<Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />))}</div>
              <h2 className="text-4xl font-bold mb-4">What Our Customers Say</h2>
              <p className="text-xl text-gray-400">Trusted by thousands of satisfied customers</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: "Ahmed Hassan", review: "The quality is outstanding! OMAIMA scrubs are incredibly comfortable and professional.", rating: 5 },
                { name: "Sarah Mohamed", review: "H LEO hoodies are the best! Perfect fit and amazing fabric. Highly recommended!", rating: 5 },
                { name: "Omar Khalil", review: "SEEN's slim-fit shirts are perfect for my style. Great quality and fast delivery!", rating: 5 }
              ].map((review, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="flex gap-1 mb-4">{[...Array(review.rating)].map((_, i) => (<Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />))}</div>
                  <p className="text-gray-300 leading-relaxed mb-4 italic">"{review.review}"</p>
                  <p className="font-bold text-white">{review.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-20 px-4 bg-gradient-to-br from-red-600 to-red-800 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Upgrade Your Wardrobe?</h2>
            <p className="text-xl mb-8 text-red-100">Explore our complete collection of premium clothing across all three brands</p>
            <Link href="/catalog" className="inline-flex items-center gap-2 px-10 py-5 bg-white hover:bg-gray-100 text-red-600 font-bold text-lg rounded-lg transition-all duration-300 transform hover:scale-105 shadow-2xl">
              <ShoppingBag className="w-6 h-6" />
              Start Shopping Now
            </Link>
          </div>
        </section>

        <section className="w-full py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto space-y-6 text-gray-700">
            <h2 className="text-3xl font-bold text-gray-900">Premium Fashion Collection - Dav Egypt</h2>
            <p className="text-lg leading-relaxed">Welcome to <strong>Dav Egypt</strong>, your destination for premium clothing featuring three distinctive brands: <strong>OMAIMA</strong> for professional medical wear, <strong>H LEO</strong> for comfortable oversized fashion, and <strong>SEEN</strong> for elegant slim-fit styles.</p>
            <p className="text-lg leading-relaxed">Each brand is carefully curated to meet specific needs - whether you're a healthcare professional seeking quality uniforms, a fashion enthusiast looking for comfortable streetwear, or someone who appreciates tailored elegance. Our collections combine quality materials, expert craftsmanship, and contemporary designs.</p>
            <p className="text-lg leading-relaxed">Browse through our extensive catalog featuring <strong>tops, pants, jumpsuits, jackets</strong>, and more. With regular new arrivals and special offers, you'll always find something perfect for your style and needs.</p>
          </div>
        </section>

      </main>
    </div>
    </MainLayout>
  );
}