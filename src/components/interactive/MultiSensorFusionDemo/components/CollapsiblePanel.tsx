/**
 * Collapsible Panel Component
 * Reusable panel with expand/collapse functionality for mobile optimization
 */

import React, { useState } from 'react';

interface CollapsiblePanelProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  mobileDefault?: 'open' | 'closed';
  className?: string;
  titleIcon?: React.ReactNode;
  headerActions?: React.ReactNode;
}

export function CollapsiblePanel({ 
  title, 
  children, 
  defaultOpen = true,
  mobileDefault = 'closed',
  className = '',
  titleIcon,
  headerActions
}: CollapsiblePanelProps) {
  // Determine initial state based on screen size and defaults
  const getInitialState = () => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile && mobileDefault === 'closed') {
        return false;
      }
    }
    return defaultOpen;
  };

  const [isOpen, setIsOpen] = useState(getInitialState);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`bg-white/5 rounded-xl border border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={toggleOpen}
      >
        <div className="flex items-center gap-3">
          {titleIcon && (
            <div className="text-burnt-sienna">
              {titleIcon}
            </div>
          )}
          <h3 className="text-lg font-semibold text-white">
            {title}
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          {headerActions && (
            <div onClick={(e) => e.stopPropagation()}>
              {headerActions}
            </div>
          )}
          
          {/* Collapse/Expand Icon */}
          <button
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            title={isOpen ? 'Collapse' : 'Expand'}
          >
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 pt-0">
          {children}
        </div>
      </div>

      {/* Collapsed State Preview */}
      {!isOpen && (
        <div className="px-4 pb-3">
          <div className="text-sm text-gray-500 text-center">
            Click to expand panel
          </div>
        </div>
      )}
    </div>
  );
}

// Specialized panels with preset configurations
export function GaitAnalysisCollapsiblePanel({ children, ...props }: Omit<CollapsiblePanelProps, 'title' | 'titleIcon' | 'mobileDefault'>) {
  return (
    <CollapsiblePanel
      title="Gait Analysis"
      mobileDefault="closed"
      titleIcon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      }
      {...props}
    >
      {children}
    </CollapsiblePanel>
  );
}

export function AlgorithmInsightsCollapsiblePanel({ children, ...props }: Omit<CollapsiblePanelProps, 'title' | 'titleIcon' | 'mobileDefault'>) {
  return (
    <CollapsiblePanel
      title="Traditional Detection Challenges"
      mobileDefault="closed"
      titleIcon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      {...props}
    >
      {children}
    </CollapsiblePanel>
  );
}

export function DetectionStatsCollapsiblePanel({ children, ...props }: Omit<CollapsiblePanelProps, 'title' | 'titleIcon' | 'mobileDefault'>) {
  return (
    <CollapsiblePanel
      title="Detection Statistics"
      mobileDefault="open"
      titleIcon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      }
      {...props}
    >
      {children}
    </CollapsiblePanel>
  );
}