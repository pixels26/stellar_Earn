'use client';

import { ReactNode, useEffect, useState } from 'react';

/**
 * ClientOnly Component
 * 
 * Ensures that content is only rendered on the client, preventing hydration mismatches.
 * This component suppresses hydration warnings and renders nothing on the server.
 * 
 * Usage:
 * ```
 * <ClientOnly>
 *   <SomeClientComponent />
 * </ClientOnly>
 * ```
 */
interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <>{children}</> : <>{fallback}</>;
}
