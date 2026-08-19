'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { usePayroll, Employee } from '../lib/PayrollContext';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export interface MappingItem {
  id: string;
  excelHeader: string;
  sampleValue: string;
  icon: string;
  iconColor: string;
  badge: '100% Match' | 'Likely Match' | 'Action Required' | 'Resolved' | 'Ignored' | 'Not in Settings';
  selectedField: string;
  fieldType: 'String' | 'Currency' | 'Date' | 'Status' | 'Number';
  isRequired?: boolean;
  isError: boolean;
}

export interface CollegeSheet {
  id: string;
  name: string;
  collegeName: string;
  icon: string;
  iconColor: string;
  badgeColor: string;
  allSheetRows: any[][];
  skipRowsCount: number;
  headers: string[];
  rawRows: any[][];
  recordsCount: number;
  isImported: boolean;
  importedAt?: string;
  sampleRow?: any[];
  hasHeaderRow: boolean;
}

// Convert column index (0, 1, 2...) to Excel letters (A, B, C... Z, AA, AB...)
function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Helper to check if a row contains real data and is not completely empty / blank
function isMeaningfulDataRow(row: any[]): boolean {
  if (!row || !Array.isArray(row) || row.length === 0) return false;
  return row.some((cell) => {
    if (cell === null || cell === undefined) return false;
    const str = String(cell).trim();
    return str !== '' && str !== '-' && str !== 'null' && str !== 'undefined';
  });
}

// Helper to process sheet rows taking into account skipped title rows and header configuration
function processSheetRows(
  allRows: any[][],
  skipRows: number,
  hasHeader: boolean
): { headers: string[]; rawRows: any[][]; sampleRow: any[]; recordsCount: number } {
  // Slice off user-configured number of top title banner rows
  const remainingRows = (allRows || []).slice(Math.max(0, skipRows));
  const validRows = remainingRows.filter(isMeaningfulDataRow);

  if (validRows.length === 0) {
    return {
      headers: ['Column A', 'Column B', 'Column C'],
      rawRows: [],
      sampleRow: [],
      recordsCount: 0,
    };
  }

  const maxCols = validRows.reduce((max, r) => Math.max(max, (r || []).length), 0);

  if (hasHeader) {
    const firstRow = validRows[0] || [];
    const headers = Array.from({ length: Math.max(maxCols, firstRow.length) }, (_, colIdx) => {
      const val = firstRow[colIdx];
      if (val !== null && val !== undefined && String(val).trim().length > 0) {
        return String(val).trim();
      }
      return `Column ${getColumnLetter(colIdx)}`;
    });
    const dataRows = validRows.slice(1);
    return {
      headers,
      rawRows: dataRows,
      sampleRow: dataRows[0] || [],
      recordsCount: dataRows.length,
    };
  } else {
    const headers = Array.from({ length: maxCols }, (_, colIdx) => `Column ${getColumnLetter(colIdx)}`);
    return {
      headers,
      rawRows: validRows,
      sampleRow: validRows[0] || [],
      recordsCount: validRows.length,
    };
  }
}

// Function to match Excel header ONLY against fields present in Settings
function matchHeaderWithSettingsFields(
  header: string,
  settingsFields: { id: string; name: string; type: string }[]
): { field: string; badge: MappingItem['badge']; icon: string; iconColor: string } {
  const hClean = header.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const sf of settingsFields) {
    const sClean = sf.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Direct match or partial keyword match
    if (
      sClean === hClean ||
      hClean.includes(sClean) ||
      sClean.includes(hClean) ||
      (sClean.includes('base') && (hClean.includes('base') || hClean.includes('salary') || hClean.includes('wage'))) ||
      (sClean.includes('id') && (hClean === 'id' || hClean.includes('empid') || hClean.includes('code') || hClean.includes('staffid'))) ||
      (sClean.includes('name') && (hClean.includes('name') || hClean.includes('fullname') || hClean.includes('staffname'))) ||
      (sClean.includes('dept') && (hClean.includes('dept') || hClean.includes('college') || hClean.includes('faculty'))) ||
      (sClean.includes('foreign') && (hClean.includes('foreign') || hClean.includes('nationality') || hClean.includes('usd') || hClean.includes('currency'))) ||
      (sClean.includes('bonus') && (hClean.includes('bonus') || hClean.includes('allowance') || hClean.includes('incentive'))) ||
      (sClean.includes('insur') && (hClean.includes('insur') || hClean.includes('medical') || hClean.includes('health'))) ||
      (sClean.includes('absenc') && (hClean.includes('absenc') || hClean.includes('missed') || hClean.includes('leave') || hClean.includes('days'))) ||
      ((sClean.includes('search') || sClean.includes('doc') || sClean.includes('fee')) && (hClean.includes('search') || hClean.includes('doc') || hClean.includes('fee') || hClean.includes('verification') || hClean.includes('saha') || hClean.includes('tadqiq'))) ||
      (sClean.includes('arrival') && (hClean.includes('arrival') || hClean.includes('agency') || hClean.includes('recruitment'))) ||
      (sClean.includes('state') && (hClean.includes('state') || hClean.includes('status') || hClean.includes('paidstate'))) ||
      (sClean.includes('date') && (hClean.includes('date') || hClean.includes('time') || hClean.includes('disbursement') || hClean.includes('paidat')))
    ) {
      let icon = 'dataset';
      let iconColor = 'text-primary';

      if (sf.type === 'Currency' || sClean.includes('salary') || sClean.includes('bonus') || sClean.includes('net')) {
        icon = 'payments';
        iconColor = 'text-emerald-600';
      } else if (sClean.includes('doc') || sClean.includes('search')) {
        icon = 'find_in_page';
        iconColor = 'text-amber-600';
      } else if (sClean.includes('id') || sClean.includes('code')) {
        icon = 'badge';
        iconColor = 'text-primary';
      } else if (sClean.includes('name')) {
        icon = 'person';
        iconColor = 'text-primary';
      } else if (sClean.includes('insur') || sClean.includes('absenc')) {
        icon = 'health_and_safety';
        iconColor = 'text-rose-600';
      } else if (sClean.includes('foreign') || sClean.includes('usd') || sClean.includes('nationality')) {
        icon = 'public';
        iconColor = 'text-teal-600';
      }

      return {
        field: sf.name,
        badge: '100% Match',
        icon,
        iconColor,
      };
    }
  }

  // If header does NOT match any field configured in Settings, default to Ignore
  return {
    field: 'Ignore',
    badge: 'Not in Settings',
    icon: 'block',
    iconColor: 'text-slate-400',
  };
}

export default function ExcelImportPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { importEmployees, showToast, settings, addDynamicField } = usePayroll();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [collegeSheets, setCollegeSheets] = useState<CollegeSheet[]>([]);
  
  // Multi-sheet selection state (one-by-one, multi, or all)
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);
  const [previewSheetId, setPreviewSheetId] = useState<string>('');
  
  // Mapping and filtering state
  const [mappingRows, setMappingRows] = useState<MappingItem[]>([]);
  const [filterSearch, setFilterSearch] = useState('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Single Modal for adding new field directly on the current page
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'Alphanumeric' | 'Currency' | 'Numeric' | 'Date' | 'Status'>('Alphanumeric');

  // Mapped options ONLY from user-configured Settings fields + Ignore
  const configuredSettingsFields = settings?.dynamicFields || [];
  const dropdownOptions = [...configuredSettingsFields.map((f) => f.name), 'Ignore'];

  const steps = [
    { num: 1, label: 'Upload Workbook', icon: 'upload_file' },
    { num: 2, label: 'Choose Paper Sheets', icon: 'account_tree' },
    { num: 3, label: 'Map Columns', icon: 'compare_arrows' },
    { num: 4, label: 'Validate Faculty', icon: 'verified' },
    { num: 5, label: 'Confirm & Ingest', icon: 'task_alt' },
  ];

  // The active sheet used for column preview
  const primarySelectedSheet = collegeSheets.find((s) => s.id === previewSheetId) ||
    collegeSheets.find((s) => selectedSheetIds.includes(s.id)) ||
    collegeSheets[0];

  const selectedSheets = collegeSheets.filter((s) => selectedSheetIds.includes(s.id));
  const importedSheetsCount = collegeSheets.filter((s) => s.isImported).length;
  const totalSelectedRecords = selectedSheets.reduce((sum, s) => sum + s.recordsCount, 0);

  // Real Excel/CSV Parser directly from file with No-Header and Skip-Row Support
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoadingFile(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames;

        if (!sheetNames || sheetNames.length === 0) {
          showToast('Invalid File', 'No worksheets found in this workbook.', 'error');
          setIsLoadingFile(false);
          return;
        }

        const icons = ['medical_services', 'code', 'gavel', 'biotech', 'trending_up', 'palette', 'translate', 'psychiatry', 'domain', 'school'];
        const colors = ['text-rose-600', 'text-blue-600', 'text-amber-600', 'text-emerald-600', 'text-purple-600', 'text-indigo-600', 'text-teal-600', 'text-cyan-600'];

        const parsedSheets: CollegeSheet[] = sheetNames.map((sheetName, index) => {
          const ws = workbook.Sheets[sheetName];
          const jsonRows: any[][] = (XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]) || [];
          
          // Auto-detect title banners on first row(s) (e.g. Row 0 has only 1 string cell while row 2 or 3 has many columns)
          let autoSkip = 0;
          if (jsonRows.length > 2) {
            const row0NonEmpty = (jsonRows[0] || []).filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length;
            const row1NonEmpty = (jsonRows[1] || []).filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length;
            const row2NonEmpty = (jsonRows[2] || []).filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length;
            
            if (row0NonEmpty <= 2 && row1NonEmpty <= 2 && row2NonEmpty >= 3) {
              autoSkip = 2;
            } else if (row0NonEmpty <= 2 && row1NonEmpty >= 3) {
              autoSkip = 1;
            }
          }

          const processed = processSheetRows(jsonRows, autoSkip, true);

          return {
            id: `sheet-${index}-${Date.now()}`,
            name: sheetName,
            collegeName: sheetName,
            icon: icons[index % icons.length],
            iconColor: colors[index % colors.length],
            badgeColor: 'bg-primary/10 text-primary border-primary/20',
            allSheetRows: jsonRows,
            skipRowsCount: autoSkip,
            headers: processed.headers,
            rawRows: processed.rawRows,
            sampleRow: processed.sampleRow,
            recordsCount: processed.recordsCount,
            isImported: false,
            hasHeaderRow: true,
          };
        });

        setFileName(file.name);
        setCollegeSheets(parsedSheets);
        setIsLoadingFile(false);

        if (parsedSheets.length > 0) {
          // Select all sheets by default
          setSelectedSheetIds(parsedSheets.map((s) => s.id));
          setPreviewSheetId(parsedSheets[0].id);
          generateMappingsForSheet(parsedSheets[0]);
          setCurrentStep(2);
          showToast('Workbook Loaded', `Detected ${parsedSheets.length} paper sheet(s) in "${file.name}". All selected for batch mapping.`);
        }
      } catch (err) {
        setIsLoadingFile(false);
        showToast('Parse Error', 'Failed to read spreadsheet file. Please check file format.', 'error');
      }
    };

    reader.onerror = () => {
      setIsLoadingFile(false);
      showToast('Read Error', 'Failed to open file.', 'error');
    };

    reader.readAsArrayBuffer(file);
  };

  // Generate dynamic column mappings strictly using Settings fields
  const generateMappingsForSheet = (sheet: CollegeSheet) => {
    const generatedMappings: MappingItem[] = sheet.headers.map((header, idx) => {
      const sampleVal = sheet.sampleRow && sheet.sampleRow[idx] !== undefined ? String(sheet.sampleRow[idx]) : '-';
      const match = matchHeaderWithSettingsFields(header, configuredSettingsFields);

      return {
        id: `map-${idx}-${Date.now()}`,
        excelHeader: header,
        sampleValue: sampleVal,
        icon: match.icon,
        iconColor: match.iconColor,
        badge: match.badge,
        selectedField: match.field,
        fieldType: 'String',
        isError: false,
      };
    });

    setMappingRows(generatedMappings);
  };

  // Multi-sheet selection toggle
  const handleToggleSheetSelection = (sheetId: string) => {
    setSelectedSheetIds((prev) => {
      const exists = prev.includes(sheetId);
      const updated = exists ? prev.filter((id) => id !== sheetId) : [...prev, sheetId];

      if (!exists && !previewSheetId) {
        setPreviewSheetId(sheetId);
        const s = collegeSheets.find((sheet) => sheet.id === sheetId);
        if (s) generateMappingsForSheet(s);
      } else if (exists && previewSheetId === sheetId) {
        const remaining = updated[0] || '';
        setPreviewSheetId(remaining);
        const s = collegeSheets.find((sheet) => sheet.id === remaining);
        if (s) generateMappingsForSheet(s);
      }

      return updated;
    });
  };

  const handleSelectAllSheets = () => {
    const allIds = collegeSheets.map((s) => s.id);
    setSelectedSheetIds(allIds);
    if (collegeSheets.length > 0) {
      setPreviewSheetId(collegeSheets[0].id);
      generateMappingsForSheet(collegeSheets[0]);
    }
    showToast('All Sheets Selected', `Selected all ${collegeSheets.length} paper sheets for batch mapping.`);
  };

  const handleDeselectAllSheets = () => {
    setSelectedSheetIds([]);
    showToast('Cleared Selection', 'All sheets deselected.', 'info');
  };

  // Switch preview sheet on mapping page
  const handleSwitchPreviewSheet = (sheetId: string) => {
    setPreviewSheetId(sheetId);
    const s = collegeSheets.find((sheet) => sheet.id === sheetId);
    if (s) {
      generateMappingsForSheet(s);
      showToast('Preview Updated', `Showing column mapping preview for "${s.name}".`);
    }
  };

  // Update skip rows count for a specific sheet (e.g. skip first 2 title rows)
  const handleUpdateSheetSkipRows = (sheetId: string, skipRows: number) => {
    const safeSkip = Math.max(0, skipRows);
    setCollegeSheets((prev) =>
      prev.map((s) => {
        if (s.id !== sheetId) return s;
        const processed = processSheetRows(s.allSheetRows || s.rawRows, safeSkip, s.hasHeaderRow);
        const updated: CollegeSheet = {
          ...s,
          skipRowsCount: safeSkip,
          headers: processed.headers,
          rawRows: processed.rawRows,
          sampleRow: processed.sampleRow,
          recordsCount: processed.recordsCount,
        };
        if (s.id === previewSheetId) {
          generateMappingsForSheet(updated);
        }
        return updated;
      })
    );
    showToast('Skipped Rows Updated', `Skipping first ${safeSkip} title row(s) for "${collegeSheets.find((s) => s.id === sheetId)?.name}". Headers and records updated.`);
  };

  // Apply skip count across all currently selected sheets
  const handleApplySkipRowsToAllSheets = (skipRows: number) => {
    const safeSkip = Math.max(0, skipRows);
    setCollegeSheets((prev) =>
      prev.map((s) => {
        if (!selectedSheetIds.includes(s.id)) return s;
        const processed = processSheetRows(s.allSheetRows || s.rawRows, safeSkip, s.hasHeaderRow);
        const updated: CollegeSheet = {
          ...s,
          skipRowsCount: safeSkip,
          headers: processed.headers,
          rawRows: processed.rawRows,
          sampleRow: processed.sampleRow,
          recordsCount: processed.recordsCount,
        };
        if (s.id === previewSheetId) {
          generateMappingsForSheet(updated);
        }
        return updated;
      })
    );
    showToast('Applied to All Sheets', `Applied "Skip ${safeSkip} rows" across all ${selectedSheets.length} selected paper sheets.`);
  };

  // Toggle Header Row per sheet (when user indicates sheet has no headers)
  const handleToggleSheetHeaderMode = (sheetId: string) => {
    setCollegeSheets((prev) =>
      prev.map((s) => {
        if (s.id !== sheetId) return s;
        const nextHasHeader = !s.hasHeaderRow;
        const processed = processSheetRows(s.allSheetRows || s.rawRows, s.skipRowsCount || 0, nextHasHeader);

        const updatedSheet: CollegeSheet = {
          ...s,
          hasHeaderRow: nextHasHeader,
          headers: processed.headers,
          rawRows: processed.rawRows,
          sampleRow: processed.sampleRow,
          recordsCount: processed.recordsCount,
        };

        if (s.id === previewSheetId) {
          generateMappingsForSheet(updatedSheet);
        }

        return updatedSheet;
      })
    );

    showToast('Header Mode Updated', 'Recomputed headers and data rows.');
  };

  // Parse raw rows of ALL selected sheets into Employee objects using mapped fields & SAFE DEFAULTS
  const getParsedEmployeesFromSelectedSheets = (): (Employee & { sourceSheetName: string })[] => {
    if (selectedSheets.length === 0) return [];

    const fieldIndices: { [key: string]: number } = {};
    mappingRows.forEach((row, idx) => {
      if (row.selectedField && row.selectedField !== 'Ignore') {
        fieldIndices[row.selectedField.toLowerCase()] = idx;
      }
    });

    const allEmployees: (Employee & { sourceSheetName: string })[] = [];

    selectedSheets.forEach((sheet) => {
      if (!sheet.rawRows) return;

      sheet.rawRows.forEach((row, rIdx) => {
        // Skip completely empty or blank row
        if (!row || !Array.isArray(row) || row.length === 0) return;
        const isRowEmpty = row.every((c) => c === null || c === undefined || String(c).trim() === '' || String(c).trim() === '-' || String(c).trim() === 'null');
        if (isRowEmpty) return;

        const getVal = (fieldPattern: string) => {
          const key = Object.keys(fieldIndices).find((k) => k.includes(fieldPattern.toLowerCase()));
          if (key !== undefined) {
            const idx = fieldIndices[key];
            if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
              const s = String(row[idx]).trim();
              if (s !== '' && s !== 'null' && s !== 'undefined' && s !== '-') return s;
            }
          }
          return '';
        };

        const rawName = getVal('name') || getVal('staff') || getVal('employee') || getVal('fullname');
        const rawId = getVal('id') || getVal('code') || getVal('no');
        const rawSalaryStr = getVal('base') || getVal('salary') || getVal('wage') || getVal('amount') || getVal('net');

        // If mapped name, id, and salary are all empty, verify if the row has any text at all; if not, skip it
        if (!rawName && !rawId && !rawSalaryStr) {
          const hasAnyCellText = row.some((c) => c !== null && c !== undefined && String(c).trim().length > 0 && isNaN(Number(c)));
          if (!hasAnyCellText) return;
        }

        const finalName = rawName || `Staff Member ${rIdx + 1}`;
        const finalId = rawId || `EMP-${sheet.name.substring(0, 3).toUpperCase()}-${(rIdx + 1).toString().padStart(3, '0')}`;
        const rawDept = getVal('dept') || getVal('department') || getVal('college') || sheet.name;
        
        // Nationality & Currency: If base salary string contains '$' or 'usd', automatically Foreign ($ USD)
        const hasDollarInSalary = rawSalaryStr.includes('$') || /usd/i.test(rawSalaryStr);
        const rawForeign = (getVal('foreign') || getVal('nationality') || getVal('usd') || getVal('currency')).toLowerCase();
        const isForeign = hasDollarInSalary || (rawForeign ? (rawForeign.includes('foreign') || rawForeign.includes('usd') || rawForeign.includes('$') || rawForeign.includes('yes') || rawForeign === 'true' || rawForeign === '1') : false);

        // Remove '$', 'USD', 'IQD', commas and currency symbols to ensure clean numeric value
        const sanitizedSalaryStr = rawSalaryStr
          .replace(/[$€£¥]/g, '')
          .replace(/(usd|iqd|dinar)/gi, '')
          .replace(/,/g, '')
          .trim();
        let cleanSalaryNum = parseFloat(sanitizedSalaryStr) || 0;

        // Rule: If Local employee and base salary is < 20,000, multiply by 1000 (e.g. 4,500 -> 4,500,000)
        if (!isForeign && cleanSalaryNum > 0 && cleanSalaryNum < 20000) {
          cleanSalaryNum = cleanSalaryNum * 1000;
        }

        const currentUsdRate = settings?.usdToDinarRate || 1310;

        // Function to parse currency amounts:
        // Rule: If amount is < 1000, scale it by 1000 for Local (e.g. 50 -> 50,000 IQD).
        // For Foreign employees, scale < 1000 by 1000 if in Dinars, then convert to USD (e.g. 50 -> 50,000 / 1310 = $38.17).
        const parseCurrencyAmount = (rawStr: string): number => {
          if (!rawStr) return 0;
          const isExplicitDollar = rawStr.includes('$') || /usd/i.test(rawStr);
          const sanitized = rawStr
            .replace(/[$€£¥]/g, '')
            .replace(/(usd|iqd|dinar)/gi, '')
            .replace(/,/g, '')
            .trim();
          let amount = parseFloat(sanitized) || 0;
          if (amount <= 0) return 0;

          if (!isForeign) {
            if (amount > 0 && amount < 1000) {
              amount = amount * 1000;
            }
            return amount;
          } else {
            if (isExplicitDollar) {
              return amount;
            }
            let dinarAmount = amount;
            if (dinarAmount > 0 && dinarAmount < 1000) {
              dinarAmount = dinarAmount * 1000;
            }
            return Math.round((dinarAmount / currentUsdRate) * 100) / 100;
          }
        };

        // Searching Doc Fee: subtracted from base salary
        const rawDocFee = getVal('searching') || getVal('doc') || getVal('verification') || getVal('fee');
        const searchingDocFee = parseCurrencyAmount(rawDocFee);

        // Arrival fee (0.05): Default to False (0) since decided later
        const rawArrival = (getVal('arrival') || getVal('agency') || getVal('recruitment')).toLowerCase();
        const hasRecruitmentFee = rawArrival ? (rawArrival.includes('yes') || rawArrival.includes('5') || rawArrival.includes('0.05') || rawArrival.includes('true') || rawArrival === '1') : false;
        const recruitmentFee = hasRecruitmentFee ? cleanSalaryNum * 0.05 : 0;

        const bonus = parseCurrencyAmount(getVal('bonus') || getVal('incentive') || getVal('allowance') || '0');
        const insurance = parseCurrencyAmount(getVal('insurance') || getVal('medical') || getVal('health') || '0');
        
        // Absence deduction: check if direct deduction amount was provided, or calculate from absence days
        const rawAbsenceDeductStr = getVal('absencededuct') || getVal('abs_deduct');
        const absenceDays = parseFloat((getVal('absence') || getVal('leave') || getVal('days') || '0').replace(/[^0-9.]/g, '')) || 0;
        let absenceDeduction = 0;
        if (rawAbsenceDeductStr) {
          absenceDeduction = parseCurrencyAmount(rawAbsenceDeductStr);
        } else if (absenceDays > 0) {
          absenceDeduction = absenceDays * Math.round(cleanSalaryNum / 30);
        }

        const netSalary = Math.max(0, (cleanSalaryNum - recruitmentFee) + bonus - insurance - absenceDeduction - searchingDocFee);

        // Salary State determination:
        // Rule: If base salary is 0, empty, or non-numeric, employee is automatically marked as 'Stopped' (salary withheld)
        const rawState = (getVal('state') || getVal('status') || getVal('paid')).toLowerCase();
        let salaryState: 'Paid' | 'Not Yet' | 'Stopped' = 'Not Yet';

        if (cleanSalaryNum <= 0 || !sanitizedSalaryStr || isNaN(parseFloat(sanitizedSalaryStr))) {
          salaryState = 'Stopped';
        } else if (rawState && rawState.includes('stop')) {
          salaryState = 'Stopped';
        } else if (rawState && rawState.includes('paid') && !rawState.includes('not') && !rawState.includes('unpaid')) {
          salaryState = 'Paid';
        }

        const paidAt = salaryState === 'Paid' ? (getVal('date') || getVal('time') || getVal('disbursement') || new Date().toLocaleString()) : undefined;

        const initials = finalName
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'EM';

        allEmployees.push({
          id: finalId,
          name: finalName,
          initials,
          type: 'Full-Time',
          department: 'Engineering',
          baseSalary: cleanSalaryNum,
          searchingDocFee,
          bonus,
          insurance,
          absenceDays,
          absenceDeduction,
          isForeign,
          currency: isForeign ? 'USD' : 'Dinar',
          hasRecruitmentFee,
          recruitmentFee,
          netSalary,
          salaryState,
          paidAt,
          status: 'Active',
          email: `${finalName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@institution.gov`,
          phone: '+964 770 000 0000',
          joinDate: '2025-01-01',
          paymentStatus: salaryState === 'Paid' ? 'Paid' : 'Unpaid',
          sourceSheetName: sheet.name,
        });
      });
    });

    return allEmployees;
  };

  const currentParsedEmployees = getParsedEmployeesFromSelectedSheets();

  const handleFieldChange = (id: string, value: string) => {
    setMappingRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const isIgnore = value === 'Ignore';
          return {
            ...row,
            selectedField: value,
            isError: false,
            badge: isIgnore ? 'Ignored' : 'Resolved',
            iconColor: isIgnore ? 'text-slate-400' : 'text-primary',
          };
        }
        return row;
      })
    );
  };

  const handleAutoMapAll = () => {
    setMappingRows((prev) =>
      prev.map((row) => {
        const match = matchHeaderWithSettingsFields(row.excelHeader, configuredSettingsFields);
        return {
          ...row,
          selectedField: match.field,
          badge: match.badge,
          icon: match.icon,
          iconColor: match.iconColor,
          isError: false,
        };
      })
    );
    showToast('Auto-Map Applied', 'Re-matched headers against Settings fields.', 'info');
  };

  // Inline Add Field submit handler (adds field directly without leaving step)
  const handleInlineAddFieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    addDynamicField({
      name: newFieldName.trim(),
      type: newFieldType,
    });

    setNewFieldName('');
    setIsAddFieldModalOpen(false);
    showToast('Field Added', `Institutional field "${newFieldName.trim()}" is now available in mapping.`);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (collegeSheets.length === 0) {
        showToast('Upload Required', 'Please choose an Excel (.xlsx / .xls) file first.', 'warning');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedSheetIds.length === 0) {
        showToast('Selection Required', 'Please select at least one paper sheet to map and import.', 'warning');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
      showToast('Validation Complete', `Calculated records for ${currentParsedEmployees.length} staff across ${selectedSheets.length} sheet(s).`, 'info');
    } else if (currentStep === 4) {
      setCurrentStep(5);
    } else if (currentStep === 5) {
      if (currentParsedEmployees.length > 0) {
        const sheetSummary = selectedSheets.length === 1 ? `[${selectedSheets[0].name}]` : `[${selectedSheets.length} Sheets: ${selectedSheets.map((s) => s.name).join(', ')}]`;
        importEmployees(currentParsedEmployees, `${fileName} ${sheetSummary}`);

        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCollegeSheets((prev) =>
          prev.map((s) =>
            selectedSheetIds.includes(s.id)
              ? { ...s, isImported: true, importedAt: nowStr }
              : s
          )
        );
      }
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleImportAnotherSheet = () => {
    const unimported = collegeSheets.filter((s) => !s.isImported);
    if (unimported.length > 0) {
      setSelectedSheetIds([unimported[0].id]);
      setPreviewSheetId(unimported[0].id);
      generateMappingsForSheet(unimported[0]);
    }
    setCurrentStep(2);
    showToast('Select Next Sheets', 'Pick additional paper sheets from your workbook to map and ingest.');
  };

  const filteredMappingRows = mappingRows.filter((r) => {
    const q = filterSearch.toLowerCase();
    return (
      r.excelHeader.toLowerCase().includes(q) ||
      r.selectedField.toLowerCase().includes(q) ||
      r.sampleValue.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-[#f8fafc] text-on-background font-body-md min-h-screen flex antialiased">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f8fafc]">
        <TopNav title="Direct Excel Workbook Ingestion" onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8fafc]">
          <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 pb-20">

            {/* Real File Input for Direct File Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest font-mono">
                    Smart Batch Ingestion Engine
                  </span>
                  {fileName && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500 font-mono font-bold truncate max-w-[200px]">
                        {fileName}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  Multi-Sheet Excel Workbook Ingestion
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Import multiple paper sheets simultaneously, skip title header rows, auto-detect non-header sheets, and map columns instantly.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {currentStep > 1 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2.5 px-3.5 rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">upload_file</span>
                    Change Excel File
                  </button>
                )}

                <Link
                  href="/employees"
                  className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2.5 px-3.5 rounded-xl shadow-2xs transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  View Live Ledger
                </Link>
              </div>
            </div>

            {/* Visual Stepper Navigation Bar */}
            <div className="bg-white rounded-2xl p-3 shadow-2xs border border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {steps.map((s) => {
                  const isActive = currentStep === s.num;
                  const isDone = currentStep > s.num;

                  return (
                    <button
                      key={s.num}
                      onClick={() => {
                        if (s.num <= currentStep || (s.num === 2 && collegeSheets.length > 0)) {
                          setCurrentStep(s.num);
                        }
                      }}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs font-bold'
                          : isDone
                          ? 'text-emerald-700 hover:bg-slate-50'
                          : 'text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isActive
                            ? 'bg-primary text-white shadow-xs'
                            : isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isDone ? <span className="material-symbols-outlined text-[16px]">check</span> : s.num}
                      </div>

                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-mono block leading-none opacity-70">
                          Step {s.num}
                        </span>
                        <span className="text-xs truncate block font-bold mt-0.5">
                          {s.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* STEP 1: UPLOAD EXCEL WORKBOOK */}
            {/* ========================================================================= */}
            {currentStep === 1 && (
              <div className="bg-white rounded-3xl p-8 shadow-2xs border border-slate-200 space-y-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-primary rounded-3xl p-12 text-center transition-all bg-slate-50/60 hover:bg-primary/5 cursor-pointer group flex flex-col items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs mb-4">
                    <span className="material-symbols-outlined text-[36px]">upload_file</span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {isLoadingFile ? 'Parsing Excel Workbook...' : 'Upload College Excel / CSV Workbook'}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Select your Excel spreadsheet (<strong>.xlsx</strong> or <strong>.xls</strong>). The system reads each paper sheet tab and supports sheets with or without header titles.
                  </p>

                  <div className="flex items-center gap-2 mt-4 text-[11px] font-mono text-slate-400">
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-bold text-slate-700">.XLSX</span>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-bold text-slate-700">.XLS</span>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-bold text-slate-700">.CSV</span>
                    <span>Multi-Sheet &amp; No-Header Auto-Lettering</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-6 px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-white flex items-center gap-2 shadow-sm hover:opacity-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">folder_open</span>
                    Select Excel File from Computer
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 2: MULTI-SELECT PAPER SHEETS FROM UPLOADED WORKBOOK */}
            {/* ========================================================================= */}
            {currentStep === 2 && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xs border border-slate-200 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[24px]">tab</span>
                      Paper Sheets Detected in File
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Found <strong>{collegeSheets.length} sheet(s)</strong> in <strong className="font-mono text-slate-800">{fileName}</strong>. Select sheets with matching columns to import together.
                    </p>
                  </div>

                  {/* Multi-Selection Controls (Select All / Deselect All) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAllSheets}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">select_all</span>
                      Select All ({collegeSheets.length})
                    </button>

                    <button
                      onClick={handleDeselectAllSheets}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">deselect</span>
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Selection Summary Banner */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span>
                      Selected: <strong>{selectedSheetIds.length} of {collegeSheets.length} Sheets</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-emerald-700 font-bold">
                      {totalSelectedRecords} Total Records
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    Click any sheet to toggle selection
                  </span>
                </div>

                {collegeSheets.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-[36px] text-slate-300 mb-1">upload_file</span>
                    <p className="text-sm font-bold text-slate-700">No Excel file loaded yet.</p>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="mt-3 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
                    >
                      Go to Step 1 to Upload
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collegeSheets.map((sheet) => {
                      const isSelected = selectedSheetIds.includes(sheet.id);
                      const isImported = sheet.isImported;

                      return (
                        <div
                          key={sheet.id}
                          onClick={() => handleToggleSheetSelection(sheet.id)}
                          className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between relative group ${
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-md shadow-primary/15 ring-2 ring-primary/20'
                              : isImported
                              ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-2xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-2xs border border-slate-200 ${sheet.iconColor}`}>
                                <span className="material-symbols-outlined text-[20px]">{sheet.icon}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {isImported ? (
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                    Imported ({sheet.importedAt})
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border bg-slate-100 text-slate-600 border-slate-200">
                                    ⏳ Ready to Map
                                  </span>
                                )}

                                {/* Checkbox Indicator */}
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                                  isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                                </div>
                              </div>
                            </div>

                            <h4 className="font-black text-slate-900 text-base leading-snug group-hover:text-primary transition-colors">
                              {sheet.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <p className="text-xs text-slate-500 font-mono">
                                {sheet.headers.length} columns detected
                              </p>
                              {!sheet.hasHeaderRow && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200 font-mono">
                                  Default Letters (A, B, C...)
                                </span>
                              )}
                              {sheet.skipRowsCount > 0 && (
                                <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-300 font-mono">
                                  Skip {sheet.skipRowsCount} Rows
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-600 font-bold bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                              {sheet.recordsCount} Records
                            </span>

                            <span className={`font-bold flex items-center gap-1 ${isSelected ? 'text-primary' : 'text-slate-400'}`}>
                              {isSelected ? '✓ Selected for Batch' : '+ Click to Select'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 3: DYNAMIC COLUMN MAPPING WITH SKIP TITLE ROWS CONTROLS */}
            {/* ========================================================================= */}
            {currentStep === 3 && (
              <div className="bg-white rounded-3xl shadow-2xs border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-2xs border border-slate-200 ${primarySelectedSheet?.iconColor || 'text-primary'}`}>
                      <span className="material-symbols-outlined text-[22px]">{primarySelectedSheet?.icon || 'table_chart'}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900">
                          Column Mapping: {selectedSheets.length > 1 ? `${selectedSheets.length} Paper Sheets Selected` : primarySelectedSheet?.name}
                        </h3>
                        {selectedSheets.length > 1 && (
                          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded-md font-mono">
                            Batch Mode
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono">
                        Comparing Excel columns with <strong>{configuredSettingsFields.length} Available Settings Field(s)</strong>
                      </p>
                    </div>
                  </div>

                  {/* Single Clean Mapping Toolbar: "+ Add Field", "Re-Match", Filter */}
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <button
                      onClick={() => setIsAddFieldModalOpen(true)}
                      className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-95 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      + Add Field
                    </button>

                    <button
                      onClick={handleAutoMapAll}
                      className="px-3 py-1.5 bg-white border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary/5 transition-colors cursor-pointer shadow-2xs"
                    >
                      Re-Match
                    </button>

                    <input
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      placeholder="Filter column..."
                      type="text"
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-36"
                    />
                  </div>
                </div>

                {/* SKIP TOP TITLE ROWS TOOLBAR */}
                <div className="bg-amber-50/70 border-b border-amber-200/70 px-5 py-3 text-xs text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <span className="material-symbols-outlined text-[18px] text-amber-700">vertical_align_top</span>
                      <span>Skip Top Title Rows:</span>
                    </div>

                    {/* Counter buttons */}
                    <div className="flex items-center bg-white border border-amber-300 rounded-xl overflow-hidden shadow-2xs">
                      <button
                        onClick={() => primarySelectedSheet && handleUpdateSheetSkipRows(primarySelectedSheet.id, Math.max(0, (primarySelectedSheet.skipRowsCount || 0) - 1))}
                        disabled={(primarySelectedSheet?.skipRowsCount || 0) <= 0}
                        className="px-2.5 py-1 text-slate-700 hover:bg-amber-100 disabled:opacity-30 disabled:hover:bg-white font-bold transition-colors cursor-pointer"
                        title="Decrease skipped rows"
                      >
                        -
                      </button>

                      <span className="px-3 py-1 font-bold text-slate-900 min-w-[55px] text-center bg-amber-50/50">
                        {primarySelectedSheet?.skipRowsCount || 0} { (primarySelectedSheet?.skipRowsCount || 0) === 1 ? 'row' : 'rows' }
                      </span>

                      <button
                        onClick={() => primarySelectedSheet && handleUpdateSheetSkipRows(primarySelectedSheet.id, (primarySelectedSheet.skipRowsCount || 0) + 1)}
                        className="px-2.5 py-1 text-slate-700 hover:bg-amber-100 font-bold transition-colors cursor-pointer"
                        title="Increase skipped rows"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick Selection Pills */}
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => primarySelectedSheet && handleUpdateSheetSkipRows(primarySelectedSheet.id, num)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                            (primarySelectedSheet?.skipRowsCount || 0) === num
                              ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {num === 0 ? 'None (0)' : `${num} Rows`}
                        </button>
                      ))}
                    </div>

                    {/* Apply to All Sheets Button */}
                    {selectedSheets.length > 1 && (
                      <button
                        onClick={() => primarySelectedSheet && handleApplySkipRowsToAllSheets(primarySelectedSheet.skipRowsCount || 0)}
                        className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-900 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ml-1"
                        title="Apply this skip setting across all selected sheets"
                      >
                        <span className="material-symbols-outlined text-[13px]">done_all</span>
                        Apply to All {selectedSheets.length} Sheets
                      </button>
                    )}
                  </div>

                  {/* Info description */}
                  <div className="text-[11px] text-amber-900/90 flex items-center gap-1.5">
                    {(primarySelectedSheet?.skipRowsCount || 0) > 0 ? (
                      <span>
                        💡 Ignoring Row 1 to {primarySelectedSheet?.skipRowsCount} • Headers start at <strong>Row {(primarySelectedSheet?.skipRowsCount || 0) + 1}</strong>
                      </span>
                    ) : (
                      <span className="text-slate-500">Headers start at <strong>Row 1</strong> (No title rows skipped)</span>
                    )}
                  </div>
                </div>

                {/* Multi-Sheet Reference & Header Mode Bar */}
                <div className="bg-slate-100/70 border-b border-slate-200 px-5 py-2.5 text-xs text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500">Previewing columns from:</span>
                    {selectedSheets.length > 1 ? (
                      <select
                        value={previewSheetId}
                        onChange={(e) => handleSwitchPreviewSheet(e.target.value)}
                        className="bg-white border border-slate-300 font-bold rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer text-slate-800"
                      >
                        {selectedSheets.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.headers.length} cols, {s.recordsCount} rows)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <strong className="text-slate-900">{primarySelectedSheet?.name}</strong>
                    )}

                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">
                      Applied across <strong>{selectedSheets.length} sheet(s)</strong> ({totalSelectedRecords} rows)
                    </span>
                  </div>

                  {/* Header Row Switcher (if Excel file has no headers) */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px]">First row is header:</span>
                    <button
                      onClick={() => primarySelectedSheet && handleToggleSheetHeaderMode(primarySelectedSheet.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        primarySelectedSheet?.hasHeaderRow
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {primarySelectedSheet?.hasHeaderRow ? 'Yes (Named Headers)' : 'No (Use Default A, B, C...)'}
                    </button>
                  </div>
                </div>

                {/* Column Mapping Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                        <th className="py-3 px-4">Excel Header from File</th>
                        <th className="py-3 px-3">Row Sample Value</th>
                        <th className="py-3 px-3 text-center">Match Status</th>
                        <th className="py-3 px-4">Mapped Institutional Field (From Settings)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMappingRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400 font-mono">
                            No columns match your search filter.
                          </td>
                        </tr>
                      ) : (
                        filteredMappingRows.map((row) => {
                          const isIgnored = row.selectedField === 'Ignore';
                          const isMatched = !isIgnored && row.selectedField;

                          return (
                            <tr
                              key={row.id}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                isMatched
                                  ? 'border-l-4 border-l-primary bg-primary/[0.01]'
                                  : isIgnored
                                  ? 'border-l-4 border-l-slate-300 opacity-60'
                                  : 'border-l-4 border-l-amber-400'
                              }`}
                            >
                              {/* Excel Header */}
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px] text-slate-400">table_rows</span>
                                  <span>{row.excelHeader}</span>
                                </div>
                              </td>

                              {/* Sample Value */}
                              <td className="py-3.5 px-3 font-mono text-slate-600 truncate max-w-[150px]">
                                {row.sampleValue || '-'}
                              </td>

                              {/* Match Badge */}
                              <td className="py-3.5 px-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                    row.badge === '100% Match'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : row.badge === 'Resolved'
                                      ? 'bg-primary/10 text-primary border border-primary/20'
                                      : row.badge === 'Ignored'
                                      ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {row.badge}
                                </span>
                              </td>

                              {/* Dropdown with ONLY Settings Fields + Ignore */}
                              <td className="py-3.5 px-4">
                                <div className="relative max-w-xs">
                                  <select
                                    value={row.selectedField}
                                    onChange={(e) => handleFieldChange(row.id, e.target.value)}
                                    className={`w-full bg-white border rounded-xl py-2 pl-3 pr-8 text-xs font-bold shadow-2xs outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer ${
                                      isMatched
                                        ? 'border-primary/40 text-primary bg-primary/[0.02]'
                                        : isIgnored
                                        ? 'border-slate-200 text-slate-400'
                                        : 'border-amber-300 text-amber-900'
                                    }`}
                                  >
                                    <optgroup label="Configure Target Field">
                                      {dropdownOptions.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt === 'Ignore' ? '🚫 Ignore (Do Not Import)' : `🏛️ ${opt}`}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>
                                  <span className="material-symbols-outlined text-[16px] text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    unfold_more
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-mono">
                  <span className="text-slate-500">
                    Showing <strong>{mappingRows.length} total columns</strong> for {primarySelectedSheet?.name}
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="text-emerald-700 font-bold">
                      {mappingRows.filter((r) => r.selectedField !== 'Ignore').length} Mapped
                    </span>
                    <span>•</span>
                    <span className="text-slate-500">
                      {mappingRows.filter((r) => r.selectedField === 'Ignore').length} Ignored
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 4: VALIDATE FACULTY & COMPLIANCE PREVIEW */}
            {/* ========================================================================= */}
            {currentStep === 4 && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xs border border-slate-200 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
                      Validate Roster &amp; Calculated Pay
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      Preview of <strong>{currentParsedEmployees.length} staff records</strong> across <strong>{selectedSheets.length} sheet(s)</strong>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold font-mono flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      Safe Defaults Enforced
                    </span>
                  </div>
                </div>

                {/* Safe Financial Defaults Overview Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Default Salary State</span>
                    <strong className="text-xs font-bold text-slate-800">⚪ Unpaid / 🔴 Stopped</strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">0 or non-numeric base is Stopped</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Default Arrival Fee (0.05)</span>
                    <strong className="text-xs font-bold text-slate-800">0% (None by Default)</strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Decided later when paid</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Workforce &amp; Currency</span>
                    <strong className="text-xs font-bold text-slate-800">Auto-Detect ($ ➔ Foreign)</strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Salary with $ is Foreign, else Local IQD</span>
                  </div>
                </div>

                {/* Validation Records Table */}
                <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 text-center">ID</th>
                        <th className="py-2.5 px-3 text-left font-sans">Employee Name</th>
                        <th className="py-2.5 px-2 text-center">Sheet</th>
                        <th className="py-2.5 px-2 text-center">Workforce</th>
                        <th className="py-2.5 px-2 text-center">Base Salary</th>
                        <th className="py-2.5 px-2 text-center">Arrival Fee</th>
                        <th className="py-2.5 px-2 text-center">Search Fee</th>
                        <th className="py-2.5 px-2 text-center">Net Pay</th>
                        <th className="py-2.5 px-2 text-center">Salary State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentParsedEmployees.slice(0, 50).map((emp) => {
                        const isForeign = Boolean(emp.isForeign);
                        const currSymbol = isForeign ? '$' : 'IQD ';
                        const isPaid = emp.salaryState === 'Paid';
                        const isStopped = emp.salaryState === 'Stopped';

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-primary whitespace-nowrap">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                                {emp.id}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-left font-sans whitespace-nowrap">
                              <span className="font-bold text-slate-900 block">{emp.name}</span>
                              <span className="text-[10px] text-slate-400">{emp.email}</span>
                            </td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-700">
                                {emp.sourceSheetName}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isForeign ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-700'}`}>
                                {isForeign ? 'USD ($)' : 'Dinar'}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-900 whitespace-nowrap">
                              {currSymbol}{emp.baseSalary.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-500 whitespace-nowrap">
                              {emp.hasRecruitmentFee ? `${currSymbol}${(emp.recruitmentFee || 0).toLocaleString()} (0.05)` : '0%'}
                            </td>
                            <td className="py-2.5 px-2 text-center text-amber-700 font-bold whitespace-nowrap">
                              {(emp.searchingDocFee || 0) > 0 ? `-${currSymbol}${(emp.searchingDocFee || 0).toLocaleString()}` : '-'}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-primary whitespace-nowrap">
                              {currSymbol}{emp.netSalary.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPaid ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : isStopped ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-600'}`}>
                                {emp.salaryState}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 5: CONFIRM & BATCH INGEST */}
            {/* ========================================================================= */}
            {currentStep === 5 && (
              <div className="bg-white rounded-3xl p-8 shadow-2xs border border-slate-200 text-center space-y-6 max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md border border-emerald-200">
                  <span className="material-symbols-outlined text-[36px]">task_alt</span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {selectedSheets.every((s) => s.isImported)
                      ? `✅ Batch Ingestion Complete!`
                      : `Ingest ${currentParsedEmployees.length} Records from ${selectedSheets.length} Selected Sheet(s)`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    {selectedSheets.every((s) => s.isImported)
                      ? `All records from the selected paper sheets are now live in the active payroll ledger.`
                      : `Ready to commit ${currentParsedEmployees.length} records into the active payroll ledger across ${selectedSheets.length} sheet(s).`}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-xs font-mono text-slate-700 space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Sheets ({selectedSheets.length}):</span>
                    <strong className="text-primary font-bold">{selectedSheets.map((s) => s.name).join(', ')}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">File Name:</span>
                    <strong className="text-slate-900">{fileName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Staff Records:</span>
                    <strong className="text-emerald-700 font-bold">{currentParsedEmployees.length} Staff</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Default Salary State:</span>
                    <strong className="text-slate-800 font-bold">Unpaid / Not Yet (Disbursement Date Pending)</strong>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  {!selectedSheets.every((s) => s.isImported) ? (
                    <>
                      <button
                        onClick={handleBack}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Back
                      </button>

                      <button
                        onClick={handleNext}
                        className="px-6 py-2.5 rounded-xl bg-primary hover:opacity-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
                        Ingest {currentParsedEmployees.length} Records to Ledger
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleImportAnotherSheet}
                        className="px-5 py-2.5 rounded-xl bg-primary hover:opacity-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">tab</span>
                        📑 Import More Paper Sheets
                      </button>

                      <button
                        onClick={() => router.push('/employees')}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">groups</span>
                        👥 View Employees Roster
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Stepper Navigation Footer (For Steps 1-4) */}
            {currentStep < 5 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  Previous Step
                </button>

                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:opacity-95 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>{currentStep === 4 ? 'Proceed to Confirmation' : 'Continue'}</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* INLINE ADD FIELD MODAL (ONLY ONE PLACE TO ADD FIELDS DIRECTLY ON PAGE) */}
      {/* ========================================================================= */}
      {isAddFieldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">add_box</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add New Mapping Field</h3>
                  <p className="text-xs text-slate-500 font-mono">Registers instantly in system settings schema</p>
                </div>
              </div>

              <button
                onClick={() => setIsAddFieldModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleInlineAddFieldSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Field Label / Header Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g. Research Allowance, Hazard Pay"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Data Type
                </label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="Alphanumeric">Text / Alphanumeric (String)</option>
                  <option value="Currency">Financial Amount (Currency)</option>
                  <option value="Numeric">Numeric Count / Days (Number)</option>
                  <option value="Date">Date / Timestamp</option>
                  <option value="Status">Status / Flag</option>
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-[11px] text-slate-600 font-mono">
                💡 This field will immediately become available in all mapping dropdowns without leaving this step.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddFieldModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow-sm hover:opacity-95 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save &amp; Use Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
