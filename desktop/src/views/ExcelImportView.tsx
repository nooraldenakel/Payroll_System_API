import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { PayrollPeriod, ImportHistoryItem, FieldDataType, DynamicField } from '../types';
import { api, formatMoney } from '../services/api';

interface ExcelImportViewProps {
  periods: PayrollPeriod[];
  activePeriod: PayrollPeriod | null;
  importHistory: ImportHistoryItem[];
  dynamicFields?: DynamicField[];
  onCommitImport: (periodId: string, count: number) => Promise<void>;
  onNavigateTab?: (tab: any) => void;
  systemRate?: number;
}

interface SheetCard {
  id: string;
  name: string;
  arabicName?: string;
  recordCount: number;
  selected: boolean;
  headers: string[];
  rawRows: any[][];
}

interface ColumnMappingItem {
  id: string;
  excelHeader: string;
  targetField: string;
  dataType: FieldDataType;
  required: boolean;
  sampleValue: string;
  isMatched?: boolean;
}

export const ExcelImportView: React.FC<ExcelImportViewProps> = ({
  periods,
  activePeriod,
  importHistory,
  dynamicFields,
  onCommitImport,
  onNavigateTab,
  systemRate = 1310,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('Payroll_Workbook.xlsx');
  const [parsedWorkbook, setParsedWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedCountResult, setImportedCountResult] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Skip rows state (default 0 with auto-detection of institutional headers)
  const [skipRows, setSkipRows] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sheets state populated dynamically from real uploaded Excel file
  const [sheets, setSheets] = useState<SheetCard[]>([]);

  // Column Mappings with user-selectable data types
  const [mappings, setMappings] = useState<ColumnMappingItem[]>([]);
  const [mappingSheetFilter, setMappingSheetFilter] = useState<string>('ALL');
  const [columnSearchText, setColumnSearchText] = useState<string>('');
  const [isSheetDropdownOpen, setIsSheetDropdownOpen] = useState<boolean>(false);
  const [appliedFeedback, setAppliedFeedback] = useState<boolean>(false);

  // Add custom mapping modal / state
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [newMapHeader, setNewMapHeader] = useState('');
  const [newMapField, setNewMapField] = useState('bonus');
  const [newMapType, setNewMapType] = useState<FieldDataType>('Currency');
  const [newMapRequired, setNewMapRequired] = useState(false);
  const [customAddedFields, setCustomAddedFields] = useState<DynamicField[]>([]);

  // Dynamic system fields resolved from props or defaults (13 defaults matching screenshot)
  const activeFieldsList = React.useMemo(() => {
    const base = dynamicFields && dynamicFields.length > 0 ? dynamicFields : [
      { id: 'f-id', name: 'Employee ID', key: 'code', type: 'Alphanumeric' as FieldDataType, required: true, system: true, excelHeader: 'ت' },
      { id: 'f-name', name: 'Employee Name', key: 'name', type: 'Alphanumeric' as FieldDataType, required: true, system: true, excelHeader: 'الاسم' },
      { id: 'f-dept', name: 'Department', key: 'department', type: 'Alphanumeric' as FieldDataType, required: true, system: true, excelHeader: 'القسم' },
      { id: 'f-foreign', name: 'Foreign Staff (USD/IQD)', key: 'isForeign', type: 'Alphanumeric' as FieldDataType, required: false, system: false, excelHeader: 'اجنبي / محلي' },
      { id: 'f-base', name: 'Base Salary', key: 'baseSalary', type: 'Currency' as FieldDataType, required: true, system: true, excelHeader: 'الراتب' },
      { id: 'f-agency', name: 'Arrival Agency Fee (0.05)', key: 'arrivalFee', type: 'Alphanumeric' as FieldDataType, required: false, system: false, excelHeader: 'اجور الحضور (0.05)' },
      { id: 'f-bonus', name: 'Bonus', key: 'bonus', type: 'Currency' as FieldDataType, required: false, system: false, excelHeader: 'مخصصات' },
      { id: 'f-search', name: 'Search Fee', key: 'searchFee', type: 'Currency' as FieldDataType, required: false, system: false, excelHeader: 'بحث' },
      { id: 'f-ins', name: 'Insurance', key: 'insurance', type: 'Currency' as FieldDataType, required: false, system: false, excelHeader: 'ضمان' },
      { id: 'f-abs-days', name: 'Absence Days', key: 'absenceDays', type: 'Numeric' as FieldDataType, required: false, system: false, excelHeader: 'غياب' },
      { id: 'f-net', name: 'Net Salary', key: 'netSalary', type: 'Currency' as FieldDataType, required: true, system: true, excelHeader: 'صافي' },
      { id: 'f-state', name: 'Salary State', key: 'salaryState', type: 'Alphanumeric' as FieldDataType, required: false, system: false, excelHeader: 'الحالة' },
      { id: 'f-paid-date', name: 'Paid Date & Time', key: 'paidAt', type: 'Date' as FieldDataType, required: false, system: false, excelHeader: 'تاريخ الاستلام' },
    ];
    return [...base, ...customAddedFields];
  }, [dynamicFields, customAddedFields]);

  // Selected sheets subset
  const selectedSheets = sheets.filter((s) => s.selected);

  // Total records calculated dynamically from selected sheets
  const totalSelectedRecords = selectedSheets.reduce((acc, s) => acc + s.recordCount, 0);

  // Active sheet being previewed in Step 3
  const activePreviewSheet = React.useMemo(() => {
    return selectedSheets.find((s) => s.name === mappingSheetFilter) || selectedSheets[0] || null;
  }, [selectedSheets, mappingSheetFilter]);

  // Filter mappings to active sheet tab or all selected sheets + filter by columnSearchText
  const displayedMappings = React.useMemo(() => {
    let list = mappings;
    if (activePreviewSheet && mappingSheetFilter !== 'ALL') {
      const sheetHeadersSet = new Set(activePreviewSheet.headers.map((h) => h.trim()));
      list = mappings.filter((m) => sheetHeadersSet.has(m.excelHeader.trim()));
    }
    if (columnSearchText.trim()) {
      const q = columnSearchText.toLowerCase();
      list = list.filter(
        (m) =>
          m.excelHeader.toLowerCase().includes(q) ||
          m.targetField.toLowerCase().includes(q) ||
          (m.sampleValue && m.sampleValue.toLowerCase().includes(q))
      );
    }
    return list;
  }, [mappings, mappingSheetFilter, activePreviewSheet, columnSearchText]);

  // Intelligent column header matcher against active configured fields
  const matchTargetField = (
    header: string,
    fieldList: DynamicField[]
  ): { target: string; type: FieldDataType; required: boolean; isMatched: boolean } => {
    const h = header.trim();
    if (!h) return { target: 'IGNORE', type: 'Alphanumeric', required: false, isMatched: false };

    const norm = h.toLowerCase().replace(/[\s_\-()]/g, '');

    // 1. Direct match with configured fields in Settings (excelHeader, name, key)
    for (const f of fieldList) {
      const fHeader = (f.excelHeader || '').trim().toLowerCase().replace(/[\s_\-()]/g, '');
      const fName = (f.name || '').trim().toLowerCase().replace(/[\s_\-()]/g, '');
      const fKey = (f.key || '').trim().toLowerCase().replace(/[\s_\-()]/g, '');

      if (fHeader && (norm === fHeader || (norm.length >= 3 && fHeader.length >= 3 && (norm.includes(fHeader) || fHeader.includes(norm))))) {
        return { target: f.key, type: f.type, required: f.required, isMatched: true };
      }
      if (norm === fName || norm === fKey) {
        return { target: f.key, type: f.type, required: f.required, isMatched: true };
      }
    }

    // 2. Exact match rules for institutional Iraqi/Arabic headers
    if (norm === 'ت' || norm.includes('كود') || norm.includes('code') || norm.includes('empid')) {
      const f = fieldList.find((x) => x.key === 'code');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }
    if (norm.includes('اسم') || norm.includes('الموظف') || norm.includes('name')) {
      const f = fieldList.find((x) => x.key === 'name');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }
    if (norm.includes('راتب') || norm.includes('اسمي') || norm.includes('salary')) {
      const f = fieldList.find((x) => x.key === 'baseSalary');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }
    if (norm.includes('قسم') || norm.includes('كلية') || norm.includes('department') || norm.includes('dept')) {
      const f = fieldList.find((x) => x.key === 'department');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }
    if (norm.includes('مخصصات') || norm.includes('bonus') || norm.includes('allowance')) {
      const f = fieldList.find((x) => x.key === 'bonus');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }
    if (norm.includes('بحث') || norm.includes('search')) {
      const f = fieldList.find((x) => x.key === 'searchFee' || x.key === 'searchingDocFee');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }
    if (norm.includes('ضمان') || norm.includes('تقاعد') || norm.includes('insurance')) {
      const f = fieldList.find((x) => x.key === 'insurance');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }
    if (norm.includes('غياب') || norm.includes('absence')) {
      const f = fieldList.find((x) => x.key === 'absenceDays' || x.key === 'absence');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }
    if (norm.includes('صافي') || norm.includes('net')) {
      const f = fieldList.find((x) => x.key === 'netSalary');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }
    if (norm.includes('حالة') || norm.includes('صرف') || norm.includes('state')) {
      const f = fieldList.find((x) => x.key === 'salaryState');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }
    if (norm.includes('استلام') || norm.includes('تاريخ') || norm.includes('paid')) {
      const f = fieldList.find((x) => x.key === 'paidAt');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }
    if (norm.includes('حضور') || norm.includes('0.05') || norm.includes('arrival')) {
      const f = fieldList.find((x) => x.key === 'arrivalFee');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }
    if (norm.includes('اجنبي') || norm.includes('foreign')) {
      const f = fieldList.find((x) => x.key === 'isForeign');
      if (f) return { target: f.key, type: f.type, required: f.required, isMatched: true };
    }

    // Default to IGNORE (Not in Settings)
    return { target: 'IGNORE', type: 'Alphanumeric', required: false, isMatched: false };
  };

  // Builds mappings strictly and exclusively from the specified sheets (only user-selected sheets)
  const generateMappingsForSheets = (
    targetSheets: SheetCard[],
    activeFields: DynamicField[],
    existingMappings?: ColumnMappingItem[]
  ): ColumnMappingItem[] => {
    if (!targetSheets || targetSheets.length === 0) return [];

    const existingMap = new Map<string, ColumnMappingItem>();
    if (existingMappings) {
      existingMappings.forEach((m) => existingMap.set(m.excelHeader, m));
    }

    const newMappings: ColumnMappingItem[] = [];
    const seenHeaders = new Set<string>();
    let mapIdx = 1;

    for (const sheet of targetSheets) {
      sheet.headers.forEach((headerName, colIndex) => {
        const cleanHeader = (headerName || '').trim();
        if (!cleanHeader || seenHeaders.has(cleanHeader)) return;
        seenHeaders.add(cleanHeader);

        // Find sample value from the sheet's first non-empty data row
        let sample = '-';
        for (let r = 0; r < Math.min(10, sheet.rawRows.length); r++) {
          const row = sheet.rawRows[r];
          if (row && row[colIndex] !== undefined && String(row[colIndex]).trim() !== '') {
            sample = String(row[colIndex]).trim();
            break;
          }
        }

        const prev = existingMap.get(cleanHeader);
        if (prev) {
          newMappings.push({
            ...prev,
            id: `map-${mapIdx++}`,
            sampleValue: sample !== '-' ? sample : prev.sampleValue,
          });
        } else {
          const match = matchTargetField(cleanHeader, activeFields);
          newMappings.push({
            id: `map-${mapIdx++}`,
            excelHeader: cleanHeader,
            targetField: match.target,
            dataType: match.type,
            required: match.required,
            sampleValue: sample,
            isMatched: match.isMatched,
          });
        }
      });
    }

    return newMappings;
  };

  // Helper to detect repeated sub-headers and totals across sheets
  const isIgnoredName = (name: string): boolean => {
    const norm = (name || '').trim().toLowerCase().replace(/[\s_\-()]/g, '');
    if (!norm) return true;
    const ignored = [
      'الاسم', 'الاسمالرباعي', 'الاسمالثلاثي', 'اسمالموظف', 'الاسمالكامل',
      'الاسمالتدريسي', 'اسمالتدريسي', 'الاسماء', 'اسماءالموظفين', 'اسمالمنتسب',
      'المجموع', 'المجموعالكلي', 'الاجمالي', 'الاجماليكلي', 'اجمالي', 'اجماليلرواتب', 'اجماليرواتب',
      'total', 'grandtotal', 'sum', 'name', 'fullname', 'employeename', 'staffname',
      'ت', 'تسلسل', 'الرقم'
    ];
    if (ignored.includes(norm)) return true;
    if (norm.includes('المجموع') || norm.includes('الاجمالي') || norm.includes('اجمالي')) return true;
    if (norm === 'الاسم' || norm.startsWith('الاسمالتدريسي') || norm.startsWith('اسمالموظف')) return true;
    return false;
  };

  // Parses any workbook array buffer into real dynamic sheets and column mappings
  const processWorkbook = (wb: XLSX.WorkBook, fileName: string, skipCount: number = skipRows) => {
    setParsedWorkbook(wb);
    setSelectedFileName(fileName);
    setErrorMessage(null);

    const sheetCards: SheetCard[] = [];

    for (let i = 0; i < wb.SheetNames.length; i++) {
      const sheetName = wb.SheetNames[i];
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;

      const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rawData.length === 0) continue;

      // Header row index: auto-detect best header row if skipCount is 0, or use user's explicit skipCount
      let headerIdx = Math.min(Math.max(0, skipCount), Math.max(0, rawData.length - 1));
      if (skipCount === 0) {
        const candidateKeywords = ['الاسم', 'اسم', 'الراتب', 'راتب', 'صافي', 'ت', 'مخصصات', 'name', 'salary', 'code'];
        let bestScore = -1;
        let bestIdx = 0;
        for (let r = 0; r < Math.min(6, rawData.length); r++) {
          const rRow = rawData[r] || [];
          let score = 0;
          for (const cell of rRow) {
            const str = String(cell || '').trim().toLowerCase();
            if (candidateKeywords.some((k) => str.includes(k))) score++;
          }
          if (score > bestScore) {
            bestScore = score;
            bestIdx = r;
          }
        }
        if (bestScore > 0) {
          headerIdx = bestIdx;
        }
      }

      const headerRow = rawData[headerIdx] || [];
      const detectedHeaders = headerRow.map((c, colIndex) => {
        const val = String(c || '').trim();
        return val || `Column ${String.fromCharCode(65 + (colIndex % 26))}${colIndex >= 26 ? Math.floor(colIndex / 26) : ''}`;
      });

      const dataRows = rawData.slice(headerIdx + 1).filter((r) => {
        if (!r || !r.some((c) => String(c || '').trim() !== '')) return false;
        const candidate = String(r[1] !== undefined && String(r[1]).trim() !== '' ? r[1] : r[0] || '').trim();
        return !isIgnoredName(candidate);
      });

      sheetCards.push({
        id: `sheet-${i}-${sheetName}`,
        name: sheetName,
        arabicName: sheetName,
        recordCount: dataRows.length,
        selected: true,
        headers: detectedHeaders,
        rawRows: dataRows,
      });
    }

    if (sheetCards.length === 0) {
      setErrorMessage('The uploaded workbook does not contain any readable data sheets.');
      return;
    }

    setSheets(sheetCards);

    // Initial mappings based on selected sheets
    const newMappings = generateMappingsForSheets(
      sheetCards.filter((s) => s.selected),
      activeFieldsList
    );
    setMappings(newMappings);
  };

  const handleUpdateSkipRows = (newSkip: number) => {
    const val = Math.max(0, Math.min(10, newSkip));
    setSkipRows(val);

    if (parsedWorkbook) {
      // Re-read sheets with the new skip count while preserving user's sheet selection state
      const updatedSheets = sheets.map((s) => {
        const ws = parsedWorkbook.Sheets[s.name];
        if (!ws) return s;
        const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (rawData.length === 0) return s;

        const headerIdx = Math.min(Math.max(0, val), Math.max(0, rawData.length - 1));
        const headerRow = rawData[headerIdx] || [];
        const detectedHeaders = headerRow.map((c, colIndex) => {
          const v = String(c || '').trim();
          return v || `Column ${String.fromCharCode(65 + (colIndex % 26))}${colIndex >= 26 ? Math.floor(colIndex / 26) : ''}`;
        });

        const dataRows = rawData.slice(headerIdx + 1).filter((r) => {
          if (!r || !r.some((c) => String(c || '').trim() !== '')) return false;
          const candidate = String(r[1] !== undefined && String(r[1]).trim() !== '' ? r[1] : r[0] || '').trim();
          return !isIgnoredName(candidate);
        });

        return {
          ...s,
          headers: detectedHeaders,
          rawRows: dataRows,
          recordCount: dataRows.length,
        };
      });

      setSheets(updatedSheets);

      // Re-generate mappings strictly for the currently selected sheets
      const selected = updatedSheets.filter((s) => s.selected);
      const newMaps = generateMappingsForSheets(selected, activeFieldsList, mappings);
      setMappings(newMaps);
    }
  };

  // Called when user clicks "Continue to Column Mapping" or selects Step 3
  const handleProceedToMapping = () => {
    const selected = sheets.filter((s) => s.selected);
    if (selected.length === 0) {
      setErrorMessage('Please select at least one paper sheet before proceeding to column mapping.');
      return;
    }
    const newMaps = generateMappingsForSheets(selected, activeFieldsList, mappings);
    setMappings(newMaps);
    setMappingSheetFilter(selected[0]?.name || 'ALL');
    setColumnSearchText('');
    setCurrentStep(3);
  };

  // Re-match columns using intelligent auto-matching
  const handleRematch = () => {
    const selected = sheets.filter((s) => s.selected);
    const reMatched = generateMappingsForSheets(selected, activeFieldsList);
    setMappings(reMatched);
  };

  // Apply skip rows and mappings across all selected sheets
  const handleApplyToAllSheets = () => {
    setAppliedFeedback(true);
    setTimeout(() => setAppliedFeedback(false), 2500);
    const selected = sheets.filter((s) => s.selected);
    const synched = generateMappingsForSheets(selected, activeFieldsList, mappings);
    setMappings(synched);
  };

  // Add custom field to mapping from Add Field Modal
  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapHeader.trim()) return;

    const customKey = `custom_${Date.now()}`;
    const newField: DynamicField = {
      id: `f-${customKey}`,
      name: newMapHeader.trim(),
      key: customKey,
      type: newMapType,
      required: false,
      system: false,
      excelHeader: newMapHeader.trim(),
    };

    setCustomAddedFields((prev) => [...prev, newField]);

    // If there is an active preview sheet with unmapped column matching this name or add a new mapping
    const existingIndex = mappings.findIndex((m) => m.excelHeader.toLowerCase() === newMapHeader.trim().toLowerCase());
    if (existingIndex >= 0) {
      setMappings((prev) =>
        prev.map((m, i) => (i === existingIndex ? { ...m, targetField: customKey, isMatched: true } : m))
      );
    }

    setNewMapHeader('');
    setShowAddMapping(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMessage(null);

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const buffer = evt.target?.result;
          if (buffer) {
            const wb = XLSX.read(buffer, { type: 'array' });
            processWorkbook(wb, file.name, skipRows);
          }
        } catch (err: any) {
          setErrorMessage(`Failed to parse Excel workbook: ${err.message || 'Corrupted file'}`);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };



  const handleToggleSelectAllSheets = (selected: boolean) => {
    setSheets((prev) => prev.map((s) => ({ ...s, selected })));
  };

  const handleRemoveMapping = (id: string) => {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateMappingType = (id: string, newType: FieldDataType) => {
    setMappings((prev) => prev.map((m) => (m.id === id ? { ...m, dataType: newType } : m)));
  };

  const handleUpdateMappingTarget = (id: string, newTarget: string) => {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const matchedField = activeFieldsList.find((f) => f.key === newTarget);
          return {
            ...m,
            targetField: newTarget,
            dataType: matchedField?.type || m.dataType,
            required: matchedField?.required ?? false,
            isMatched: newTarget !== 'IGNORE',
          };
        }
        return m;
      })
    );
  };

  // Build live preview records from selected sheets for Step 4
  // Build live preview records from selected sheets for Step 4 matching Pic 1
  const getPreviewRecords = () => {
    const selected = sheets.filter((s) => s.selected);
    const previewList: any[] = [];

    for (const sheet of selected) {
      const nameIndex = sheet.headers.findIndex((h) => {
        const m = mappings.find((item) => item.excelHeader === h);
        return m?.targetField === 'name';
      });

      const salaryIndex = sheet.headers.findIndex((h) => {
        const m = mappings.find((item) => item.excelHeader === h);
        return m?.targetField === 'baseSalary';
      });

      const searchIndex = sheet.headers.findIndex((h) => {
        const m = mappings.find((item) => item.excelHeader === h);
        return m?.targetField === 'searchFee';
      });

      const bonusIndex = sheet.headers.findIndex((h) => {
        const m = mappings.find((item) => item.excelHeader === h);
        return m?.targetField === 'bonus';
      });

      const insIndex = sheet.headers.findIndex((h) => {
        const m = mappings.find((item) => item.excelHeader === h);
        return m?.targetField === 'insurance';
      });

      const foreignIndex = sheet.headers.findIndex((h) => {
        const m = mappings.find((item) => item.excelHeader === h);
        return m?.targetField === 'isForeign';
      });

      const absDaysIndex = sheet.headers.findIndex((h) => {
        const m = mappings.find((item) => item.excelHeader === h);
        return m?.targetField === 'absenceDays' || m?.targetField === 'absence';
      });

      for (let i = 0; i < sheet.rawRows.length; i++) {
        const row = sheet.rawRows[i];
        if (!row || !row.some((c) => String(c || '').trim() !== '')) continue;

        const nameVal = nameIndex >= 0 ? String(row[nameIndex] || '').trim() : `Staff Member ${previewList.length + 1}`;
        if (!nameVal || isIgnoredName(nameVal)) continue;

        const rawSalaryStr = salaryIndex >= 0 ? String(row[salaryIndex] || '').trim() : '';
        const hasDollar = rawSalaryStr.includes('$');
        const rawForeignStr = foreignIndex >= 0 ? String(row[foreignIndex] || '').toLowerCase() : '';
        const isForeign = hasDollar || rawForeignStr.includes('true') || rawForeignStr.includes('yes') || rawForeignStr.includes('اجنبي');

        let rawSalaryNum = Number(rawSalaryStr.replace(/[^0-9.]/g, '')) || 1200000;
        // User rule: all baseSalary that don't have dollar sign less then 100,000 should mul it with 1,000
        if (!hasDollar && !isForeign && rawSalaryNum > 0 && rawSalaryNum < 100000) {
          rawSalaryNum *= 1000;
        }

        const rawSearchStr = searchIndex >= 0 ? String(row[searchIndex] || '').trim() : '';
        let searchVal = Number(rawSearchStr.replace(/[^0-9.]/g, '')) || 0;
        if (!isForeign && searchVal > 0 && searchVal < 1000) {
          searchVal *= 1000;
        }

        const rawBonusStr = bonusIndex >= 0 ? String(row[bonusIndex] || '').trim() : '';
        let bonusVal = Number(rawBonusStr.replace(/[^0-9.]/g, '')) || 0;
        if (!isForeign && bonusVal > 0 && bonusVal < 1000) {
          bonusVal *= 1000;
        }

        const rawInsStr = insIndex >= 0 ? String(row[insIndex] || '').trim() : '';
        let insVal = Number(rawInsStr.replace(/[^0-9.]/g, '')) || 0;
        if (!isForeign && insVal > 0 && insVal < 1000) {
          insVal *= 1000;
        }

        const rawAbsStr = absDaysIndex >= 0 ? String(row[absDaysIndex] || '').trim() : '';
        const absDaysVal = Number(rawAbsStr.replace(/[^0-9.]/g, '')) || 0;
        const absenceCostVal = absDaysVal > 0
          ? Math.round((rawSalaryNum / 30.0 * absDaysVal) * 100.0) / 100.0
          : 0;

        const rate = systemRate || activePeriod?.exchangeRate || 1310;
        let searchUsd = 0;
        let searchIqd = 0;
        if (searchVal > 0) {
          if (isForeign) {
            if (searchVal >= 500) {
              searchIqd = searchVal;
              searchUsd = Math.round((searchVal / rate) * 100.0) / 100.0;
            } else {
              searchUsd = searchVal;
              searchIqd = Math.round(searchVal * rate);
            }
          } else {
            searchIqd = searchVal;
            searchUsd = searchVal;
          }
        }

        let insUsd = 0;
        let insIqd = 0;
        if (insVal > 0) {
          if (isForeign) {
            if (insVal >= 500) {
              insIqd = insVal;
              insUsd = Math.round((insVal / rate) * 100.0) / 100.0;
            } else {
              insUsd = insVal;
              insIqd = Math.round(insVal * rate);
            }
          } else {
            insIqd = insVal;
            insUsd = insVal;
          }
        }

        // Arrival fee rule: ONLY enabled if Base Salary has "$" dollar sign
        const arrivalVal = hasDollar ? Math.round(rawSalaryNum * 0.05 * 100.0) / 100.0 : 0;
        const netPay = isForeign
          ? Math.max(0, Math.round((rawSalaryNum + bonusVal - searchUsd - insUsd - arrivalVal - absenceCostVal) * 100.0) / 100.0)
          : Math.max(0, Math.round(rawSalaryNum + bonusVal - searchVal - insVal - arrivalVal - absenceCostVal));

        const cleanSheetName = sheet.name.replace(/\s+/g, '_');
        const code = `EMP-${String(i + 1).padStart(3, '0')}-${cleanSheetName}`;

        previewList.push({
          id: code,
          employeeCode: code,
          name: nameVal,
          email: `${nameVal.replace(/\s+/g, '.').toLowerCase()}@institution.gov`,
          sheet: sheet.name,
          workforce: isForeign ? 'USD' : 'Dinar',
          currency: isForeign ? 'USD' : 'IQD',
          isForeign,
          baseSalary: rawSalaryNum,
          arrivalFee: arrivalVal,
          absenceDays: absDaysVal,
          absence: absenceCostVal,
          searchFee: isForeign ? searchUsd : searchVal,
          searchFeeIqd: isForeign ? searchIqd : undefined,
          insurance: isForeign ? insUsd : insVal,
          insuranceIqd: isForeign ? insIqd : undefined,
          netPay,
          salaryState: 'Not Yet',
        });
      }
    }

    return previewList;
  };

  // Execute ingestion directly via Backend API
  const handleExecuteIngest = async () => {
    if (!activePeriod) {
      setErrorMessage('No active payroll period selected. Please select an active period first.');
      return;
    }

    const selectedSheets = sheets.filter((s) => s.selected);
    if (selectedSheets.length === 0) {
      setErrorMessage('Please select at least one sheet to import.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let fileToUpload: Blob;
      let uploadName = selectedFileName;

      // If we have a parsed workbook and only a subset of sheets are selected, export a clean workbook with only selected sheets
      if (parsedWorkbook && selectedSheets.length < parsedWorkbook.SheetNames.length) {
        const filteredWb = XLSX.utils.book_new();
        for (const sheet of selectedSheets) {
          const originalWs = parsedWorkbook.Sheets[sheet.name];
          if (originalWs) {
            XLSX.utils.book_append_sheet(filteredWb, originalWs, sheet.name);
          }
        }
        const wbout = XLSX.write(filteredWb, { bookType: 'xlsx', type: 'array' });
        fileToUpload = new Blob([wbout], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        uploadName = `Filtered_${selectedFileName}`;
      } else if (selectedFile) {
        fileToUpload = selectedFile;
      } else if (parsedWorkbook) {
        const wbout = XLSX.write(parsedWorkbook, { bookType: 'xlsx', type: 'array' });
        fileToUpload = new Blob([wbout], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      } else {
        throw new Error('No valid workbook data to ingest.');
      }

      // Upload directly to Ktor Backend: POST /api/employees/upload-excel?periodId=...
      const result = await api.uploadExcelFile(fileToUpload, activePeriod.id, uploadName);

      const count = result.importedCount || totalSelectedRecords;
      setImportedCountResult(count);

      // Notify App.tsx to reload real employees, period totals, reports, and audit logs
      await onCommitImport(activePeriod.id, count);

      setImportSuccess(true);
      setCurrentStep(5);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to ingest workbook into backend database.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#f8fafc] text-slate-800 animate-fade-in">
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs">
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-2xs">
                  <span className="material-symbols-outlined text-[26px]">upload_file</span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                    Direct Multi-Sheet Excel Ingestion
                  </h1>
                  <p className="text-xs md:text-sm text-slate-500 font-medium">
                    Parse and ingest institutional workbooks with multiple faculty sheets directly into the ledger.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-mono text-blue-800 flex items-center gap-2 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Target Cycle: <strong className="text-slate-900">{activePeriod?.name || activePeriod?.code || 'No Active Cycle'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* PERIOD GUARD: Show dedicated message when no period exists */}
        {(!activePeriod || periods.length === 0) ? (
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1627] to-slate-900 border border-slate-800 p-8 md:p-12 shadow-2xl text-center space-y-6 animate-fade-in max-w-2xl mx-auto my-8">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-950/40">
              <span className="material-symbols-outlined text-[44px]">event_busy</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                There is no period right now, create one
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Before uploading and ingesting institutional Excel rosters, you must establish an active payroll period. Click below to create your period, then continue importing the excel.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab?.('periods')}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center gap-3 mx-auto cursor-pointer transition-all hover:scale-105 active:scale-95 border border-emerald-400/40"
              >
                <span className="material-symbols-outlined text-[22px]">calendar_add_on</span>
                <span>Go to Payroll Periods</span>
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* Stepper Header Shape matching Pic 1 */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between overflow-x-auto gap-2">
          {[
            { num: 1, label: 'Upload Workbook' },
            { num: 2, label: 'Choose Paper Sheets' },
            { num: 3, label: 'Map Columns' },
            { num: 4, label: 'Validate Faculty' },
            { num: 5, label: 'Confirm & Ingest' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num === 3 && sheets.length > 0) handleProceedToMapping();
                else if (s.num < currentStep) setCurrentStep(s.num);
                else if (s.num === 2 && sheets.length > 0) setCurrentStep(2);
                else if (s.num === 4 && sheets.length > 0) setCurrentStep(4);
              }}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                currentStep === s.num
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40'
                  : currentStep > s.num
                  ? 'bg-slate-800/60 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono ${
                  currentStep === s.num
                    ? 'bg-white text-slate-950'
                    : currentStep > s.num
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {currentStep > s.num ? '✓' : s.num}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3 animate-fade-in shadow-lg shadow-rose-950/30">
            <span className="material-symbols-outlined text-rose-400 text-[22px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: FILE SELECTION */}
        {currentStep === 1 && (
          <div className="rounded-3xl bg-[#0f172a]/90 border border-slate-800 p-6 md:p-8 shadow-xl space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Select Ingestion Source</h3>
              <p className="text-xs text-slate-400">
                Upload your institutional .xlsx, .xls, or .csv workbook directly into SQLite.
              </p>
            </div>

            {/* Custom File Upload Dropzone (Full Width & Clean) */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-cyan-500 bg-cyan-950/20'
                  : 'border-slate-700 hover:border-cyan-500/60 bg-slate-900/40 hover:bg-slate-900/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-18 h-18 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 shadow-lg shadow-cyan-950/40">
                <span className="material-symbols-outlined text-[40px]">
                  {selectedFile ? 'file_present' : 'cloud_upload'}
                </span>
              </div>

              <h4 className="text-base font-bold text-white mb-1.5">
                {selectedFile ? selectedFile.name : 'Upload Institutional Excel / CSV Workbook'}
              </h4>
              <p className="text-xs text-slate-400 mb-5 max-w-md">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB • ${sheets.length} sheets detected`
                  : 'Drag & drop your multi-sheet faculty workbook here, or click to browse local storage (.xlsx, .xls, .csv)'}
              </p>

              <span className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 shadow-md">
                {selectedFile ? 'Change Selected File' : 'Browse Local Disk'}
              </span>
            </div>

            {sheets.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{sheets.length} Sheets successfully read from file</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <span>Select Sheets ({sheets.length})</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: REAL PAPER / FACULTY SHEETS SELECTION */}
        {currentStep === 2 && (
          <div className="rounded-3xl bg-[#0f172a]/90 border border-slate-800 p-6 md:p-8 shadow-xl space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400 text-[22px]">table_chart</span>
                  Workbook Sheet Selection ({sheets.length} Detected)
                </h3>
                <p className="text-xs text-slate-400">
                  Select which sheets / faculty rosters from <strong className="text-white">{selectedFileName}</strong> to enroll into active cycle <strong className="text-cyan-300">{activePeriod?.name || activePeriod?.code}</strong>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAllSheets(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSelectAllSheets(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sheets.map((sheet) => (
                <div
                  key={sheet.id}
                  onClick={() =>
                    setSheets((prev) =>
                      prev.map((s) => (s.id === sheet.id ? { ...s, selected: !s.selected } : s))
                    )
                  }
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    sheet.selected
                      ? 'bg-cyan-950/30 border-cyan-500/50 text-white shadow-md shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden pr-2">
                    <div className="text-sm font-bold truncate text-white">{sheet.name}</div>
                    <div className="text-xs text-slate-400 font-mono">
                      {sheet.headers.length} Columns detected
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 text-[11px] font-mono text-emerald-400 border border-slate-700">
                      ~{sheet.recordCount} staff
                    </span>
                    <input
                      type="checkbox"
                      checked={sheet.selected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
              <div className="font-mono text-slate-300">
                Selected: <strong className="text-emerald-400">{selectedSheets.length}</strong> of {sheets.length} sheets • Total Records: <strong className="text-cyan-300">{totalSelectedRecords}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={selectedSheets.length === 0}
                onClick={handleProceedToMapping}
                className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition-all disabled:opacity-40"
              >
                Continue to Column Mapping →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MAPPING COLUMNS (Matching User Uploaded Pic) */}
        {currentStep === 3 && (
          <div className="rounded-3xl bg-white text-slate-800 border border-slate-200 p-6 md:p-8 shadow-xl space-y-5 animate-fade-in">
            {/* Top Header Card: Red/Pink Icon, Title, Batch Mode Pill, Subtitle, + Add Field, Re-Match, Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[24px]">domain</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                      Column Mapping: {selectedSheets.length} Paper Sheet{selectedSheets.length !== 1 ? 's' : ''} Selected
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-mono font-bold text-[10px]">
                      Batch Mode
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-500">
                    Comparing Excel columns with {activeFieldsList.length} Available Settings Field(s)
                  </p>
                </div>
              </div>

              {/* Right Side Actions: + Add Field, Re-Match, Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowAddMapping(true)}
                  className="px-3.5 py-2 bg-[#0f4a47] hover:bg-[#0b3836] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>Add Field</span>
                </button>

                <button
                  type="button"
                  onClick={handleRematch}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                >
                  Re-Match
                </button>

                <div className="relative">
                  <input
                    type="text"
                    value={columnSearchText}
                    onChange={(e) => setColumnSearchText(e.target.value)}
                    placeholder="Filter column..."
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 shadow-2xs outline-none w-36 md:w-44 focus:border-teal-600 transition-all"
                  />
                  {columnSearchText && (
                    <button
                      type="button"
                      onClick={() => setColumnSearchText('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SKIP TOP TITLE ROWS BANNER (Yellow/Amber background matching picture) */}
            <div className="p-3.5 rounded-2xl bg-[#fffbeb] border border-amber-200/90 space-y-2.5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                    <span className="material-symbols-outlined text-amber-800 text-[18px]">arrow_upward</span>
                    <span>Skip Top Title Rows:</span>
                  </div>

                  {/* Stepper */}
                  <div className="flex items-center gap-2 border border-amber-300 bg-white rounded-full px-2.5 py-0.5 font-mono text-xs font-bold text-amber-900 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleUpdateSkipRows(skipRows - 1)}
                      className="text-amber-800 hover:text-amber-950 font-bold px-1 cursor-pointer transition-all"
                      title="Decrease"
                    >
                      -
                    </button>
                    <span>{skipRows} rows</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSkipRows(skipRows + 1)}
                      className="text-amber-800 hover:text-amber-950 font-bold px-1 cursor-pointer transition-all"
                      title="Increase"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: 'None (0)', val: 0 },
                      { label: '1 Rows', val: 1 },
                      { label: '2 Rows', val: 2 },
                      { label: '3 Rows', val: 3 },
                      { label: '4 Rows', val: 4 },
                      { label: '5 Rows', val: 5 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => handleUpdateSkipRows(p.val)}
                        className={`px-3 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          skipRows === p.val
                            ? 'bg-amber-700 text-white shadow-xs'
                            : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100/50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-600 self-start md:self-auto">
                  {skipRows === 0
                    ? 'Headers start at Row 1 (No title rows skipped)'
                    : `Headers start at Row ${skipRows + 1} (${skipRows} title rows skipped)`}
                </div>
              </div>

              {/* Apply to All Sheets Button */}
              <div>
                <button
                  type="button"
                  onClick={handleApplyToAllSheets}
                  className="px-3 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-800">done_all</span>
                  <span>
                    {appliedFeedback
                      ? `Applied to All ${selectedSheets.length} Sheets!`
                      : `Apply to All ${selectedSheets.length} Sheets`}
                  </span>
                </button>
              </div>
            </div>

            {/* SUB-BAR: Previewing columns from dropdown, Applied across, and First row is header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 text-xs font-mono gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-500">Previewing columns from:</span>

                {/* Custom Sheet Dropdown matching User Uploaded Pic */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSheetDropdownOpen(!isSheetDropdownOpen)}
                    className="bg-white border border-teal-600 text-slate-900 font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-2 cursor-pointer hover:bg-teal-50/40 transition-all"
                  >
                    <span>
                      {activePreviewSheet
                        ? `${activePreviewSheet.name} (${activePreviewSheet.headers.length} cols, ${activePreviewSheet.recordCount} rows)`
                        : 'Select Sheet'}
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-teal-700">expand_more</span>
                  </button>

                  {/* Dropdown Menu when clicked */}
                  {isSheetDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 z-40 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[320px] animate-scale-in">
                      {selectedSheets.map((s) => {
                        const isSelected = activePreviewSheet?.id === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setMappingSheetFilter(s.name);
                              setIsSheetDropdownOpen(false);
                            }}
                            className={`px-3.5 py-2 text-xs font-mono cursor-pointer transition-colors flex items-center justify-between ${
                              isSelected
                                ? 'bg-blue-600 text-white font-bold'
                                : 'bg-white hover:bg-slate-100 text-slate-800 border-t border-slate-100'
                            }`}
                          >
                            <span>{s.name} ({s.headers.length} cols, {s.recordCount} rows)</span>
                            {isSelected && <span className="material-symbols-outlined text-[15px]">check</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <span className="text-slate-500">
                  • Applied across {selectedSheets.length} sheet(s) ({totalSelectedRecords} rows)
                </span>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-slate-500">First row is header:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                  Yes (Named Headers)
                </span>
              </div>
            </div>

            {/* TABLE: EXCEL HEADER FROM FILE | MATCH STATUS | MAPPED INSTITUTIONAL FIELD */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">EXCEL HEADER FROM FILE</th>
                    <th className="py-3.5 px-4 text-center">MATCH STATUS</th>
                    <th className="py-3.5 px-4">MAPPED INSTITUTIONAL FIELD (FROM SETTINGS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayedMappings.map((m) => {
                    const isMatched = m.targetField && m.targetField !== 'IGNORE';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* EXCEL HEADER FROM FILE */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">
                              article
                            </span>
                            <div>
                              <div className="font-bold text-slate-800 font-mono text-xs">
                                {m.excelHeader}
                              </div>
                              {m.sampleValue && m.sampleValue !== '-' && (
                                <div className="text-[10.5px] font-mono text-slate-400 truncate max-w-xs">
                                  Sample: {m.sampleValue}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* MATCH STATUS */}
                        <td className="py-3 px-4 text-center">
                          {isMatched ? (
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-mono font-bold text-emerald-700 border border-emerald-200 bg-emerald-50">
                              100% Match
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-mono font-bold text-amber-700 border border-amber-200 bg-amber-50">
                              Not in Settings
                            </span>
                          )}
                        </td>

                        {/* MAPPED INSTITUTIONAL FIELD (FROM SETTINGS) */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 max-w-md">
                            <div className="relative flex-1">
                              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                                {isMatched ? 'account_balance' : 'block'}
                              </span>

                              <select
                                value={m.targetField}
                                onChange={(e) => handleUpdateMappingTarget(m.id, e.target.value)}
                                className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-bold outline-none cursor-pointer border transition-all appearance-none ${
                                  isMatched
                                    ? 'bg-white text-slate-800 border-slate-200 hover:border-teal-500 focus:border-teal-500 shadow-2xs'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <optgroup label="Configure Target Field">
                                  {activeFieldsList.map((f) => (
                                    <option key={f.key} value={f.key}>
                                      🏛️ {f.name}
                                    </option>
                                  ))}
                                </optgroup>
                                <option value="IGNORE">🚫 Ignore (Do Not Import)</option>
                              </select>

                              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                                unfold_more
                              </span>
                            </div>

                            {/* Direct Ignore / Clear Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (m.targetField === 'IGNORE') {
                                  const autoMatch = activeFieldsList.find(
                                    (f) =>
                                      f.name.toLowerCase() === m.excelHeader.toLowerCase() ||
                                      f.key.toLowerCase() === m.excelHeader.toLowerCase() ||
                                      (f.excelHeader && f.excelHeader.toLowerCase() === m.excelHeader.toLowerCase())
                                  );
                                  handleUpdateMappingTarget(m.id, autoMatch ? autoMatch.key : '');
                                } else {
                                  handleUpdateMappingTarget(m.id, 'IGNORE');
                                }
                              }}
                              title={m.targetField === 'IGNORE' ? 'Ignored (Click to re-enable mapping)' : 'Directly ignore this column'}
                              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                m.targetField === 'IGNORE'
                                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                  : 'bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 border-slate-200 hover:border-rose-200'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {m.targetField === 'IGNORE' ? 'block' : 'cancel'}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Summary & Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 font-mono pt-1 gap-2 border-t border-slate-100">
              <div>
                Showing {displayedMappings.length} columns for{' '}
                <strong className="text-slate-800 font-bold">
                  {activePreviewSheet?.name || 'Selected Sheet'}
                </strong>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-700 font-bold">
                  {displayedMappings.filter((m) => m.targetField && m.targetField !== 'IGNORE').length} Mapped
                </span>
                <span>•</span>
                <span className="text-slate-500 font-bold">
                  {displayedMappings.filter((m) => !m.targetField || m.targetField === 'IGNORE').length} Ignored
                </span>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>Previous Step</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-xl bg-[#0f4a47] hover:bg-[#0b3836] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-[0.98]"
              >
                <span>Continue to Step 4: Validate Roster</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>

            {/* Add Custom Field Modal */}
            {showAddMapping && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
                <div
                  className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 animate-scale-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <span className="material-symbols-outlined text-teal-700 text-[20px]">add_circle</span>
                      <span>Add Custom Field to Mapping</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddMapping(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>

                  <form onSubmit={handleAddCustomField} className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Field / Header Name</label>
                      <input
                        type="text"
                        required
                        value={newMapHeader}
                        onChange={(e) => setNewMapHeader(e.target.value)}
                        placeholder="e.g. Research Assistance or مخصصات بحثية"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs outline-none focus:border-teal-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Data Type</label>
                      <select
                        value={newMapType}
                        onChange={(e) => setNewMapType(e.target.value as FieldDataType)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs outline-none focus:border-teal-600 bg-white"
                      >
                        <option value="Currency">Currency (IQD / USD)</option>
                        <option value="Alphanumeric">Alphanumeric (Text)</option>
                        <option value="Numeric">Numeric (Quantity / Days)</option>
                        <option value="Date">Date</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddMapping(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#0f4a47] hover:bg-[#0b3836] text-white font-bold cursor-pointer shadow-xs"
                      >
                        Add & Map
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: VALIDATE FACULTY (Matching Pic 1) */}
        {currentStep === 4 && (
          <div className="rounded-3xl bg-white text-slate-800 border border-slate-200 p-6 md:p-8 shadow-xl space-y-6 animate-fade-in">
            {/* Header: Shield Check & Safe Defaults Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-700 text-[24px]">verified_user</span>
                  Validate Roster & Calculated Pay
                </h3>
                <p className="text-xs font-mono text-slate-500">
                  Preview of <strong className="text-slate-800">{getPreviewRecords().length} staff records</strong> across{' '}
                  <strong className="text-slate-800">{selectedSheets.length} sheet(s)</strong>.
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold font-mono">
                <span className="material-symbols-outlined text-teal-700 text-[18px]">check_circle</span>
                <span>Safe Defaults Enforced</span>
              </div>
            </div>

            {/* Three Default Rule Cards from Pic 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Default Salary State */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  DEFAULT SALARY STATE
                </span>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 inline-block" />
                    Unpaid
                  </span>
                  <span>/</span>
                  <span className="inline-flex items-center gap-1 text-rose-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                    Stopped
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">0 or non-numeric base is Stopped</p>
              </div>

              {/* Card 2: Default Arrival Fee (0.05) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  DEFAULT ARRIVAL FEE (0.05)
                </span>
                <div className="text-xs font-bold text-slate-800">0% (None by Default)</div>
                <p className="text-[11px] text-slate-400">Decided later when paid</p>
              </div>

              {/* Card 3: Workforce & Currency */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  WORKFORCE & CURRENCY
                </span>
                <div className="text-xs font-bold text-slate-800">Auto-Detect ($ → Foreign)</div>
                <p className="text-[11px] text-slate-400">Salary with $ is Foreign, else Local IQD</p>
              </div>
            </div>

            {/* Mapped Data Table matching Pic 1 */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 z-10">
                    <tr className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-3">ID</th>
                      <th className="py-3 px-4">EMPLOYEE NAME</th>
                      <th className="py-3 px-3 text-center">SHEET</th>
                      <th className="py-3 px-3 text-center">WORKFORCE</th>
                      <th className="py-3 px-4">BASE SALARY</th>
                      <th className="py-3 px-3 text-center">ARRIVAL FEE</th>
                      <th className="py-3 px-3 text-center">ABSENCE</th>
                      <th className="py-3 px-4">SEARCH FEE</th>
                      <th className="py-3 px-4">NET PAY</th>
                      <th className="py-3 px-3 text-center">SALARY STATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {getPreviewRecords().map((row) => {
                      const rate = systemRate || activePeriod?.exchangeRate || 1310;
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 font-mono">
                            <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 text-[11px] font-bold">
                              {row.id}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900 leading-tight">{row.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.email}</p>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                              {row.sheet}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                              {row.workforce}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {formatMoney(row.baseSalary, row.currency, rate)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                            {row.arrivalFee > 0 ? `-${formatMoney(row.arrivalFee, row.currency, rate)}` : '0%'}
                          </td>
                          {/* ABSENCE: Show amount cut off from baseSalary only if > 0, hover shows days */}
                          <td className="py-3 px-3 text-center font-mono">
                            {row.absenceDays > 0 || (row.absence && row.absence > 0) ? (
                              <span
                                title={`${row.absenceDays} ${row.absenceDays === 1 ? 'day' : 'days'} absence (-${formatMoney(row.absence, row.currency, rate)} deducted from Base Salary)`}
                                className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-bold cursor-help inline-flex items-center gap-1"
                              >
                                -{formatMoney(row.absence, row.currency, rate)}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          {/* SEARCH FEE: USD with IQD below for foreign */}
                          <td className="py-3 px-4 font-mono font-semibold">
                            {row.searchFee > 0 ? (
                              row.isForeign ? (
                                <div
                                  className="flex flex-col gap-0.5 cursor-help"
                                  title={`Search Fee: -${formatMoney(row.searchFee, 'USD', rate)} (${formatMoney(row.searchFeeIqd || Math.round(row.searchFee * rate), 'IQD')})`}
                                >
                                  <span className="text-amber-600 font-bold">-{formatMoney(row.searchFee, 'USD', rate)}</span>
                                  <span className="text-[10px] text-slate-400 font-sans">
                                    {formatMoney(row.searchFeeIqd || Math.round(row.searchFee * rate), 'IQD')}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-600">-{formatMoney(row.searchFee, 'IQD')}</span>
                              )
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          {/* NET PAY */}
                          <td className="py-3 px-4 font-mono font-bold">
                            {row.isForeign ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-teal-800 font-black text-xs">
                                  {formatMoney(row.netPay, 'USD', rate)}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ≈ {formatMoney(Math.round(row.netPay * rate), 'IQD')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-teal-800 font-black text-xs">
                                  {formatMoney(row.netPay, 'IQD')}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ≈ {formatMoney(row.netPay / rate, 'USD')}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                              {row.salaryState}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Navigation buttons matching Pic 1 */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>Previous Step</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-teal-950/20 transition-all active:scale-[0.98]"
              >
                <span>Proceed to Confirmation</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: CONFIRM & INGEST */}
        {currentStep === 5 && !importSuccess && (
          <div className="rounded-3xl bg-[#0f172a]/90 border border-slate-800 p-6 md:p-8 shadow-xl space-y-6 animate-fade-in">
            <div className="pb-4 border-b border-slate-800 space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-[22px]">verified</span>
                Confirm & Commit Ingestion to Database
              </h3>
              <p className="text-xs text-slate-400">
                You are about to enroll <strong className="text-white">{totalSelectedRecords} staff records</strong> across{' '}
                <strong className="text-cyan-300">{selectedSheets.length} sheet(s)</strong> into cycle{' '}
                <strong className="text-emerald-400">{activePeriod?.name}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Target Payroll Cycle</span>
                <div className="text-base font-bold text-white">{activePeriod?.name}</div>
                <div className="text-xs font-mono text-cyan-400">{activePeriod?.code}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Selected Paper Sheets</span>
                <div className="text-base font-bold text-white">
                  {selectedSheets.length} of {sheets.length} Sheets
                </div>
                <div className="text-xs font-mono text-slate-400">{selectedSheets.map((s) => s.name).join(', ')}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Staff to Enroll</span>
                <div className="text-base font-bold text-emerald-400">{totalSelectedRecords} Records</div>
                <div className="text-xs text-slate-400">Safe Defaults Enforced</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-sm font-bold text-white block">Ready to Write into Live SQLite Database</span>
                <p className="text-xs text-slate-400 max-w-lg">
                  Submitting will transmit workbook records to the Ktor engine, create or update each employee in SQLite, and recalculate cycle totals.
                </p>
              </div>

              <button
                id="execute-ingest-btn"
                type="button"
                onClick={handleExecuteIngest}
                disabled={isProcessing}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 flex-shrink-0 border border-emerald-400/30"
              >
                <span className={`material-symbols-outlined text-[18px] ${isProcessing ? 'animate-spin' : ''}`}>
                  {isProcessing ? 'sync' : 'database'}
                </span>
                <span>{isProcessing ? 'Writing to SQLite...' : 'Commit Ingestion Now'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                ← Back to Validate
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: COMPLETED */}
        {currentStep === 5 && importSuccess && (
          <div className="rounded-3xl bg-[#0f172a]/90 border border-emerald-500/40 p-8 text-center space-y-6 animate-scale-in shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
              <span className="material-symbols-outlined text-[36px]">verified</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Workbook Successfully Ingested!</h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Successfully processed and enrolled <strong className="text-emerald-400">{importedCountResult} staff records</strong> from <strong className="text-white">{selectedFileName}</strong> into active cycle <strong className="text-cyan-300">{activePeriod?.name}</strong>.
              </p>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('employees')}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">groups</span>
                View Updated Staff Roster →
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setSelectedFile(null);
                  setSheets([]);
                  setImportSuccess(false);
                }}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer border border-slate-700"
              >
                Ingest Another Workbook
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};
