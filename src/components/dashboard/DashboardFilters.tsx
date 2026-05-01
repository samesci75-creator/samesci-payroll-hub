import { useState, useRef, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';

interface DashboardFiltersProps {
  chantiers: string[];
  selectedChantier: string;
  onChantierChange: (value: string) => void;
  onExportPDF: () => void;
  onExportExcel?: () => void;
}

export const DashboardFilters = ({ chantiers, selectedChantier, onChantierChange, onExportPDF, onExportExcel }: DashboardFiltersProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
      <Select value={selectedChantier} onValueChange={onChantierChange}>
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="Tous les chantiers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les chantiers</SelectItem>
          {chantiers.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Export Dropdown Button */}
      <div className="relative w-full sm:w-auto" ref={dropdownRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDropdownOpen((v) => !v)}
          className="w-full sm:w-auto flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          <span>Exportateur</span>
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </Button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/60 transition-colors text-left"
              onClick={() => {
                setDropdownOpen(false);
                onExportPDF();
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Exporter en PDF</p>
                <p className="text-xs text-muted-foreground">Tableau de bord complet</p>
              </div>
            </button>
            <div className="h-px bg-border mx-3" />
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/60 transition-colors text-left"
              onClick={() => {
                setDropdownOpen(false);
                onExportExcel?.();
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 shrink-0">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Exporter en Excel</p>
                <p className="text-xs text-muted-foreground">Format .xlsx (feuille de calcul)</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
