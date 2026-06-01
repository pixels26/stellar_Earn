'use client';

import React, { useEffect } from 'react';
import {
  measureFCP,
  measureTTFB,
  reportWebVitals,
  trackPerformance,
} from '@/lib/utils/performance';

const PerformanceMonitor: React.FC = () => {
  useEffect(() => {
    // Basic measurements
    measureTTFB();
    measureFCP();

    // Advanced web vitals
    reportWebVitals((metric) => {
      trackPerformance(metric.name, metric.value, {
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating,
        href: metric.href,
        entries: metric.entries,
      });
    });
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;
