import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
  activeColor?: 'blue' | 'emerald' | 'violet' | 'amber';
}

const colorClasses = {
  blue: 'bg-blue-600 text-white shadow-md shadow-blue-600/20',
  emerald: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20',
  violet: 'bg-violet-600 text-white shadow-md shadow-violet-600/20',
  amber: 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
};

export const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  itemsPerPage, 
  totalItems,
  activeColor = 'blue'
}) => {
  if (totalPages <= 1) return null;

  const getPages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 px-6 bg-slate-50/20 border-t border-slate-100 no-print w-full">
      <div className="text-xs font-bold text-slate-400">
        {totalItems !== undefined && itemsPerPage !== undefined ? (
          <span>
            Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} trong tổng số {totalItems}
          </span>
        ) : (
          <span className="uppercase tracking-widest">Trang {currentPage} / {totalPages}</span>
        )}
      </div>
      
      <div className="flex items-center gap-1.5">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-30 disabled:hover:bg-white shadow-sm"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        
        <div className="flex items-center gap-1">
          {getPages().map((page, index) => (
            page === '...' ? (
              <div key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center text-slate-400">
                <MoreHorizontal className="w-4 h-4" />
              </div>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-black transition-all ${
                  currentPage === page
                    ? colorClasses[activeColor]
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>

        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-30 disabled:hover:bg-white shadow-sm"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
};
