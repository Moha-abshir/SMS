import React from 'react';
import { useLocation } from 'react-router-dom';
import { ContentSkeleton, layoutForPath } from './ContentSkeleton';

/** Code and data loading use the destination layout rather than successive loading banners. */
export function RouteLoading() {
  const { pathname } = useLocation();
  return (
    <ContentSkeleton
      layout={layoutForPath(pathname)}
      header
      filters={pathname !== '/login'}
    />
  );
}
