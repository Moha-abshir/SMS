import React, { useEffect } from 'react';
import { ContentSkeleton, type SkeletonLayout } from './ContentSkeleton';
export interface PageLoadingWrapperProps {
  isLoading: boolean;
  header?: boolean;
  title?: string;
  subtitle?: string;
  icon?: React.ElementType;
  skeleton?: React.ReactNode;
  variant?: 'table' | 'dashboard' | 'timetable' | 'form' | 'register' | 'cards';
  statCount?: number;
  rowCount?: number;
  children: React.ReactNode;
}

export interface PageLoadingProgressProps {
  isLoading: boolean;
  title?: string;
  subtitle?: string;
  onComplete?: () => void;
  icon?: React.ElementType;
}

const layoutFromTitle = (title = ''): SkeletonLayout =>
  /dashboard|workstation|overview/i.test(title)
    ? 'dashboard'
    : /timetable/i.test(title)
      ? 'timetable'
      : /setting|profile/i.test(title)
        ? 'form'
        : 'table';
type PageSkeletonProps = Pick<PageLoadingWrapperProps, 'title' | 'subtitle' | 'icon' | 'statCount' | 'rowCount'>;

export const TablePageSkeleton: React.FC<PageSkeletonProps> = ({
  statCount = 4,
  rowCount = 8,
}) => <ContentSkeleton header filters stats={statCount} rows={rowCount} />;
export const DashboardPageSkeleton: React.FC<PageSkeletonProps> = () => (
  <ContentSkeleton header layout="dashboard" />
);
export const TimetablePageSkeleton: React.FC<PageSkeletonProps> = () => (
  <ContentSkeleton header filters layout="timetable" />
);
export const FormPageSkeleton: React.FC<PageSkeletonProps> = () => (
  <ContentSkeleton header layout="form" />
);
export const PageLoadingWrapper: React.FC<PageLoadingWrapperProps> = ({
  isLoading,
  skeleton,
  variant,
  title,
  header = true,
  statCount = 4,
  rowCount = 8,
  children,
}) => {
  if (!isLoading) return <>{children}</>;
  if (skeleton) return <>{skeleton}</>;
  const layout =
    variant === 'register' ? 'table' : variant || layoutFromTitle(title);
  return (
    <ContentSkeleton
      layout={layout}
      header={header}
      filters
      stats={['dashboard', 'table', 'timetable'].includes(layout) ? statCount : 0}
      rows={rowCount}
    />
  );
};
export const PageLoadingProgress: React.FC<PageLoadingProgressProps> = ({
  isLoading,
  onComplete,
}) => {
  useEffect(() => {
    if (!isLoading) onComplete?.();
  }, [isLoading, onComplete]);
  return isLoading ? <ContentSkeleton rows={4} /> : null;
};
