import React, { useState, useEffect } from 'react';
import '../styles/Mobile.css';

const MobileHeader = ({
  title,
  subtitle = null,
  actions = [],
  backAction = null,
  searchable = false,
  onSearch = null,
  searchPlaceholder = 'Αναζήτηση...',
  className = ''
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSearchChange = (value) => {
    setSearchValue(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) {
      setSearchValue('');
      if (onSearch) {
        onSearch('');
      }
    }
  };

  return (
    <div className={`mobile-header ${className}`}>
      {/* Search overlay for mobile */}
      {isSearchOpen && isMobile && (
        <div className="mobile-search-overlay">
          <div className="mobile-search-container">
            <input
              type="text"
              className="mobile-search-input"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              autoFocus
            />
            <button
              className="mobile-search-close"
              onClick={toggleSearch}
              aria-label="Κλείσιμο αναζήτησης"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="mobile-header-content">
        {/* Left side - Back button and title */}
        <div className="mobile-header-left">
          {backAction && (
            <button
              className="mobile-back-button touch-button"
              onClick={backAction.onClick}
              aria-label={backAction.label || 'Επιστροφή'}
            >
              ← {isMobile ? '' : backAction.label}
            </button>
          )}

          <div className="mobile-header-title-container">
            <h1 className="mobile-page-title">{title}</h1>
            {subtitle && (
              <p className="mobile-page-subtitle">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side - Actions and search */}
        <div className="mobile-header-right">
          {/* Desktop search */}
          {searchable && !isMobile && (
            <div className="mobile-search-container desktop-search">
              <div className="mobile-search-icon">🔍</div>
              <input
                type="text"
                className="mobile-search-input"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          )}

          {/* Mobile search button */}
          {searchable && isMobile && (
            <button
              className="mobile-header-action touch-button"
              onClick={toggleSearch}
              aria-label="Αναζήτηση"
            >
              🔍
            </button>
          )}

          {/* Action buttons */}
          {actions.map((action, index) => (
            <button
              key={index}
              className={`mobile-header-action touch-button ${action.primary ? 'primary' : 'secondary'}`}
              onClick={action.onClick}
              disabled={action.disabled}
              aria-label={action.label}
              title={action.label}
            >
              {isMobile ? action.icon : action.label}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .mobile-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          padding: 12px 16px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .mobile-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 100%;
          gap: 16px;
        }

        .mobile-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .mobile-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .mobile-back-button {
          background: none;
          border: none;
          color: #3b82f6;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 6px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .mobile-back-button:hover {
          background: rgba(59, 130, 246, 0.1);
        }

        .mobile-header-title-container {
          min-width: 0;
          flex: 1;
        }

        .mobile-page-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mobile-page-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 2px 0 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mobile-header-action {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          color: #374151;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .mobile-header-action.primary {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .mobile-header-action:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .mobile-header-action.primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .mobile-header-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .mobile-search-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 20px;
        }

        .mobile-search-overlay .mobile-search-container {
          position: relative;
          width: 100%;
          max-width: 400px;
          margin-top: 60px;
        }

        .mobile-search-close {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 18px;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .desktop-search {
          width: 240px;
        }

        @media (max-width: 768px) {
          .mobile-header {
            padding: 12px 16px;
          }

          .mobile-page-title {
            font-size: 18px;
          }

          .mobile-header-action {
            width: 40px;
            height: 40px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          }

          .mobile-back-button {
            width: 40px;
            height: 40px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
          }
        }

        @media (max-width: 480px) {
          .mobile-header-content {
            gap: 8px;
          }

          .mobile-page-title {
            font-size: 16px;
          }

          .mobile-page-subtitle {
            font-size: 12px;
          }

          .mobile-header-action {
            width: 36px;
            height: 36px;
            font-size: 14px;
          }

          .mobile-back-button {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }
        }

        @media (prefers-color-scheme: dark) {
          .mobile-header {
            background: rgba(31, 41, 55, 0.95);
            border-bottom-color: rgba(255, 255, 255, 0.1);
          }

          .mobile-page-title {
            color: #f9fafb;
          }

          .mobile-page-subtitle {
            color: #9ca3af;
          }

          .mobile-back-button {
            color: #60a5fa;
          }

          .mobile-header-action {
            background: #374151;
            border-color: #4b5563;
            color: #f3f4f6;
          }

          .mobile-header-action.primary {
            background: #3b82f6;
            border-color: #3b82f6;
            color: white;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mobile-header-action,
          .mobile-back-button {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileHeader;