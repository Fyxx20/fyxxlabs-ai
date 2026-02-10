"use client";

import { Check, X, Star, ShoppingBag, Menu, ChevronRight, ChevronDown, Minus } from "lucide-react";

/* ─── Types ─── */
export interface StorePageData {
  brand_name: string;
  brand_color: string;
  banner_text: string;
  product: {
    title: string;
    price: number;
    compare_at_price: number;
    short_description: string;
    features: string[];
    tags: string;
    product_type: string;
  };
  review: {
    rating: number;
    count: number;
    label: string;
  };
  hero: {
    headline: string;
    bold_word: string;
    subtext: string;
  };
  timeline: Array<{ period: string; text: string }>;
  advantages: {
    title: string;
    items: string[];
  };
  comparison: {
    our_name: string;
    our_subtitle: string;
    other_name: string;
    rows: Array<{ feature: string; us: boolean; them: boolean }>;
  };
  statistics: Array<{ value: string; label: string }>;
  faq: Array<{ question: string; answer: string }>;
  trust_badges: string[];
}

interface MobilePreviewProps {
  data: StorePageData;
  images: string[];
  activeSection: string;
  heroImage?: string;
  faqImage?: string;
  beforeImage?: string;
  afterImage?: string;
}

/* ─── Mobile Preview Component ─── */
export function StoreMobilePreview({
  data,
  images,
  activeSection,
  heroImage,
  faqImage,
  beforeImage,
  afterImage,
}: MobilePreviewProps) {
  const discount = data.product.compare_at_price > 0
    ? Math.round((1 - data.product.price / data.product.compare_at_price) * 100)
    : 0;

  const mainImage = images[0] ?? "";

  // Render stars
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-3 w-3 ${i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      );
    }
    return stars;
  };

  // Highlight bold word in headline
  const renderHeadline = (headline: string, boldWord: string) => {
    if (!boldWord) return headline;
    const idx = headline.toLowerCase().indexOf(boldWord.toLowerCase());
    if (idx === -1) return headline;
    return (
      <>
        {headline.slice(0, idx)}
        <em className="font-black not-italic">{headline.slice(idx, idx + boldWord.length)}</em>
        {headline.slice(idx + boldWord.length)}
      </>
    );
  };

  return (
    <div className="w-[360px] mx-auto">
      {/* Phone frame */}
      <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-200 overflow-hidden">
        {/* Status bar */}
        <div className="h-6 bg-white flex items-center justify-center">
          <div className="w-20 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Scrollable content */}
        <div className="h-[640px] overflow-y-auto scrollbar-thin" id="phone-scroll">
          {/* Banner */}
          <div className="py-2 px-3 text-center text-[10px] font-medium text-white" style={{ backgroundColor: "#e53e3e" }}>
            {data.banner_text}
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <Menu className="h-5 w-5 text-gray-800" />
            <span className="font-bold text-sm tracking-wider uppercase">{data.brand_name}</span>
            <ShoppingBag className="h-5 w-5 text-gray-800" />
          </div>

          {/* Product Image */}
          {mainImage && (
            <div className="relative bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mainImage} alt={data.product.title} className="w-full h-72 object-contain" />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow">
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          )}

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-1.5 px-4 py-2 overflow-x-auto">
              {images.slice(0, 5).map((img, i) => (
                <div
                  key={i}
                  className={`w-14 h-14 flex-shrink-0 border-2 ${i === 0 ? "border-gray-800" : "border-gray-200"} rounded overflow-hidden`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Rating */}
          <div className="px-4 py-2 flex items-center gap-1.5">
            <div className="flex">{renderStars(data.review.rating)}</div>
            <span className="text-[11px] font-semibold">{data.review.label}</span>
            <span className="text-[11px] text-gray-500">
              | Noté {data.review.rating} ({data.review.count.toLocaleString("fr-FR")} clients satisfaits)
            </span>
          </div>

          {/* Advantages section */}
          <div id="section-advantages" className="px-4 py-3">
            <p className="text-sm font-medium text-gray-800 mb-2">{data.advantages.title}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.advantages.items.map((item, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-[11px] font-medium">
                  <Check className="h-3 w-3" style={{ color: data.brand_color }} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">${data.product.price.toFixed(2)}</span>
              {data.product.compare_at_price > 0 && (
                <>
                  <span className="text-sm line-through text-gray-400">${data.product.compare_at_price.toFixed(2)}</span>
                  {discount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: data.brand_color }}>
                      ÉCONOMISEZ {discount}%
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quantity selector */}
          <div className="px-4 py-2">
            <p className="text-xs text-gray-500 mb-1">Choisissez votre quantité</p>
            <div className="border-b border-dashed border-gray-300" />
          </div>

          {/* Add to cart */}
          <div className="px-4 py-3">
            <button
              className="w-full py-3.5 text-white font-bold text-sm tracking-wider rounded-sm"
              style={{ backgroundColor: "#1a1a1a" }}
            >
              AJOUTER AU PANIER
            </button>
          </div>

          {/* Trust badges */}
          <div className="px-4 pb-2 flex justify-center gap-4">
            {data.trust_badges.map((badge, i) => (
              <span key={i} className="text-[10px] font-medium" style={{ color: data.brand_color }}>
                {badge}
              </span>
            ))}
          </div>

          {/* Payment methods */}
          <div className="px-4 pb-3 flex justify-center gap-2">
            {["💳", "💎", "🍎", "G", "V", "K"].map((icon, i) => (
              <div key={i} className="w-9 h-6 bg-gray-100 rounded flex items-center justify-center text-[10px] font-bold text-gray-600 border border-gray-200">
                {icon}
              </div>
            ))}
          </div>

          {/* Description accordion */}
          <div className="px-4 py-2 border-t border-gray-100">
            <div className="flex items-center justify-between py-2">
              <span className="font-semibold text-sm">Description</span>
              <X className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-xs text-gray-600 pb-3 leading-relaxed">{data.product.short_description}</p>
          </div>

          {/* Mode d'emploi accordion */}
          <div className="px-4 py-2 border-t border-gray-100">
            <div className="flex items-center justify-between py-2">
              <span className="font-semibold text-sm">Mode d&apos;emploi</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* ─── SECTION: Hero ─── */}
          <div id="section-hero" className="px-4 py-6 bg-gray-50 text-center">
            <h2 className="text-xl font-bold leading-tight mb-2">
              {renderHeadline(data.hero.headline, data.hero.bold_word)}
            </h2>
            <p className="text-xs text-gray-500">{data.hero.subtext}</p>
            {heroImage && (
              <div className="mt-4 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImage} alt="Hero" className="w-full h-48 object-cover" />
              </div>
            )}
          </div>

          {/* ─── SECTION: FAQ with image ─── */}
          <div id="section-faq" className="px-4 py-6">
            {data.faq.length > 0 && (
              <>
                <h3 className="text-lg font-bold mb-1">{data.faq[0].question}</h3>
                <p className="text-xs text-gray-600 mb-3">{data.faq[0].answer}</p>
              </>
            )}
            {faqImage && (
              <div className="rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={faqImage} alt="FAQ" className="w-full h-44 object-cover" />
              </div>
            )}
          </div>

          {/* ─── SECTION: Timeline ─── */}
          <div id="section-timeline" className="px-4 py-6 bg-gray-50">
            <div className="relative pl-6">
              {data.timeline.map((item, i) => (
                <div key={i} className="relative pb-5 last:pb-0">
                  {/* Vertical line */}
                  {i < data.timeline.length - 1 && (
                    <div className="absolute left-[-16px] top-2 w-0.5 h-full bg-gray-300" />
                  )}
                  {/* Dot */}
                  <div
                    className={`absolute left-[-20px] top-1 w-3 h-3 rounded-full border-2 ${
                      i <= 2 ? "border-gray-800 bg-gray-800" : "border-gray-300 bg-white"
                    }`}
                  />
                  <p className={`text-xs font-bold ${i <= 2 ? "text-gray-800" : "text-gray-400"}`}>{item.period}</p>
                  <p className={`text-[11px] ${i <= 2 ? "text-gray-600" : "text-gray-400"}`}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── SECTION: Comparison ─── */}
          <div id="section-comparison" className="px-4 py-6">
            <h3 className="text-center text-lg font-bold mb-1">Face à la concurrence</h3>
            <p className="text-center text-xs text-gray-500 mb-4">
              Comparez et découvrez la différence de qualité et de style authentique
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-3 text-center bg-gray-50 border-b border-gray-200 py-2">
                <div />
                <div>
                  <p className="text-xs font-bold">{data.comparison.our_name}</p>
                  <p className="text-[10px] text-gray-400">{data.comparison.our_subtitle}</p>
                </div>
                <div>
                  <p className="text-xs font-bold">{data.comparison.other_name}</p>
                </div>
              </div>
              {/* Rows */}
              {data.comparison.rows.map((row, i) => (
                <div key={i} className="grid grid-cols-3 text-center items-center py-2.5 border-b border-gray-100 last:border-0">
                  <p className="text-[11px] text-left pl-3">{row.feature}</p>
                  <div className="flex justify-center">
                    {row.us ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  <div className="flex justify-center">
                    {row.them ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── SECTION: Statistics ─── */}
          <div id="section-statistics" className="px-4 py-6 bg-gray-50">
            {/* Before/After */}
            {beforeImage && afterImage && (
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative rounded-lg overflow-hidden">
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded">BEFORE</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={beforeImage} alt="Before" className="w-full h-40 object-cover" />
                </div>
                <div className="flex-1 relative rounded-lg overflow-hidden">
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded">AFTER</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={afterImage} alt="After" className="w-full h-40 object-cover" />
                </div>
              </div>
            )}
            {data.statistics.map((stat, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-200 last:border-0">
                <span className="text-2xl font-black" style={{ color: data.brand_color }}>{stat.value}</span>
                <span className="text-xs text-gray-600">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Sticky add to cart */}
          <div className="px-4 py-3 border-t border-gray-200 bg-white">
            <button
              className="w-full py-3.5 text-white font-bold text-sm tracking-wider rounded-sm"
              style={{ backgroundColor: "#1a1a1a" }}
            >
              AJOUTER AU PANIER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
