import { useState, useMemo, useCallback } from 'react';

/**
 * Custom hook for pagination logic
 * @param {Array} data - The array of items to paginate
 * @param {number} itemsPerPage - Number of items per page (default: 10)
 * @returns {Object} Pagination state and controls
 */
export const usePagination = (data = [], itemsPerPage = 10) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Calculate pagination values
    const paginationInfo = useMemo(() => {
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        const currentItems = data.slice(startIndex, endIndex);

        return {
            totalItems,
            totalPages,
            startIndex,
            endIndex,
            currentItems,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1,
            isEmpty: totalItems === 0
        };
    }, [data, currentPage, itemsPerPage]);

    // Page change handler
    const goToPage = useCallback((page) => {
        const { totalPages } = paginationInfo;
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    }, [paginationInfo]);

    // Navigation functions
    const goToNextPage = useCallback(() => {
        if (paginationInfo.hasNextPage) {
            setCurrentPage(prev => prev + 1);
        }
    }, [paginationInfo.hasNextPage]);

    const goToPrevPage = useCallback(() => {
        if (paginationInfo.hasPrevPage) {
            setCurrentPage(prev => prev - 1);
        }
    }, [paginationInfo.hasPrevPage]);

    const goToFirstPage = useCallback(() => {
        setCurrentPage(1);
    }, []);

    const goToLastPage = useCallback(() => {
        setCurrentPage(paginationInfo.totalPages);
    }, [paginationInfo.totalPages]);

    // Reset to first page when data changes
    const resetPagination = useCallback(() => {
        setCurrentPage(1);
    }, []);

    return {
        // Current state
        currentPage,
        itemsPerPage,

        // Pagination info
        ...paginationInfo,

        // Navigation functions
        goToPage,
        goToNextPage,
        goToPrevPage,
        goToFirstPage,
        goToLastPage,
        resetPagination,

        // Convenience setters
        setCurrentPage,
    };
};

/**
 * Custom hook for search with pagination
 * @param {Array} data - The array of items to search and paginate
 * @param {Function} searchFunction - Function that takes an item and search term, returns boolean
 * @param {number} itemsPerPage - Number of items per page (default: 10)
 * @returns {Object} Search and pagination state and controls
 */
export const useSearchWithPagination = (data = [], searchFunction, itemsPerPage = 10) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter data based on search term
    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return data;
        return data.filter(item => searchFunction(item, searchTerm));
    }, [data, searchTerm, searchFunction]);

    // Use pagination on filtered data
    const pagination = usePagination(filteredData, itemsPerPage);

    // Reset pagination when search term changes
    const handleSearchChange = useCallback((newSearchTerm) => {
        setSearchTerm(newSearchTerm);
        pagination.resetPagination();
    }, [pagination]);

    return {
        // Search state
        searchTerm,
        setSearchTerm,
        handleSearchChange,

        // Filtered data
        filteredData,

        // Pagination (spread all pagination properties)
        ...pagination,

        // Override currentItems to use filtered data
        currentItems: pagination.currentItems,
    };
};

export default usePagination;