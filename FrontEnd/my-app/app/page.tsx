'use client';

import HeroSection from '@/components/homepage/HeroSection';
import { ComponentErrorBoundary } from '@/components/error/ErrorBoundary';
import LazyLoad from '@/components/ui/LazyLoad';
import {
  DynamicHowItWorks,
  DynamicFeaturedQuests,
  DynamicFAQAccordion,
  DynamicCTASection,
} from '@/lib/dynamic-imports';

export default function Home() {
  return (
    <main id="main-content" className="flex flex-col">
      {/* Hero - Above the fold, loaded eagerly */}
      <ComponentErrorBoundary componentName="HeroSection">
        <HeroSection />
      </ComponentErrorBoundary>

      {/* How It Works - Below the fold */}
      <ComponentErrorBoundary componentName="HowItWorks">
        <LazyLoad
          placeholder={
            <div className="min-h-[500px] w-full animate-pulse bg-slate-800/20" />
          }
        >
          <DynamicHowItWorks />
        </LazyLoad>
      </ComponentErrorBoundary>

      {/* Featured Quests - Below the fold */}
      <ComponentErrorBoundary componentName="FeaturedQuests">
        <LazyLoad
          placeholder={
            <div className="min-h-[600px] w-full animate-pulse bg-slate-800/20" />
          }
          rootMargin="100px"
        >
          <DynamicFeaturedQuests />
        </LazyLoad>
      </ComponentErrorBoundary>

      {/* CTA - Below the fold */}
      <LazyLoad
        placeholder={
          <div className="min-h-[300px] w-full animate-pulse bg-slate-800/20" />
        }
      >
        <DynamicCTASection />
      </LazyLoad>

      {/* FAQ - Below the fold */}
      <LazyLoad
        placeholder={
          <div className="min-h-[400px] w-full animate-pulse bg-slate-800/20" />
        }
      >
        <DynamicFAQAccordion />
      </LazyLoad>
    </main>
  );
}
