"use client";

import { useState } from "react";
import { Check, X, Star, ShoppingBag, Menu, ChevronRight, ChevronLeft, ChevronDown } from "lucide-react";

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
  mode?: "mobile" | "desktop";
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
  mode = "mobile",
}: MobilePreviewProps) {
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [openAccordion, setOpenAccordion] = useState<string | null>("description");

  const discount = data.product.compare_at_price > 0
    ? Math.round((1 - data.product.price / data.product.compare_at_price) * 100)
    : 0;

  const mainImage = images[currentImageIdx] ?? images[0] ?? "";
  const isDesktop = mode === "desktop";

  const nextImage = () => setCurrentImageIdx((i) => (i + 1) % Math.max(images.length, 1));
  const prevImage = () => setCurrentImageIdx((i) => (i - 1 + images.length) % Math.max(images.length, 1));

  // Render stars
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`${isDesktop ? "h-4 w-4" : "h-3 w-3"} ${i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
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
    <div className={isDesktop ? "w-full" : "w-[360px] mx-auto"}>
      {/* Frame */}
      <div className={`bg-white overflow-hidden ${isDesktop ? "rounded-xl shadow-lg border border-gray-200" : "rounded-[2rem] shadow-2xl border border-gray-200"}`}>
        {/* Status bar (mobile only) */}
        {!isDesktop && (
          <div className="h-6 bg-white flex items-center justify-center">
            <div className="w-20 h-1 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* Scrollable content */}
        <div className={`overflow-y-auto scrollbar-thin ${isDesktop ? "h-[700px]" : "h-[640px]"}`} id="phone-scroll">
          {/* Banner */}
          <div className={`py-2 px-3 text-center font-medium text-white ${isDesktop ? "text-xs" : "text-[10px]"}`} style={{ backgroundColor: "#e53e3e" }}>
            {data.banner_text}
          </div>

          {/* Header */}
          <div className={`flex items-center justify-between border-b border-gray-100 ${isDesktop ? "px-8 py-4" : "px-4 py-3"}`}>
            <Menu className={`${isDesktop ? "h-6 w-6" : "h-5 w-5"} text-gray-800`} />
            <span className={`font-bold tracking-wider uppercase ${isDesktop ? "text-base" : "text-sm"}`}>{data.brand_name}</span>
            <ShoppingBag className={`${isDesktop ? "h-6 w-6" : "h-5 w-5"} text-gray-800`} />
          </div>

          {/* Desktop: side-by-side product layout */}
          {isDesktop ? (
            <div className="flex gap-8 p-8">
              {/* Left: images */}
              <div className="flex-1 space-y-3">
                {/* Main image */}
                {mainImage && (
                  <div className="relative bg-gray-50 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mainImage} alt={data.product.title} className="w-full h-[400px] object-contain" />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        </button>
                      </>
                    )}
                  </div>
                )}
                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2">
                    {images.slice(0, 6).map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIdx(i)}
                        className={`w-16 h-16 flex-shrink-0 border-2 rounded-lg overflow-hidden transition-all ${
                          i === currentImageIdx ? "border-gray-800 shadow-md" : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: product info */}
              <div className="flex-1 space-y-4">
                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex">{renderStars(data.review.rating)}</div>
                  <span className="text-sm font-semibold">{data.review.label}</span>
                  <span className="text-sm text-gray-500">
                    | Noté {data.review.rating} ({data.review.count.toLocaleString("fr-FR")} clients satisfaits)
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-xl font-bold text-gray-900">{data.product.title || data.advantages.title}</h1>

                {/* Advantages */}
                <div className="space-y-1.5">
                  {data.advantages.items.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                      <Check className="h-4 w-4 shrink-0" style={{ color: data.brand_color }} />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-3xl font-bold">${data.product.price.toFixed(2)}</span>
                  {data.product.compare_at_price > 0 && (
                    <>
                      <span className="text-lg line-through text-gray-400">${data.product.compare_at_price.toFixed(2)}</span>
                      {discount > 0 && (
                        <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: data.brand_color }}>
                          ÉCONOMISEZ {discount}%
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Add to cart */}
                <button
                  className="w-full py-4 text-white font-bold text-sm tracking-wider rounded-lg transition-opacity hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: data.brand_color || "#1a1a1a" }}
                  onClick={() => {/* preview only */}}
                >
                  AJOUTER AU PANIER — ${data.product.price.toFixed(2)}
                </button>

                {/* Trust badges */}
                <div className="flex justify-center gap-4 pt-1">
                  {data.trust_badges.map((badge, i) => (
                    <span key={i} className="text-xs font-medium" style={{ color: data.brand_color }}>
                      {badge}
                    </span>
                  ))}
                </div>

                {/* Payment methods */}
                <div className="flex justify-center gap-2">
                  {[
                    { label: "VISA", bg: "#1a1f71", color: "#fff" },
                    { label: "MC", bg: "#eb001b", color: "#fff" },
                    { label: "AMEX", bg: "#006fcf", color: "#fff" },
                    { label: "PayPal", bg: "#003087", color: "#fff" },
                    { label: "Apple", bg: "#000", color: "#fff" },
                    { label: "GPay", bg: "#4285f4", color: "#fff" },
                  ].map((m, i) => (
                    <div
                      key={i}
                      className="w-12 h-7 rounded flex items-center justify-center border border-gray-200"
                      style={{ backgroundColor: m.bg }}
                    >
                      <span className="text-[8px] font-bold" style={{ color: m.color }}>{m.label}</span>
                    </div>
                  ))}
                </div>

                {/* Accordions */}
                <div className="border-t border-gray-100 pt-3 space-y-0">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === "description" ? null : "description")}
                    className="flex items-center justify-between w-full py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-sm">Description</span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openAccordion === "description" ? "rotate-180" : ""}`} />
                  </button>
                  {openAccordion === "description" && (
                    <p className="text-sm text-gray-600 py-3 leading-relaxed">{data.product.short_description}</p>
                  )}
                  <button
                    onClick={() => setOpenAccordion(openAccordion === "mode" ? null : "mode")}
                    className="flex items-center justify-between w-full py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-sm">Mode d&apos;emploi</span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openAccordion === "mode" ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Mobile layout ── */
            <>
              {/* Product Image */}
              {mainImage && (
                <div className="relative bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mainImage} alt={data.product.title} className="w-full h-72 object-contain" />
                  {images.length > 1 && (
                    <>
                      {currentImageIdx > 0 && (
                        <button
                          onClick={prevImage}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                      )}
                      <button
                        onClick={nextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 text-gray-600" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-1.5 px-4 py-2 overflow-x-auto">
                  {images.slice(0, 5).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIdx(i)}
                      className={`w-14 h-14 flex-shrink-0 border-2 rounded overflow-hidden transition-all ${
                        i === currentImageIdx ? "border-gray-800 shadow-md" : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
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
                  className="w-full py-3.5 text-white font-bold text-sm tracking-wider rounded-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: data.brand_color || "#1a1a1a" }}
                  onClick={() => {/* preview only */}}
                >
                  AJOUTER AU PANIER — ${data.product.price.toFixed(2)}
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
                {[
                  { label: "VISA", bg: "#1a1f71", color: "#fff" },
                  { label: "MC", bg: "#eb001b", color: "#fff" },
                  { label: "AMEX", bg: "#006fcf", color: "#fff" },
                  { label: "PayPal", bg: "#003087", color: "#fff" },
                  { label: "Apple", bg: "#000", color: "#fff" },
                  { label: "GPay", bg: "#4285f4", color: "#fff" },
                ].map((m, i) => (
                  <div
                    key={i}
                    className="w-10 h-6 rounded flex items-center justify-center border border-gray-200"
                    style={{ backgroundColor: m.bg }}
                  >
                    <span className="text-[7px] font-bold" style={{ color: m.color }}>{m.label}</span>
                  </div>
                ))}
              </div>

              {/* Description accordion */}
              <div className="px-4 py-2 border-t border-gray-100">
                <button
                  onClick={() => setOpenAccordion(openAccordion === "description" ? null : "description")}
                  className="flex items-center justify-between w-full py-2 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-sm">Description</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openAccordion === "description" ? "rotate-180" : ""}`} />
                </button>
                {openAccordion === "description" && (
                  <p className="text-xs text-gray-600 pb-3 leading-relaxed">{data.product.short_description}</p>
                )}
              </div>

              {/* Mode d'emploi accordion */}
              <div className="px-4 py-2 border-t border-gray-100">
                <button
                  onClick={() => setOpenAccordion(openAccordion === "mode" ? null : "mode")}
                  className="flex items-center justify-between w-full py-2 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-sm">Mode d&apos;emploi</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openAccordion === "mode" ? "rotate-180" : ""}`} />
                </button>
              </div>
            </>
          )}

          {/* ─── SECTION: Hero ─── */}
          <div id="section-hero" className={`text-center bg-gray-50 ${isDesktop ? "px-12 py-10" : "px-4 py-6"}`}>
            <h2 className={`font-bold leading-tight mb-2 ${isDesktop ? "text-2xl" : "text-xl"}`}>
              {renderHeadline(data.hero.headline, data.hero.bold_word)}
            </h2>
            <p className={`text-gray-500 ${isDesktop ? "text-sm" : "text-xs"}`}>{data.hero.subtext}</p>
            {heroImage && (
              <div className="mt-4 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImage} alt="Hero" className={`w-full object-cover ${isDesktop ? "h-72" : "h-48"}`} />
              </div>
            )}
          </div>

          {/* ─── SECTION: FAQ with image ─── */}
          <div id="section-faq" className={`${isDesktop ? "px-12 py-10" : "px-4 py-6"}`}>
            {data.faq.length > 0 && (
              <>
                <h3 className={`font-bold mb-1 ${isDesktop ? "text-xl" : "text-lg"}`}>{data.faq[0].question}</h3>
                <p className={`text-gray-600 mb-3 ${isDesktop ? "text-sm" : "text-xs"}`}>{data.faq[0].answer}</p>
              </>
            )}
            {faqImage && (
              <div className="rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={faqImage} alt="FAQ" className={`w-full object-cover ${isDesktop ? "h-60" : "h-44"}`} />
              </div>
            )}
          </div>

          {/* ─── SECTION: Timeline ─── */}
          <div id="section-timeline" className={`bg-gray-50 ${isDesktop ? "px-12 py-10" : "px-4 py-6"}`}>
            <div className="relative pl-6">
              {data.timeline.map((item, i) => (
                <div key={i} className="relative pb-5 last:pb-0">
                  {i < data.timeline.length - 1 && (
                    <div className="absolute left-[-16px] top-2 w-0.5 h-full bg-gray-300" />
                  )}
                  <div
                    className={`absolute left-[-20px] top-1 w-3 h-3 rounded-full border-2 ${
                      i <= 2 ? "border-gray-800 bg-gray-800" : "border-gray-300 bg-white"
                    }`}
                  />
                  <p className={`font-bold ${isDesktop ? "text-sm" : "text-xs"} ${i <= 2 ? "text-gray-800" : "text-gray-400"}`}>{item.period}</p>
                  <p className={`${isDesktop ? "text-sm" : "text-[11px]"} ${i <= 2 ? "text-gray-600" : "text-gray-400"}`}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── SECTION: Comparison ─── */}
          <div id="section-comparison" className={`${isDesktop ? "px-12 py-10" : "px-4 py-6"}`}>
            <h3 className={`text-center font-bold mb-1 ${isDesktop ? "text-xl" : "text-lg"}`}>Face à la concurrence</h3>
            <p className={`text-center text-gray-500 mb-4 ${isDesktop ? "text-sm" : "text-xs"}`}>
              Comparez et découvrez la différence de qualité et de style authentique
            </p>
            <div className={`border border-gray-200 rounded-lg overflow-hidden ${isDesktop ? "max-w-xl mx-auto" : ""}`}>
              <div className="grid grid-cols-3 text-center bg-gray-50 border-b border-gray-200 py-2">
                <div />
                <div>
                  <p className={`font-bold ${isDesktop ? "text-sm" : "text-xs"}`}>{data.comparison.our_name}</p>
                  <p className="text-[10px] text-gray-400">{data.comparison.our_subtitle}</p>
                </div>
                <div>
                  <p className={`font-bold ${isDesktop ? "text-sm" : "text-xs"}`}>{data.comparison.other_name}</p>
                </div>
              </div>
              {data.comparison.rows.map((row, i) => (
                <div key={i} className="grid grid-cols-3 text-center items-center py-2.5 border-b border-gray-100 last:border-0">
                  <p className={`text-left pl-3 ${isDesktop ? "text-sm" : "text-[11px]"}`}>{row.feature}</p>
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
          <div id="section-statistics" className={`bg-gray-50 ${isDesktop ? "px-12 py-10" : "px-4 py-6"}`}>
            {beforeImage && afterImage && (
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative rounded-lg overflow-hidden">
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded">BEFORE</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={beforeImage} alt="Before" className={`w-full object-cover ${isDesktop ? "h-52" : "h-40"}`} />
                </div>
                <div className="flex-1 relative rounded-lg overflow-hidden">
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded">AFTER</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={afterImage} alt="After" className={`w-full object-cover ${isDesktop ? "h-52" : "h-40"}`} />
                </div>
              </div>
            )}
            {data.statistics.map((stat, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-200 last:border-0">
                <span className={`font-black ${isDesktop ? "text-3xl" : "text-2xl"}`} style={{ color: data.brand_color }}>{stat.value}</span>
                <span className={`text-gray-600 ${isDesktop ? "text-sm" : "text-xs"}`}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Sticky add to cart */}
          <div className={`border-t border-gray-200 bg-white ${isDesktop ? "px-8 py-4" : "px-4 py-3"}`}>
            <button
              className={`w-full text-white font-bold tracking-wider transition-opacity hover:opacity-90 active:scale-[0.98] ${isDesktop ? "py-4 text-sm rounded-lg max-w-md mx-auto block" : "py-3.5 text-sm rounded-sm"}`}
              style={{ backgroundColor: data.brand_color || "#1a1a1a" }}
              onClick={() => {/* preview only */}}
            >
              ACHETER MAINTENANT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
