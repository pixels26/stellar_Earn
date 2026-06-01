'use client';

import { ReactNode, useEffect, useState } from 'react';

/**
 * HydrationBoundary Component
 * 
 * Creates a hydration boundary that ensures safe rendering of client-side content.
 * This component:
 * 1. Prevents hydration mismatches by rendering placeholder on server
 * 2. Only renders actual content on client
 * 3. Suppresses hydration warnings from React
 * 
 * Use this wrapper for providers that depend on browser APIs like:
 * - localStorage
 * - window object
 * - DOM API
 * - Browser events
 */
interface HydrationBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function HydrationBoundary({ 
  children, 
  fallback = null 
}: HydrationBoundaryProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after first client-side render
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    // Server renders the fallback (usually empty or minimal)
    // Client renders nothing until hydration is complete
    return <>{fallback}</>;
  }

  // Only render actual content after client hydration is complete
  return <>{children}</>;
}
