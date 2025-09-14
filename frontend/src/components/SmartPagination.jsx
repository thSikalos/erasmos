import React from 'react';

const SmartPagination = ({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage = 10,
    totalItems,
    showInfo = true,
    className = ""
}) => {
    // Calculate pagination numbers to show
    const getPageNumbers = () => {
        const delta = 2; // Number of pages to show before and after current page
        const pages = [];

        // Always show first page
        pages.push(1);

        // Calculate range around current page
        const rangeStart = Math.max(2, currentPage - delta);
        const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

        // Add ellipsis after first page if needed
        if (rangeStart > 2) {
            pages.push('...');
        }

        // Add pages around current page
        for (let i = rangeStart; i <= rangeEnd; i++) {
            pages.push(i);
        }

        // Add ellipsis before last page if needed
        if (rangeEnd < totalPages - 1) {
            pages.push('...');
        }

        // Always show last page (if more than 1 page)
        if (totalPages > 1) {
            pages.push(totalPages);
        }

        // Remove duplicates
        return [...new Set(pages)];
    };

    // Calculate display info
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalPages <= 1) return null;

    const pageNumbers = getPageNumbers();

    return (
        <div className={`smart-pagination ${className}`}>
            <style>
                {`
                    .smart-pagination {
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                        align-items: center;
                        margin: 2rem 0;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }

                    .pagination-info {
                        font-size: 0.9rem;
                        color: #6b7280;
                        text-align: center;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        padding: 0.75rem 1.5rem;
                        border-radius: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    }

                    .pagination-controls {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        flex-wrap: wrap;
                        justify-content: center;
                    }

                    .pagination-btn {
                        padding: 0.75rem 1rem;
                        border: none;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        border-radius: 10px;
                        color: #374151;
                        font-weight: 600;
                        font-size: 0.9rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                        min-width: 44px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .pagination-btn:hover:not(:disabled) {
                        background: rgba(102, 126, 234, 0.2);
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
                        border-color: rgba(102, 126, 234, 0.3);
                    }

                    .pagination-btn:active:not(:disabled) {
                        transform: translateY(0);
                    }

                    .pagination-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                        transform: none !important;
                    }

                    .pagination-btn.active {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                        border-color: rgba(255, 255, 255, 0.3);
                    }

                    .pagination-btn.active:hover {
                        background: linear-gradient(135deg, #5a67d8, #6b46c1);
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
                    }

                    .pagination-ellipsis {
                        color: #9ca3af;
                        font-weight: 600;
                        padding: 0.75rem 0.5rem;
                        display: flex;
                        align-items: center;
                        pointer-events: none;
                    }

                    .pagination-nav-btn {
                        padding: 0.75rem 1.5rem;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }

                    /* Responsive design */
                    @media (max-width: 640px) {
                        .smart-pagination {
                            gap: 0.75rem;
                        }

                        .pagination-controls {
                            gap: 0.25rem;
                        }

                        .pagination-btn {
                            padding: 0.5rem 0.75rem;
                            min-width: 40px;
                            font-size: 0.85rem;
                        }

                        .pagination-nav-btn {
                            padding: 0.5rem 1rem;
                            font-size: 0.85rem;
                        }

                        .pagination-info {
                            font-size: 0.8rem;
                            padding: 0.5rem 1rem;
                        }
                    }

                    /* Hide some page numbers on very small screens */
                    @media (max-width: 480px) {
                        .pagination-btn[data-hide-mobile="true"] {
                            display: none;
                        }
                    }
                `}
            </style>

            {showInfo && (
                <div className="pagination-info">
                    📄 Εμφάνιση {startItem}-{endItem} από {totalItems} εγγραφές
                    (Σελίδα {currentPage} από {totalPages})
                </div>
            )}

            <div className="pagination-controls">
                {/* Previous button */}
                <button
                    className="pagination-btn pagination-nav-btn"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    ⬅️ Προηγούμενη
                </button>

                {/* Page numbers */}
                {pageNumbers.map((page, index) => {
                    if (page === '...') {
                        return (
                            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                                ...
                            </span>
                        );
                    }

                    // Hide middle pages on mobile
                    const shouldHideOnMobile =
                        page !== 1 &&
                        page !== totalPages &&
                        Math.abs(page - currentPage) > 1;

                    return (
                        <button
                            key={page}
                            className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                            onClick={() => onPageChange(page)}
                            data-hide-mobile={shouldHideOnMobile}
                        >
                            {page}
                        </button>
                    );
                })}

                {/* Next button */}
                <button
                    className="pagination-btn pagination-nav-btn"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Επόμενη ➡️
                </button>
            </div>
        </div>
    );
};

export default SmartPagination;