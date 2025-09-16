import React, { useState, useEffect } from 'react';
import '../styles/Mobile.css';

const ResponsiveTable = ({
  data = [],
  columns = [],
  renderActions = null,
  loading = false,
  emptyMessage = 'Δεν βρέθηκαν δεδομένα',
  emptyIcon = '📄',
  onRowClick = null,
  cardView = false,
  breakpoint = 768
}) => {
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobileView(window.innerWidth <= breakpoint || cardView);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, [breakpoint, cardView]);

  if (loading) {
    return (
      <div className="mobile-loading">
        <div className="mobile-loading-spinner" role="status"></div>
        <p className="mobile-loading-text">Φόρτωση δεδομένων...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="mobile-empty-state">
        <div className="mobile-empty-icon">{emptyIcon}</div>
        <h3 className="mobile-empty-title">Κενά Δεδομένα</h3>
        <p className="mobile-empty-description">{emptyMessage}</p>
      </div>
    );
  }

  // Mobile Card View
  if (isMobileView) {
    return (
      <div className="mobile-cards-container mobile-optimized">
        {data.map((item, index) => (
          <div
            key={item.id || index}
            className={`mobile-card ${onRowClick ? 'mobile-card-clickable' : ''}`}
            onClick={() => onRowClick && onRowClick(item)}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={(e) => {
              if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onRowClick(item);
              }
            }}
            data-testid="mobile-card"
          >
            <div className="mobile-card-header">
              <div>
                <h4 className="mobile-card-title">
                  {columns[0]?.render ? columns[0].render(item) : item[columns[0]?.key]}
                </h4>
                {columns[1] && (
                  <p className="mobile-card-subtitle">
                    {columns[1].render ? columns[1].render(item) : item[columns[1].key]}
                  </p>
                )}
              </div>
            </div>

            <div className="mobile-card-content">
              {columns.slice(2).map((column) => (
                <div key={column.key} className="mobile-card-field">
                  <span className="mobile-card-label">{column.label}</span>
                  <span className="mobile-card-value">
                    {column.render ? column.render(item) : item[column.key]}
                  </span>
                </div>
              ))}
            </div>

            {renderActions && (
              <div className="mobile-actions">
                {renderActions(item)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="mobile-table-container">
      <table className="mobile-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ width: column.width }}>
                {column.label}
              </th>
            ))}
            {renderActions && <th style={{ width: '120px' }}>Ενέργειες</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={item.id || index}
              className={onRowClick ? 'table-row-clickable' : ''}
              onClick={() => onRowClick && onRowClick(item)}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyPress={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(item);
                }
              }}
            >
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(item) : item[column.key]}
                </td>
              ))}
              {renderActions && (
                <td>
                  <div className="table-actions">
                    {renderActions(item)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Status Badge Component
export const StatusBadge = ({ status, type = 'default' }) => {
  const getStatusClass = () => {
    switch (type) {
      case 'payment':
        return status === 'paid' ? 'mobile-status-success' : 'mobile-status-warning';
      case 'application':
        return status === 'approved' ? 'mobile-status-success' :
               status === 'pending' ? 'mobile-status-warning' : 'mobile-status-error';
      default:
        return 'mobile-status-info';
    }
  };

  return (
    <span className={`mobile-status-badge ${getStatusClass()}`}>
      {status}
    </span>
  );
};

// Action Button Component
export const ActionButton = ({
  onClick,
  children,
  variant = 'secondary',
  disabled = false,
  type = 'button',
  className = ''
}) => {
  const baseClass = 'mobile-action-button touch-button';
  const variantClass = `mobile-action-${variant}`;

  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// Search Component
export const MobileSearch = ({
  value,
  onChange,
  placeholder = 'Αναζήτηση...',
  icon = '🔍'
}) => {
  return (
    <div className="mobile-search-container">
      <div className="mobile-search-icon">{icon}</div>
      <input
        type="text"
        className="mobile-search-input mobile-form-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

// Filter Buttons Component
export const FilterButtons = ({
  filters,
  activeFilter,
  onFilterChange
}) => {
  return (
    <div className="mobile-filter-buttons">
      {filters.map((filter) => (
        <button
          key={filter.key}
          className={`mobile-filter-button ${activeFilter === filter.key ? 'active' : ''}`}
          onClick={() => onFilterChange(filter.key)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

// Mobile Modal Component
export const MobileModal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '600px'
}) => {
  if (!isOpen) return null;

  return (
    <div className="mobile-modal-overlay" onClick={onClose}>
      <div
        className="mobile-modal"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-modal-header">
          <h2 className="mobile-modal-title">{title}</h2>
          <button className="mobile-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="mobile-modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

// Form Group Component
export const MobileFormGroup = ({
  label,
  children,
  required = false,
  error = null
}) => {
  return (
    <div className="mobile-form-group">
      <label className="mobile-form-label">
        {label}
        {required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
      {error && (
        <div style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
          {error}
        </div>
      )}
    </div>
  );
};

// Responsive Pagination Component
export const MobilePagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showInfo = true
}) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="mobile-pagination">
      <button
        className="mobile-pagination-button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ‹
      </button>

      {getVisiblePages().map((page, index) => (
        <button
          key={index}
          className={`mobile-pagination-button ${
            page === currentPage ? 'active' : ''
          }`}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '...'}
        >
          {page}
        </button>
      ))}

      <button
        className="mobile-pagination-button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        ›
      </button>

      {showInfo && (
        <div className="mobile-pagination-info">
          {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}-
          {Math.min(currentPage * itemsPerPage, totalItems)} από {totalItems}
        </div>
      )}
    </div>
  );
};

export default ResponsiveTable;