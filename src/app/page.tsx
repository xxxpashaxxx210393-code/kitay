"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  Upload,
  TrendingUp,
  Coins,
  Scale,
  Users,
  CheckCircle,
  Truck,
  Building,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  ChevronDown,
  Info,
  Copy,
  Check,
  FileSpreadsheet,
  AlertTriangle,
  ArrowUpDown,
  FileDown,
  FileUp,
  Loader2
} from "lucide-react";

interface Order {
  id: number;
  name: string;
  imageUrl: string | null;
  itemUrl: string | null;
  forWhom: string | null;
  trackNumber: string | null;
  status: string;
  quantity: number;
  priceCny: number;
  shippingChinaCny: number | null;
  shippingBelarusByn: number | null;
  rateCnyByn: number;
  weight: number | null;
  plannedDate: string | null;
  receivedDate: string | null;
  notes: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  "В пути на склад Китая",
  "На складе в Китае",
  "Едет в РБ",
  "Прибыло в РБ",
  "Выдано / Получено"
];

const FOR_WHOM_PRESETS = [
  "Себе",
  "Родители",
  "Клиент",
  "В продажу",
  "Друзьям",
  "Подарок"
];

// Helper to determine status color styling
const getStatusBadgeStyles = (status: string) => {
  switch (status) {
    case "В пути на склад Китая":
      return {
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        bgHover: "hover:bg-blue-100",
        dot: "bg-blue-500",
        rowBg: "bg-blue-50/20",
        colorText: "text-blue-800"
      };
    case "На складе в Китае":
      return {
        bg: "bg-amber-50 text-amber-800 border-amber-200",
        bgHover: "hover:bg-amber-100",
        dot: "bg-amber-500",
        rowBg: "bg-amber-50/20",
        colorText: "text-amber-900"
      };
    case "Едет в РБ":
      return {
        bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        bgHover: "hover:bg-indigo-100",
        dot: "bg-indigo-500",
        rowBg: "bg-indigo-50/20",
        colorText: "text-indigo-800"
      };
    case "Прибыло в РБ":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        bgHover: "hover:bg-emerald-100",
        dot: "bg-emerald-500",
        rowBg: "bg-emerald-50/25",
        colorText: "text-emerald-800"
      };
    case "Выдано / Получено":
      return {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        bgHover: "hover:bg-slate-200",
        dot: "bg-slate-400",
        rowBg: "bg-slate-50/10",
        colorText: "text-slate-800"
      };
    default:
      return {
        bg: "bg-gray-100 text-gray-700 border-gray-200",
        bgHover: "hover:bg-gray-200",
        dot: "bg-gray-400",
        rowBg: "",
        colorText: "text-gray-800"
      };
  }
};

export default function OrderTracker() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [forWhomFilter, setForWhomFilter] = useState("Все");
  const [copiedTrack, setCopiedTrack] = useState<string | null>(null);

  // New tab state to segment active collections vs archives
  const [activeTab, setActiveTab] = useState<"active" | "archived" | "all">("active");
  // Month selector filter
  const [monthFilter, setMonthFilter] = useState<string>("Все");

  // Dashboard boxes customizable layout state
  const [dashboardWidgets, setDashboardWidgets] = useState<Array<{ id: string; title: string; visible: boolean; order: number; bgClass: string }>>([
    { id: "total_items", title: "Всего товаров", visible: true, order: 1, bgClass: "bg-slate-800/60" },
    { id: "total_cny", title: "Общая сумма (CNY)", visible: true, order: 2, bgClass: "bg-slate-800/60" },
    { id: "total_byn", title: "Итого к оплате в РБ (BYN)", visible: true, order: 3, bgClass: "bg-slate-800/60" },
    { id: "total_weight", title: "Общий вес груза (кг)", visible: true, order: 4, bgClass: "bg-slate-800/60" },
    { id: "people_stats", title: "Статистика по получателям («Для кого»)", visible: true, order: 5, bgClass: "bg-slate-800/80" },
    { id: "status_counters", title: "Статусы заказов", visible: true, order: 6, bgClass: "bg-slate-800/40" },
  ]);

  // Load layout from localStorage on boot
  useEffect(() => {
    const saved = localStorage.getItem("cargo_dashboard_layout");
    if (saved) {
      try {
        setDashboardWidgets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to restore layout", e);
      }
    }
  }, []);

  // Save layout to localStorage
  const saveWidgetsLayout = (newWidgets: typeof dashboardWidgets) => {
    setDashboardWidgets(newWidgets);
    localStorage.setItem("cargo_dashboard_layout", JSON.stringify(newWidgets));
  };

  // Move widget helper (shift order)
  const moveWidget = (id: string, direction: "up" | "down") => {
    const sorted = [...dashboardWidgets].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(w => w.id === id);
    if (index === -1) return;
    
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap order values
    const temp = sorted[index].order;
    sorted[index].order = sorted[targetIndex].order;
    sorted[targetIndex].order = temp;

    saveWidgetsLayout(sorted);
    showAlert("Положение блока изменено", "success");
  };

  // Toggle widget visibility (delete/hide box)
  const toggleWidgetVisibility = (id: string, isVisible: boolean) => {
    const updated = dashboardWidgets.map(w => w.id === id ? { ...w, visible: isVisible } : w);
    saveWidgetsLayout(updated);
    showAlert(isVisible ? "Блок отображен" : "Блок успешно скрыт/удален. Вы можете восстановить его через Настройки снизу.", "info");
  };

  // Rename widget
  const renameWidget = (id: string) => {
    const widget = dashboardWidgets.find(w => w.id === id);
    if (!widget) return;
    const newName = prompt("Введите новое название для этого блока:", widget.title);
    if (newName && newName.trim()) {
      const updated = dashboardWidgets.map(w => w.id === id ? { ...w, title: newName.trim() } : w);
      saveWidgetsLayout(updated);
      showAlert("Название блока изменено", "success");
    }
  };

  // Reset Layout back to default
  const resetWidgetsLayout = () => {
    const defaults = [
      { id: "total_items", title: "Всего товаров", visible: true, order: 1, bgClass: "bg-slate-800/60" },
      { id: "total_cny", title: "Общая сумма (CNY)", visible: true, order: 2, bgClass: "bg-slate-800/60" },
      { id: "total_byn", title: "Итого к оплате в РБ (BYN)", visible: true, order: 3, bgClass: "bg-slate-800/60" },
      { id: "total_weight", title: "Общий вес груза (кг)", visible: true, order: 4, bgClass: "bg-slate-800/60" },
      { id: "people_stats", title: "Статистика по получателям («Для кого»)", visible: true, order: 5, bgClass: "bg-slate-800/80" },
      { id: "status_counters", title: "Статусы заказов", visible: true, order: 6, bgClass: "bg-slate-800/40" },
    ];
    saveWidgetsLayout(defaults);
    showAlert("Расположение и видимость всех блоков сброшены к начальным настройкам", "info");
  };

  // Global reset for all orders in database
  const resetAllOrdersInDatabase = async () => {
    if (!confirm("Вы действительно хотите полностью очистить базу данных и удалить все товары? Это действие нельзя отменить!")) {
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch("/api/orders", { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showAlert("База данных успешно очищена! Нажмите 'Обновить' или добавьте новые товары.", "success");
        setOrders([]);
      } else {
        showAlert("Ошибка при очистке: " + json.error, "error");
      }
    } catch (e: any) {
      showAlert("Не удалось очистить базу данных", "error");
    } finally {
      setLoading(false);
    }
  };

  // Sorting
  const [sortBy, setSortBy] = useState<"id" | "name" | "priceCny" | "totalByn" | "createdAt">("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Notifications
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Batch Status Update State
  const [batchTracksText, setBatchTracksText] = useState("");
  const [batchTargetStatus, setBatchTargetStatus] = useState("На складе в Китае");
  const [batchResult, setBatchResult] = useState<{
    success: boolean;
    updatedCount: number;
    totalRequested: number;
    unmatchedTracks: string[];
    matchedTracks: string[];
  } | null>(null);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Default parameters for new orders
  const [defaultRate, setDefaultRate] = useState<number>(0.4800);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    imageUrl: "",
    itemUrl: "",
    forWhom: "Родители",
    trackNumber: "",
    status: "В пути на склад Китая",
    quantity: 1,
    priceCny: 0,
    shippingChinaCny: 0,
    shippingBelarusByn: 0,
    rateCnyByn: 0.4800,
    weight: 0,
    plannedDate: "",
    receivedDate: "",
    notes: ""
  });

  // Excel / CSV Upload State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelRows, setExcelRows] = useState<any[]>([]); // parsed raw objects
  const [excelPreview, setExcelPreview] = useState<any[]>([]); // standardized orders for preview
  const [excelLoading, setExcelLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Voice Input State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [parsedVoiceData, setParsedVoiceData] = useState({
    name: "Новый товар",
    priceCny: 0,
    quantity: 1,
    forWhom: "Родители",
    trackNumber: ""
  });
  const [recognitionObj, setRecognitionObj] = useState<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "ru-RU";

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        rec.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const activeTranscript = finalTranscript || interimTranscript;
          if (activeTranscript) {
            setVoiceTranscript(activeTranscript);
            const parsed = parseVoiceText(activeTranscript);
            setParsedVoiceData(parsed);
          }
        };

        setRecognitionObj(rec);
      }
    }
  }, []);

  // Natural Language Parser for Russian cargo-oriented commands
  const parseVoiceText = (text: string) => {
    const lower = text.toLowerCase();
    let name = "";
    let priceCny = 0;
    let quantity = 1;
    let forWhom = "Родители";
    let trackNumber = "";

    // 1. Extract Price in CNY
    // Matches digits followed by yuan related words
    const priceRegex = /(\d+(?:[\.,]\d+)?)\s*(?:юан|юэн|cny|ю\.?|yuan|юань|юаней|юаня)/i;
    const priceKeywordRegex = /(?:цена|стоимость|стоить|за)\s*(\d+(?:[\.,]\d+)?)/i;
    
    let priceMatch = lower.match(priceRegex);
    if (!priceMatch) {
      priceMatch = lower.match(priceKeywordRegex);
    }
    if (priceMatch) {
      priceCny = parseFloat(priceMatch[1].replace(",", "."));
    }

    const russianNumberWords: Record<string, number> = {
      "один": 1, "одна": 1, "два": 2, "две": 2, "три": 3, "четыре": 4, "пять": 5,
      "шесть": 6, "семь": 7, "восемь": 8, "девять": 9, "десять": 10,
      "одиннадцать": 11, "двенадцать": 12, "тринадцать": 13, "четырнадцать": 14, "пятнадцать": 15,
      "двадцать": 20, "тридцать": 30, "сорок": 40, "пятьдесят": 50, "шестьдесят": 60, "семьдесят": 70, "восемьдесят": 80, "девяносто": 90,
      "сто": 100, "двести": 200, "триста": 300, "четыреста": 400, "пятьсот": 500, "шестьсот": 600, "семьсот": 700, "восемьсот": 800, "девятьсот": 900
    };

    if (priceCny === 0) {
      const words = lower.split(/\s+/);
      let sum = 0;
      let foundPriceKeyword = false;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (w === "цена" || w === "стоимость" || w === "за") {
          foundPriceKeyword = true;
          continue;
        }
        if (foundPriceKeyword && russianNumberWords[w] !== undefined) {
          sum += russianNumberWords[w];
        } else if (foundPriceKeyword && sum > 0) {
          break;
        }
      }
      if (sum > 0) priceCny = sum;
    }

    // 2. Extract Quantity
    const qtyRegex = /(\d+)\s*(?:шт|штук|штуки|количеств|кол|порц)/i;
    const qtyKeywordRegex = /(?:количество|кол-во|колво|кол|штук)\s*(\d+)/i;
    let qtyMatch = lower.match(qtyRegex);
    if (!qtyMatch) {
      qtyMatch = lower.match(qtyKeywordRegex);
    }
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1]);
    } else {
      const words = lower.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if ((w === "штук" || w === "штуки" || w === "шт" || w === "количество") && i > 0) {
          const prev = words[i - 1];
          if (russianNumberWords[prev] !== undefined) {
            quantity = russianNumberWords[prev];
            break;
          }
        }
      }
    }

    // 3. Extract For Whom
    if (lower.includes("родител")) {
      forWhom = "Родители";
    } else if (lower.includes("себе") || lower.includes("мне") || lower.includes("сам")) {
      forWhom = "Себе";
    } else if (lower.includes("клиент") || lower.includes("заказчик")) {
      forWhom = "Клиент";
    } else if (lower.includes("продаж") || lower.includes("витрин")) {
      forWhom = "В продажу";
    } else if (lower.includes("друг") || lower.includes("подруг")) {
      forWhom = "Друзьям";
    } else if (lower.includes("подар") || lower.includes("презент")) {
      forWhom = "Подарок";
    } else {
      const forWhomMatch = lower.match(/(?:для|кому|получатель)\s+([а-яёA-Za-z]+)/i);
      if (forWhomMatch && !["родителей", "себя", "клиента", "продажи", "друзей", "подарка", "родителям"].includes(forWhomMatch[1])) {
        forWhom = forWhomMatch[1].charAt(0).toUpperCase() + forWhomMatch[1].slice(1);
      }
    }

    // 4. Extract Track Number (digits or alpha-numeric of length 6 to 25)
    const trackRegex = /(?:трек|номер|трек-номер|код)\s*([a-zA-Z0-9]{6,25})/i;
    let trackMatch = lower.match(trackRegex);
    if (!trackMatch) {
      const standaloneDigits = lower.match(/\b([0-9]{8,22})\b/);
      if (standaloneDigits) {
        trackNumber = standaloneDigits[1];
      }
    } else {
      trackNumber = trackMatch[1].toUpperCase();
    }

    // 5. Clean up name
    let cleanTextForName = text;
    cleanTextForName = cleanTextForName.replace(/(?:трек|номер|трек-номер|код)\s*[a-zA-Z0-9]+/gi, "");
    cleanTextForName = cleanTextForName.replace(/\d+\s*(?:юан|юэн|cny|ю\.?|yuan|юань|юаней|юаня)/gi, "");
    cleanTextForName = cleanTextForName.replace(/(?:цена|стоимость|стоить|за)\s*\d+/gi, "");
    cleanTextForName = cleanTextForName.replace(/\d+\s*(?:шт|штук|количеств|кол|порц)/gi, "");
    cleanTextForName = cleanTextForName.replace(/(?:количество|кол-во|колво|кол|штук)\s*\d+/gi, "");
    cleanTextForName = cleanTextForName.replace(/(?:для|кому|получатель)\s*[а-яёa-z]+/gi, "");
    cleanTextForName = cleanTextForName.replace(/(?:родителям|родителей|себе|клиенту|друзьям|подарок|продать|продажу)/gi, "");
    cleanTextForName = cleanTextForName.replace(/(?:добавить|добавь|создать|запиши|товар|название|купил|новый)/gi, "");

    name = cleanTextForName
      .replace(/^[,\s\t\.а-яА-ЯёЁ]{1,3}\b/g, "")
      .replace(/[\s,;\.\-\s]+/g, " ")
      .trim();

    if (!name || name.length < 2) {
      name = "Фен или пылесос (из Речи)";
    } else {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    return {
      name,
      priceCny,
      quantity,
      forWhom,
      trackNumber
    };
  };

  // Start recording voice
  const startListening = () => {
    if (recognitionObj) {
      try {
        setVoiceTranscript("");
        recognitionObj.start();
      } catch (err) {
        console.error(err);
      }
    } else {
      showAlert("Голосовой ввод заблокирован или не поддерживается вашим браузером", "error");
    }
  };

  // Stop recording voice
  const stopListening = () => {
    if (recognitionObj) {
      recognitionObj.stop();
      setIsListening(false);
    }
  };

  // Apply parsed results to form and open modal
  const applyVoiceDataToForm = () => {
    setFormData({
      name: parsedVoiceData.name,
      imageUrl: "",
      itemUrl: "",
      forWhom: parsedVoiceData.forWhom,
      trackNumber: parsedVoiceData.trackNumber,
      status: "В пути на склад Китая",
      quantity: parsedVoiceData.quantity || 1,
      priceCny: parsedVoiceData.priceCny || 0,
      shippingChinaCny: 0,
      shippingBelarusByn: 0,
      rateCnyByn: defaultRate,
      weight: 0,
      plannedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      receivedDate: "",
      notes: "Добавлено через голосовой ввод"
    });
    setIsVoiceModalOpen(false);
    setIsModalOpen(true);
    showAlert("Данные успешно перенесены из голоса в форму! Можете проверить и нажать сохранить.", "success");
  };

  // Parse Uploaded Excel File
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelLoading(true);
    setExcelRows([]);
    setExcelPreview([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Parse rows as JSON (header: 1 lists row arrays, default lists objects)
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        
        if (!data || data.length === 0) {
          showAlert("В файле нет данных или пустой лист", "error");
          setExcelLoading(false);
          return;
        }

        setExcelRows(data);
        standardizeExcelRows(data);
      } catch (err: any) {
        showAlert("Ошибка при чтении Excel файла: " + err.message, "error");
      } finally {
        setExcelLoading(false);
      }
    };

    reader.onerror = () => {
      showAlert("Не удалось прочитать файл", "error");
      setExcelLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  // Standardize the headers automatically
  const standardizeExcelRows = (rawRows: any[]) => {
    const mapped = rawRows.map((row: any) => {
      // Find keys using fuzzy matching
      const keys = Object.keys(row);
      
      const findVal = (fuzzyHeaders: string[], fallback: any = "") => {
        const foundKey = keys.find(k => 
          fuzzyHeaders.some(fh => k.toLowerCase().replace(/[\s_\-\.]/g, "").includes(fh.toLowerCase()))
        );
        return foundKey ? row[foundKey] : fallback;
      };

      // Extract values with flexible mapping
      const name = findVal(["название", "товар", "name", "наименование", "пылесос", "фен", "пакеты"]);
      const trackNumber = String(findVal(["трек", "track", "номер", "номертрека", "посылк"]) || "").trim();
      const forWhom = findVal(["кого", "получатель", "клиент", "forwhom", "владелец"], "Родители");
      const status = findVal(["статус", "status", "этап"], "В пути на склад Китая");
      
      let priceCny = parseFloat(findVal(["цена", "price", "cny", "стоимостьед", "единиц", "ценазаед"]));
      if (isNaN(priceCny)) {
        priceCny = parseFloat(findVal(["общая", "сумма", "сум"]) || "0") || 0;
      }
      
      let quantity = parseInt(findVal(["кол", "quantity", "qty", "штук", "количество"]));
      if (isNaN(quantity)) quantity = 1;

      const itemUrl = findVal(["ссылка", "url", "link", "сайт"]);
      const shippingChinaCny = parseFloat(findVal(["доставкас", "доставкакитай", "chinashipping"])) || 0;
      const shippingBelarusByn = parseFloat(findVal(["доставкав", "доставкарб", "belarusshipping"])) || 0;
      const rateCnyByn = parseFloat(findVal(["курс", "rate", "обмен"])) || defaultRate;
      const weight = parseFloat(findVal(["вес", "weight", "кг", "kg"])) || 0;
      const notes = findVal(["заметки", "коммент", "notes", "описание"]);
      const plannedDate = findVal(["план", "датаполучения", "planned"]);

      return {
        name: name || "Без названия (из Excel)",
        trackNumber: trackNumber || "",
        forWhom: forWhom || "Себе",
        status: status || "В пути на склад Китая",
        priceCny: isNaN(priceCny) ? 0 : priceCny,
        quantity: quantity,
        itemUrl: itemUrl || "",
        imageUrl: "",
        shippingChinaCny: isNaN(shippingChinaCny) ? 0 : shippingChinaCny,
        shippingBelarusByn: isNaN(shippingBelarusByn) ? 0 : shippingBelarusByn,
        rateCnyByn: isNaN(rateCnyByn) ? defaultRate : rateCnyByn,
        weight: isNaN(weight) ? 0 : weight,
        notes: notes ? String(notes) : "",
        plannedDate: plannedDate ? String(plannedDate) : ""
      };
    }).filter(item => item.name && item.name !== "Без названия (из Excel)" || item.trackNumber);

    setExcelPreview(mapped);
  };

  // Import All Standardized Rows Into Database
  const saveImportedRows = async () => {
    if (excelPreview.length === 0) {
      showAlert("Нет данных для импорта", "error");
      return;
    }

    setExcelLoading(true);
    setImportProgress({ current: 0, total: excelPreview.length });

    let successCount = 0;
    try {
      for (let i = 0; i < excelPreview.length; i++) {
        setImportProgress({ current: i + 1, total: excelPreview.length });
        const item = excelPreview[i];
        
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        const json = await res.json();
        if (json.success) {
          successCount++;
        }
      }

      showAlert(`Успешно импортировано ${successCount} заказов из Excel!`, "success");
      setIsExcelModalOpen(false);
      setExcelPreview([]);
      setExcelRows([]);
      loadOrders();
    } catch (err: any) {
      showAlert("Возникла ошибка во время импорта: " + err.message, "error");
    } finally {
      setExcelLoading(false);
      setImportProgress(null);
    }
  };

  // Load orders
  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/orders");
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
      } else {
        showAlert("Ошибка при загрузке данных: " + json.error, "error");
      }
    } catch (err: any) {
      showAlert("Не удалось подключиться к серверу", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const showAlert = (text: string, type: "success" | "error" | "info" = "success") => {
    setAlertMessage({ text, type });
    setTimeout(() => {
      setAlertMessage(null);
    }, 6000);
  };

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrack(text);
    setTimeout(() => setCopiedTrack(null), 2000);
  };

  // Quick Inline Status Update
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      // Find original order
      const original = orders.find(o => o.id === orderId);
      if (!original) return;

      const updatedFields: Partial<Order> = { status: newStatus };
      
      // If status is changed to "Выдано / Получено" and receivedDate is empty, autofill today's date
      if (newStatus === "Выдано / Получено" && !original.receivedDate) {
        const todayStr = new Date().toISOString().split("T")[0];
        updatedFields.receivedDate = todayStr;
      }

      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });
      const json = await res.json();
      if (json.success) {
        // Update local state
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedFields } : o));
        showAlert(`Статус товара "${original.name}" изменен на "${newStatus}"`, "success");
      } else {
        showAlert("Ошибка обновления статуса: " + json.error, "error");
      }
    } catch (error) {
      showAlert("Ошибка при отправке запроса", "error");
    }
  };

  // Submit Batch Status Update
  const handleBatchStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchTracksText.trim()) {
      showAlert("Введите хотя бы один трек-номер для обновления", "error");
      return;
    }

    setIsBatchUpdating(true);
    setBatchResult(null);

    try {
      const res = await fetch("/api/orders/batch-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackNumbersText: batchTracksText,
          targetStatus: batchTargetStatus
        })
      });
      const json = await res.json();

      if (json.success) {
        setBatchResult({
          success: true,
          updatedCount: json.updatedCount,
          totalRequested: json.totalRequested,
          unmatchedTracks: json.unmatchedTracks || [],
          matchedTracks: json.matchedTracks || []
        });

        if (json.updatedCount > 0) {
          showAlert(`Успешно обновлен статус у ${json.updatedCount} товаров!`, "success");
          // Reload orders
          await loadOrders();
        } else {
          showAlert("Ни один трек-номер не совпал с базой данных", "error");
        }
      } else {
        showAlert("Ошибка пакетного обновления: " + json.error, "error");
      }
    } catch (err: any) {
      showAlert("Не удалось выполнить пакетный запрос: " + err.message, "error");
    } finally {
      setIsBatchUpdating(false);
    }
  };

  // Handle Form Open for Create
  const handleNewOrderClick = () => {
    setEditingOrder(null);
    setFormData({
      name: "",
      imageUrl: "",
      itemUrl: "",
      forWhom: "Родители",
      trackNumber: "",
      status: "В пути на склад Китая",
      quantity: 1,
      priceCny: 0,
      shippingChinaCny: 0,
      shippingBelarusByn: 0,
      rateCnyByn: defaultRate,
      weight: 0,
      plannedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // default +14 days
      receivedDate: "",
      notes: ""
    });
    setIsModalOpen(true);
  };

  // Handle Form Open for Edit
  const handleEditClick = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      name: order.name,
      imageUrl: order.imageUrl || "",
      itemUrl: order.itemUrl || "",
      forWhom: order.forWhom || "Родители",
      trackNumber: order.trackNumber || "",
      status: order.status,
      quantity: order.quantity,
      priceCny: order.priceCny,
      shippingChinaCny: order.shippingChinaCny || 0,
      shippingBelarusByn: order.shippingBelarusByn || 0,
      rateCnyByn: order.rateCnyByn || defaultRate,
      weight: order.weight || 0,
      plannedDate: order.plannedDate || "",
      receivedDate: order.receivedDate || "",
      notes: order.notes || ""
    });
    setIsModalOpen(true);
  };

  // Save Order (Create or Update)
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAlert("Пожалуйста, заполните Название товара", "error");
      return;
    }

    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity) || 1,
        priceCny: Number(formData.priceCny) || 0,
        shippingChinaCny: Number(formData.shippingChinaCny) || 0,
        shippingBelarusByn: Number(formData.shippingBelarusByn) || 0,
        rateCnyByn: Number(formData.rateCnyByn) || 0.48,
        weight: Number(formData.weight) || 0,
      };

      if (editingOrder) {
        // Update
        const res = await fetch(`/api/orders/${editingOrder.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          showAlert(`Товар "${formData.name}" успешно обновлен`, "success");
          setIsModalOpen(false);
          loadOrders();
        } else {
          showAlert("Ошибка при изменении: " + json.error, "error");
        }
      } else {
        // Create
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          showAlert(`Товар "${formData.name}" успешно добавлен в базу`, "success");
          setIsModalOpen(false);
          loadOrders();
          
          // If we customized the rate, keep it as default for subsequent new orders
          if (formData.rateCnyByn !== defaultRate) {
            setDefaultRate(formData.rateCnyByn);
          }
        } else {
          showAlert("Ошибка при добавлении: " + json.error, "error");
        }
      }
    } catch (err: any) {
      showAlert("Ошибка отправки формы: " + err.message, "error");
    }
  };

  // Delete Order
  const handleDeleteClick = async (orderId: number, orderName: string) => {
    if (!confirm(`Вы действительно хотите удалить товар "${orderName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.success) {
        showAlert(`Товар "${orderName}" успешно удален`, "info");
        setOrders(prev => prev.filter(o => o.id !== orderId));
      } else {
        showAlert("Ошибка при удалении: " + json.error, "error");
      }
    } catch (error) {
      showAlert("Ошибка удаления", "error");
    }
  };

  // Global Rate Bulk Updater
  const applyGlobalRate = async () => {
    const rateText = prompt("Введите новый курс (BYN за 1 CNY), например 0.4850:", defaultRate.toString());
    if (rateText === null) return;
    const rateNum = parseFloat(rateText);
    if (isNaN(rateNum) || rateNum <= 0) {
      showAlert("Пожалуйста, введите корректное положительное число", "error");
      return;
    }

    if (!confirm(`Обновить курс на ${rateNum} у всех товаров, которые еще НЕ выданы клиенту?`)) {
      return;
    }

    try {
      setLoading(true);
      // Iterate through visible non-delivered items and update their rates via parallel promises
      const pendingOrders = orders.filter(o => o.status !== "Выдано / Получено");
      if (pendingOrders.length === 0) {
        showAlert("Нет активных товаров для обновления курса", "info");
        setLoading(false);
        return;
      }

      let successCount = 0;
      for (const order of pendingOrders) {
        const res = await fetch(`/api/orders/${order.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rateCnyByn: rateNum })
        });
        const json = await res.json();
        if (json.success) successCount++;
      }

      setDefaultRate(rateNum);
      showAlert(`Курс успешно обновлен на ${rateNum} у ${successCount} товаров!`, "success");
      loadOrders();
    } catch (e: any) {
      showAlert("Ошибка пакетного обновления курса", "error");
      setLoading(false);
    }
  };

  // Computed Values per Item (Memoized)
  const calculatedOrders = useMemo(() => {
    return orders.map((o) => {
      const qty = o.quantity || 1;
      const priceCny = o.priceCny || 0;
      const rate = o.rateCnyByn || 0.48;
      const shipChinaCny = o.shippingChinaCny || 0;
      const shipBelarusByn = o.shippingBelarusByn || 0;

      const itemTotalCny = qty * priceCny; // Общая стоимость, CNY
      const itemCostByn = itemTotalCny * rate; // Стоимость товара, BYN
      const shippingChinaByn = shipChinaCny * rate; // Доставка по Китаю в BYN
      const totalWithShippingByn = itemCostByn + shippingChinaByn + shipBelarusByn; // Итого с доставкой, BYN
      const unitCostByn = totalWithShippingByn / qty; // Себестоимость 1 ед., BYN

      return {
        ...o,
        itemTotalCny,
        itemCostByn,
        shippingChinaByn,
        totalWithShippingByn,
        unitCostByn
      };
    });
  }, [orders]);

  // Unique "Для кого" list for filter dropdown
  const uniqueForWhomOptions = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.forWhom) set.add(o.forWhom);
    });
    return Array.from(set);
  }, [orders]);

  // Helper to get formatted month label from ISO date or createdAt string
  const getMonthLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Без даты";
      return date.toLocaleString("ru-RU", { month: "long", year: "numeric" });
    } catch {
      return "Без даты";
    }
  };

  // Unique list of Months for grouping and filtering
  const uniqueMonths = useMemo(() => {
    const set = new Set<string>();
    calculatedOrders.forEach(o => {
      const month = getMonthLabel(o.createdAt);
      if (month) set.add(month);
    });
    return Array.from(set);
  }, [calculatedOrders]);

  // Filtering
  const filteredOrders = useMemo(() => {
    return calculatedOrders.filter((o) => {
      // 1. Tab segment: active vs archived
      if (activeTab === "active" && o.status === "Выдано / Получено") {
        return false;
      }
      if (activeTab === "archived" && o.status !== "Выдано / Получено") {
        return false;
      }

      // 2. Search text matches Name, Track, ForWhom, or Notes
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        o.name.toLowerCase().includes(searchLower) ||
        (o.trackNumber || "").toLowerCase().includes(searchLower) ||
        (o.forWhom || "").toLowerCase().includes(searchLower) ||
        (o.notes || "").toLowerCase().includes(searchLower);

      // 3. Status filter
      const matchesStatus = statusFilter === "Все" || o.status === statusFilter;

      // 4. For whom filter
      const matchesForWhom = forWhomFilter === "Все" || o.forWhom === forWhomFilter;

      // 5. Month filter
      const itemMonth = getMonthLabel(o.createdAt);
      const matchesMonth = monthFilter === "Все" || itemMonth === monthFilter;

      return matchesSearch && matchesStatus && matchesForWhom && matchesMonth;
    });
  }, [calculatedOrders, searchQuery, statusFilter, forWhomFilter, activeTab, monthFilter]);

  // Sorting logic
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortBy === "totalByn") {
        valA = a.totalWithShippingByn;
        valB = b.totalWithShippingByn;
      } else if (sortBy === "name") {
        valA = a.name;
        valB = b.name;
      } else if (sortBy === "priceCny") {
        valA = a.priceCny;
        valB = b.priceCny;
      } else if (sortBy === "createdAt") {
        valA = a.createdAt;
        valB = b.createdAt;
      } else {
        valA = a.id;
        valB = b.id;
      }

      if (typeof valA === "string") {
        const strA = valA || "";
        const strB = valB || "";
        return sortOrder === "asc"
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      } else {
        // Numbers or nulls
        const nA = Number(valA) || 0;
        const nB = Number(valB) || 0;
        return sortOrder === "asc" ? nA - nB : nB - nA;
      }
    });
  }, [filteredOrders, sortBy, sortOrder]);

  // Totals calculations
  const stats = useMemo(() => {
    let totalItemsCount = 0;
    let totalCnyPrice = 0;
    let totalBynWithShipping = 0;
    let totalWeightKg = 0;
    
    // Status counts
    const statusCounts = {
      inChinaTransit: 0,
      inChinaWarehouse: 0,
      toBelarusTransit: 0,
      arrivedInBelarus: 0,
      completed: 0,
    };

    // Dictionary for grouping by "forWhom"
    const peopleMap: Record<string, { count: number; totalCny: number; totalByn: number; totalBynWithShipping: number; weight: number }> = {};

    calculatedOrders.forEach(o => {
      totalItemsCount += o.quantity;
      totalCnyPrice += o.itemTotalCny;
      totalBynWithShipping += o.totalWithShippingByn;
      totalWeightKg += (o.weight || 0);

      if (o.status === "В пути на склад Китая") statusCounts.inChinaTransit++;
      else if (o.status === "На складе в Китае") statusCounts.inChinaWarehouse++;
      else if (o.status === "Едет в РБ") statusCounts.toBelarusTransit++;
      else if (o.status === "Прибыло в РБ") statusCounts.arrivedInBelarus++;
      else if (o.status === "Выдано / Получено") statusCounts.completed++;

      // Compute statistics by person
      const key = o.forWhom || "Не указан";
      if (!peopleMap[key]) {
        peopleMap[key] = { count: 0, totalCny: 0, totalByn: 0, totalBynWithShipping: 0, weight: 0 };
      }
      peopleMap[key].count += o.quantity;
      peopleMap[key].totalCny += o.itemTotalCny;
      peopleMap[key].totalByn += o.itemCostByn;
      peopleMap[key].totalBynWithShipping += o.totalWithShippingByn;
      peopleMap[key].weight += (o.weight || 0);
    });

    const peopleStats = Object.keys(peopleMap).map(name => ({
      name,
      ...peopleMap[name]
    })).sort((a, b) => b.totalBynWithShipping - a.totalBynWithShipping);

    return {
      totalItemsCount,
      totalCnyPrice,
      totalBynWithShipping,
      totalWeightKg,
      statusCounts,
      peopleStats,
      averageCnyPrice: totalItemsCount > 0 ? totalCnyPrice / totalItemsCount : 0
    };
  }, [calculatedOrders]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* HEADER SECTION */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-blue-600 to-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    КАРГО-КОНТРОЛЬ 🇨🇳 <span className="text-blue-400">➔</span> 🇧🇾
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium">
                    Учет заказов, трек-номеров и авторасчет себестоимости в РБ
                  </p>
                </div>
              </div>
            </div>

            {/* Quick configuration bar */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <div className="text-xs font-semibold px-2 text-slate-400 uppercase tracking-wider">
                Курс по умолчанию:
              </div>
              <div className="bg-slate-900 px-3 py-1 rounded-lg text-emerald-400 font-mono font-bold text-sm border border-slate-700">
                1 CNY = {defaultRate} BYN
              </div>
              <button
                onClick={applyGlobalRate}
                title="Обновить курс для всех активных товаров"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Изменить курс</span>
              </button>
              
              <button
                onClick={loadOrders}
                title="Обновить данные"
                className="p-1.5 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* ALERT NOTIFICATION */}
        {alertMessage && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fadeIn shadow-lg ${
            alertMessage.type === "success" 
              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200" 
              : alertMessage.type === "error"
              ? "bg-rose-950/80 border-rose-500/50 text-rose-200"
              : "bg-blue-950/80 border-blue-500/50 text-blue-200"
          }`}>
            <div className="mt-0.5">
              {alertMessage.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              {alertMessage.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-400" />}
              {alertMessage.type === "info" && <Info className="w-5 h-5 text-blue-400" />}
            </div>
            <div className="flex-1 text-sm font-medium">{alertMessage.text}</div>
            <button 
              onClick={() => setAlertMessage(null)} 
              className="text-xs opacity-60 hover:opacity-100 cursor-pointer px-1.5 py-0.5 rounded bg-black/20"
            >
              ✕
            </button>
          </div>
        )}

        {/* DYNAMIC AND CUSTOMIZABLE DASHBOARD WIDGETS */}
        <div className="space-y-6">
          
          {/* Layout helper toolbar visible only during editing */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/40 text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1">
              <Info className="w-4 h-4 text-blue-400" />
              <span>⚙️ Конструктор дашборда: Нажимайте стрелки ◀ ▶ на блоках для перемещения, ✏️ для переименования или ✕ для скрытия окон.</span>
            </span>
            <button
              onClick={resetWidgetsLayout}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all text-[11px] cursor-pointer"
            >
              Сбросить расположение окон
            </button>
          </div>

          {[...dashboardWidgets]
            .sort((a, b) => a.order - b.order)
            .map((widget) => {
              if (!widget.visible) return null;

              // Render wrapper header with control handles
              const renderControls = () => (
                <div className="flex items-center gap-1 text-slate-400 bg-slate-950/40 px-2 py-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => moveWidget(widget.id, "up")}
                    title="Переместить вверх"
                    className="p-1 hover:text-white hover:bg-slate-800 rounded text-[10px]"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveWidget(widget.id, "down")}
                    title="Переместить вниз"
                    className="p-1 hover:text-white hover:bg-slate-800 rounded text-[10px]"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => renameWidget(widget.id)}
                    title="Переименовать блок"
                    className="p-1 hover:text-white hover:bg-slate-800 rounded text-[10px]"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWidgetVisibility(widget.id, false)}
                    title="Скрыть блок (удалить из виду)"
                    className="p-1 hover:text-rose-400 hover:bg-rose-950/40 rounded text-[10px] font-bold"
                  >
                    ✕
                  </button>
                </div>
              );

              // 1. Render numeric metrics grid
              if (widget.id === "total_items" || widget.id === "total_cny" || widget.id === "total_byn" || widget.id === "total_weight") {
                // Find all active metric widgets to render them grouped or standalone
                const isMetric = (id: string) => id === "total_items" || id === "total_cny" || id === "total_byn" || id === "total_weight";
                const visibleMetrics = dashboardWidgets
                  .filter(w => w.visible && isMetric(w.id))
                  .sort((a, b) => a.order - b.order);

                // To prevent double rendering, only render the metrics container once when processing the first visible metric widget
                if (widget.id !== visibleMetrics[0]?.id) return null;

                return (
                  <div key="metrics_container" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {visibleMetrics.map((m) => (
                      <div key={m.id} className={`${m.bgClass} p-4 rounded-2xl border border-slate-700/60 shadow-md relative group/metric`}>
                        <div className="absolute top-2 right-2 opacity-0 group-hover/metric:opacity-100 transition-opacity z-10">
                          <div className="flex gap-1 bg-slate-900/90 p-0.5 rounded border border-slate-700 text-[9px]">
                            <button onClick={() => moveWidget(m.id, "up")} className="hover:text-white px-1">◀</button>
                            <button onClick={() => moveWidget(m.id, "down")} className="hover:text-white px-1">▶</button>
                            <button onClick={() => renameWidget(m.id)} className="hover:text-white px-1">✏️</button>
                            <button onClick={() => toggleWidgetVisibility(m.id, false)} className="hover:text-rose-400 px-1 font-bold">✕</button>
                          </div>
                        </div>

                        {m.id === "total_items" && (
                          <>
                            <div className="flex items-center justify-between text-slate-400 mb-1">
                              <span className="text-xs sm:text-sm font-medium">{m.title}</span>
                              <Package className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-white">
                              {stats.totalItemsCount} <span className="text-xs text-slate-400 font-normal">шт</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">В списке: {orders.length} позиций</div>
                          </>
                        )}

                        {m.id === "total_cny" && (
                          <>
                            <div className="flex items-center justify-between text-slate-400 mb-1">
                              <span className="text-xs sm:text-sm font-medium">{m.title}</span>
                              <TrendingUp className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-emerald-400">
                              ¥ {stats.totalCnyPrice.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Только стоимость товаров</div>
                          </>
                        )}

                        {m.id === "total_byn" && (
                          <>
                            <div className="flex items-center justify-between text-slate-400 mb-1">
                              <span className="text-xs sm:text-sm font-medium">{m.title}</span>
                              <Coins className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-white">
                              {stats.totalBynWithShipping.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-400">BYN</span>
                            </div>
                            <div className="text-xs text-indigo-300 mt-1 font-medium">С учетом всех доставок</div>
                          </>
                        )}

                        {m.id === "total_weight" && (
                          <>
                            <div className="flex items-center justify-between text-slate-400 mb-1">
                              <span className="text-xs sm:text-sm font-medium">{m.title}</span>
                              <Scale className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-amber-400">
                              {stats.totalWeightKg.toFixed(2)} <span className="text-xs font-normal text-slate-400">кг</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Для расчета доставки карго</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }

              // 2. Render People Statistics Card
              if (widget.id === "people_stats") {
                return (
                  <div key="people_stats_widget" className={`${widget.bgClass} p-5 rounded-3xl border border-slate-700/80 shadow-xl relative overflow-hidden`}>
                    <div className="absolute top-2 right-2 z-10">
                      {renderControls()}
                    </div>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/60 mr-24">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <h3 className="font-extrabold text-white text-base sm:text-lg">
                            {widget.title}
                          </h3>
                          <p className="text-xs text-slate-400">
                            Автоматический расчет сумм, объемов и веса индивидуально для каждого человека в списке.
                          </p>
                        </div>
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                        Людей в заказе: {stats.peopleStats.length}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {stats.peopleStats.map((person) => {
                        const isSelected = forWhomFilter === person.name;
                        return (
                          <div 
                            key={person.name}
                            onClick={() => setForWhomFilter(forWhomFilter === person.name ? "Все" : person.name)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none group relative ${
                              isSelected 
                                ? "bg-gradient-to-br from-emerald-950/80 to-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-500/5" 
                                : "bg-slate-900/50 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-extrabold text-white text-sm tracking-tight group-hover:text-emerald-400 transition-colors">
                                {person.name}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {person.count} шт
                              </span>
                            </div>

                            <div className="space-y-1.5 text-xs text-slate-400">
                              <div className="flex justify-between">
                                <span>Стоимость CNY:</span>
                                <span className="font-mono text-slate-200">¥ {person.totalCny.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Стоимость BYN:</span>
                                <span className="font-mono text-blue-300">{person.totalByn.toFixed(2)} BYN</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-slate-800/80 text-white font-extrabold">
                                <span>Итого с дост.:</span>
                                <span className="font-mono text-emerald-300">{person.totalBynWithShipping.toFixed(2)} BYN</span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span>Вес посылок:</span>
                                <span className="font-mono font-bold text-amber-400">{person.weight.toFixed(2)} кг</span>
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                              <span className="text-slate-500 font-medium">
                                {isSelected ? "⚡️ Фильтр активен" : "Кликните для фильтрации"}
                              </span>
                              <span className="text-emerald-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                Выбрать →
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // 3. Render Status Counters
              if (widget.id === "status_counters") {
                return (
                  <div key="status_counters_widget" className={`${widget.bgClass} p-3 sm:p-4 rounded-2xl border border-slate-700/40 relative`}>
                    <div className="absolute top-2 right-2 z-10">
                      {renderControls()}
                    </div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 mr-24">{widget.title}:</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 text-center">
                      
                      <button 
                        onClick={() => setStatusFilter("В пути на склад Китая")}
                        className={`p-2.5 rounded-xl border transition-all text-left sm:text-center cursor-pointer ${
                          statusFilter === "В пути на склад Китая"
                            ? "bg-blue-950/80 border-blue-500 text-blue-200 shadow-md shadow-blue-500/10" 
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between sm:justify-center gap-1 mb-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span className="text-xs font-medium text-slate-400 hidden sm:inline">В пути на склад С</span>
                          <span className="text-xs font-medium text-slate-400 sm:hidden">В пути на склад</span>
                        </div>
                        <div className="text-lg font-black">{stats.statusCounts.inChinaTransit}</div>
                      </button>

                      <button 
                        onClick={() => setStatusFilter("На складе в Китае")}
                        className={`p-2.5 rounded-xl border transition-all text-left sm:text-center cursor-pointer ${
                          statusFilter === "На складе в Китае"
                            ? "bg-amber-950/80 border-amber-500 text-amber-200 shadow-md shadow-amber-500/10" 
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between sm:justify-center gap-1 mb-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span className="text-xs font-medium text-slate-400">На складе Китая</span>
                        </div>
                        <div className="text-lg font-black text-amber-400">{stats.statusCounts.inChinaWarehouse}</div>
                      </button>

                      <button 
                        onClick={() => setStatusFilter("Едет в РБ")}
                        className={`p-2.5 rounded-xl border transition-all text-left sm:text-center cursor-pointer ${
                          statusFilter === "Едет в РБ"
                            ? "bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/10" 
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between sm:justify-center gap-1 mb-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span className="text-xs font-medium text-slate-400">Едет в РБ</span>
                        </div>
                        <div className="text-lg font-black text-indigo-400">{stats.statusCounts.toBelarusTransit}</div>
                      </button>

                      <button 
                        onClick={() => setStatusFilter("Прибыло в РБ")}
                        className={`p-2.5 rounded-xl border transition-all text-left sm:text-center cursor-pointer ${
                          statusFilter === "Прибыло в РБ"
                            ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-500/10" 
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between sm:justify-center gap-1 mb-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="text-xs font-medium text-slate-400">Прибыло в РБ</span>
                        </div>
                        <div className="text-lg font-black text-emerald-400">{stats.statusCounts.arrivedInBelarus}</div>
                      </button>

                      <button 
                        onClick={() => setStatusFilter("Выдано / Получено")}
                        className={`p-2.5 rounded-xl border transition-all text-left sm:text-center cursor-pointer col-span-2 sm:col-span-1 ${
                          statusFilter === "Выдано / Получено"
                            ? "bg-slate-800 border-slate-600 text-slate-100 shadow-md" 
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between sm:justify-center gap-1 mb-1">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          <span className="text-xs font-medium text-slate-400">Выдано / Получено</span>
                        </div>
                        <div className="text-lg font-black text-slate-300">{stats.statusCounts.completed}</div>
                      </button>

                    </div>
                    {statusFilter !== "Все" && (
                      <div className="flex items-center justify-between mt-3 text-xs text-blue-400 font-semibold bg-blue-950/30 p-2 rounded-lg border border-blue-900/40 mr-24">
                        <span>Выбран фильтр по статусу: "{statusFilter}"</span>
                        <button 
                          onClick={() => setStatusFilter("Все")}
                          className="underline hover:text-white cursor-pointer"
                        >
                          Показать все статусы
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return null;
            })}

        </div>

        {/* TWO COLUMN GRID: BATCH ACTION AND QUICK ADD BUTTONS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: BATCH UPDATE COMPONENT */}
          <div className="lg:col-span-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700/80 p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base sm:text-lg">
                  ⚡️ Групповая смена статусов по списку треков
                </h2>
                <p className="text-xs text-slate-400">
                  Вставьте список трек-номеров через запятую, пробел или с новой строки, чтобы поменять статус у всех сразу!
                </p>
              </div>
            </div>

            <form onSubmit={handleBatchStatusSubmit} className="space-y-4">
              <div>
                <textarea
                  value={batchTracksText}
                  onChange={(e) => setBatchTracksText(e.target.value)}
                  placeholder="Вставьте сюда трек-номера, например:&#10;465561361436395&#10;465570000180274&#10;JT5512110631642"
                  className="w-full h-24 sm:h-28 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100 placeholder-slate-500 text-sm font-mono leading-relaxed resize-none focus:outline-none"
                ></textarea>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-slate-400 shrink-0 uppercase tracking-wider">Установить статус:</span>
                  <select
                    value={batchTargetStatus}
                    onChange={(e) => setBatchTargetStatus(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isBatchUpdating}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-900/20 active:scale-95 transition-all cursor-pointer"
                >
                  {isBatchUpdating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Применение...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Применить ко всем ({batchTracksText.split(/[\n,;\s\t]+/).filter(t => t.trim()).length})</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* BATCH STATUS UPDATE RESULTS PANEL */}
            {batchResult && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm animate-fadeIn">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    {batchResult.updatedCount > 0 ? (
                      <span className="text-emerald-400">✓ Успешно обновлено: {batchResult.updatedCount}</span>
                    ) : (
                      <span className="text-amber-400">⚠ Нет обновлений</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Всего в запросе: {batchResult.totalRequested}
                  </span>
                </div>

                {batchResult.matchedTracks.length > 0 && (
                  <div className="text-xs text-slate-300 mb-2">
                    <span className="font-semibold text-emerald-400">Совпавшие треки:</span> {batchResult.matchedTracks.join(", ")}
                  </div>
                )}

                {batchResult.unmatchedTracks.length > 0 && (
                  <div className="p-3 bg-red-950/25 rounded-xl border border-red-900/30">
                    <div className="text-xs text-rose-300 font-bold mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      Не найдены в вашей базе ({batchResult.unmatchedTracks.length} шт):
                    </div>
                    <div className="text-xs text-slate-300 font-mono select-all break-all bg-black/40 p-2 rounded border border-slate-800/80 max-h-20 overflow-y-auto">
                      {batchResult.unmatchedTracks.join(", ")}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      💡 Вы можете добавить их в таблицу с помощью кнопки "+ Новый товар" справа!
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setBatchResult(null)}
                  className="mt-2 text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Скрыть отчет
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: QUICK ACTION CENTER */}
          <div className="lg:col-span-4 bg-slate-800/60 rounded-3xl border border-slate-700/60 p-5 flex flex-col justify-between shadow-xl">
            <div>
              <h2 className="font-bold text-white text-base sm:text-lg mb-1 flex items-center gap-1.5">
                📦 Центр управления
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Быстрое добавление новой посылки из Китая и быстрый экспорт в Excel/Таблицу.
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={handleNewOrderClick}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Plus className="w-5 h-5 shrink-0" />
                  <span>ДОБАВИТЬ НОВЫЙ ТОВАР</span>
                </button>

                {/* VOICE DICTATION TRIGGER BUTTON */}
                <button
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-rose-500/15 active:scale-[0.98] transition-all cursor-pointer border border-rose-500/30 animate-pulse"
                >
                  <span>🎤 ГОЛОСОВОЙ ВВОД (БЫСТРО)</span>
                </button>

                {/* EXCEL IMPORT TRIGGER BUTTON */}
                <button
                  onClick={() => setIsExcelModalOpen(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-500/15 active:scale-[0.98] transition-all cursor-pointer border border-emerald-500/30"
                >
                  <FileSpreadsheet className="w-5 h-5 shrink-0" />
                  <span>ЗАГРУЗИТЬ EXCEL ФАЙЛ (.xlsx)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      // Simple print/export window
                      window.print();
                    }}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-white transition-all text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Печать / PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      // Trigger prompt or quick alert about Excel download
                      showAlert("Данные таблицы готовы для копирования или печати в PDF. Для Excel просто выделите строки.", "info");
                    }}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-white transition-all text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-blue-400" />
                    <span>Экспорт</span>
                  </button>
                </div>

                {/* GLOBAL DATA RESET BUTTON */}
                <button
                  onClick={resetAllOrdersInDatabase}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-400 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-red-900/60 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                  <span>🚨 СБРОСИТЬ ВСЕ ТОВАРЫ (ОЧИСТИТЬ)</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/60 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Курс CNY зафиксирован:</span>
                <span className="font-bold text-white">{defaultRate} BYN</span>
              </div>
              <div className="flex justify-between">
                <span>Средняя стоимость CNY:</span>
                <span className="font-bold text-emerald-400">¥ {stats.averageCnyPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Всего в пути на склад:</span>
                <span className="font-bold text-blue-400">{stats.statusCounts.inChinaTransit} шт</span>
              </div>
            </div>
          </div>

        </div>

        {/* SEARCH AND FILTERS TOOLBAR */}
        <div className="bg-slate-800/80 p-4 rounded-3xl border border-slate-700/60 shadow-lg space-y-3">
          
          {/* TAB BAR FOR ACTIVE VS ARCHIVED SAVES */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => {
                  setActiveTab("active");
                  setStatusFilter("Все");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "active"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>📥 Активные заказы (В работе)</span>
                <span className="ml-1 bg-black/30 px-2 py-0.5 rounded text-[10px]">
                  {orders.filter(o => o.status !== "Выдано / Получено").length}
                </span>
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("archived");
                  setStatusFilter("Все");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "archived"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>🗄️ Архив (Выдано / Получено)</span>
                <span className="ml-1 bg-black/30 px-2 py-0.5 rounded text-[10px]">
                  {orders.filter(o => o.status === "Выдано / Получено").length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("all");
                  setStatusFilter("Все");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "all"
                    ? "bg-slate-700 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>📋 Все заказы (Вся история)</span>
                <span className="ml-1 bg-black/30 px-2 py-0.5 rounded text-[10px]">
                  {orders.length}
                </span>
              </button>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                {activeTab === "active" && "💡 Просмотр активного сбора товаров. Старые выданные заказы спрятаны в Архив."}
                {activeTab === "archived" && "🗄️ Просмотр архива. Здесь хранятся все успешно завершенные и выданные товары."}
                {activeTab === "all" && "📋 Просмотр полной истории за все время с самого начала."}
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию товара, трек-номеру, получателю..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:border-blue-500 focus:outline-none placeholder-slate-500 text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-slate-800 px-1.5 py-0.5 rounded"
                >
                  очистить
                </button>
              )}
            </div>

            {/* Quick dropdown filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* FILTER BY ADDITION MONTH / DATE (По числам) */}
              <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">📅 По дате/месяцу:</span>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer capitalize"
                >
                  <option value="Все" className="bg-slate-900">Все месяцы</option>
                  {uniqueMonths.map(month => (
                    <option key={month} value={month} className="bg-slate-900 capitalize">{month}</option>
                  ))}
                </select>
              </div>

              {activeTab === "all" && (
                <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Статус:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="Все" className="bg-slate-900">Все статусы</option>
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status} className="bg-slate-900">{status}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Для кого:</span>
                <select
                  value={forWhomFilter}
                  onChange={(e) => setForWhomFilter(e.target.value)}
                  className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="Все" className="bg-slate-900">Все получатели</option>
                  {uniqueForWhomOptions.map(person => (
                    <option key={person} value={person} className="bg-slate-900">{person}</option>
                  ))}
                </select>
              </div>

              {(statusFilter !== "Все" || forWhomFilter !== "Все" || searchQuery !== "" || monthFilter !== "Все") && (
                <button
                  onClick={() => {
                    setStatusFilter("Все");
                    setForWhomFilter("Все");
                    setSearchQuery("");
                    setMonthFilter("Все");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          </div>
          
          {/* Active stats on filtered subset */}
          <div className="text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1">
            <div>
              Найдено: <span className="font-bold text-white">{sortedOrders.length}</span> из <span className="text-slate-300 font-bold">{orders.length}</span> товаров в списке.
            </div>
            {sortedOrders.length > 0 && (
              <div className="flex gap-4">
                <span>Сумма найденных: <strong className="text-emerald-400">¥{sortedOrders.reduce((sum, o) => sum + o.itemTotalCny, 0).toFixed(2)}</strong></span>
                <span>Итого в BYN: <strong className="text-indigo-400">{sortedOrders.reduce((sum, o) => sum + o.totalWithShippingByn, 0).toFixed(2)} BYN</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* INTERACTIVE TABLE & GRID */}
        {loading ? (
          <div className="bg-slate-800/40 p-20 rounded-3xl border border-slate-700/40 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-slate-300 font-medium">Загрузка ваших заказов из базы данных...</p>
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="bg-slate-800/40 p-16 rounded-3xl border border-slate-700/40 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-700/40 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-lg">Заказы не найдены</h3>
              <p className="text-slate-400 max-w-md mx-auto text-sm">
                По вашему запросу ничего не найдено. Попробуйте сбросить фильтры или добавьте новый товар.
              </p>
            </div>
            <button
              onClick={handleNewOrderClick}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить первый товар</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-800 shadow-xl bg-slate-900">
            <table className="w-full text-left border-collapse table-auto text-xs min-w-[1300px]">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700/80 text-[11px] text-slate-300 font-bold uppercase tracking-wider">
                  <th className="p-3 w-16 text-center">Фото товара</th>
                  
                  <th className="p-3 cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => toggleSort("name")}>
                    <div className="flex items-center gap-1">
                      <span>Название товара</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  
                  <th className="p-3 text-center">Для кого</th>
                  <th className="p-3">Трек-номер Китая</th>
                  <th className="p-3 text-center">Статус доставки (Клик для смены)</th>
                  <th className="p-3 text-center bg-slate-700/40 text-white font-black">Кол-во</th>
                  
                  {/* CNY block */}
                  <th className="p-3 text-right text-amber-400 bg-slate-950/30">Цена за ед., CNY</th>
                  <th className="p-3 text-right text-amber-300 bg-slate-950/30">Общая стоимость, CNY</th>
                  
                  <th className="p-3 text-right">Курс BYN</th>
                  
                  {/* BYN Block explicitly added as requested */}
                  <th className="p-3 text-right text-blue-300 bg-blue-950/40 font-extrabold border-l border-blue-900/40">Цена за ед., BYN</th>
                  <th className="p-3 text-right text-emerald-300 bg-emerald-950/20 font-black border-r border-emerald-900/20">Общая стоимость, BYN</th>
                  
                  <th className="p-3 text-right">Дост. С (CNY)</th>
                  <th className="p-3 text-right">Дост. В (BYN)</th>
                  <th className="p-3 text-right font-extrabold text-indigo-300 bg-indigo-950/20">Итого с доставкой, BYN</th>
                  <th className="p-3 text-right font-semibold text-teal-300 bg-teal-950/20">Себест. 1 ед., BYN</th>
                  <th className="p-3 text-center">Вес (кг)</th>
                  <th className="p-3 text-center">Срок / Дата</th>
                  <th className="p-3 w-20 text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {sortedOrders.map((o) => {
                  const statusStyles = getStatusBadgeStyles(o.status);
                  // explicit single price in BYN
                  const unitPriceByn = o.priceCny * o.rateCnyByn;

                  return (
                    <tr 
                      key={o.id} 
                      className={`hover:bg-slate-800/65 transition-colors group ${statusStyles.rowBg}`}
                    >
                      {/* Beautiful larger image widget with magnifier styling */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border-2 border-slate-700/80 mx-auto flex items-center justify-center group-hover:border-blue-500/80 transition-all shadow-md">
                          {o.imageUrl ? (
                            <img 
                              src={o.imageUrl} 
                              alt={o.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              onError={(e) => {
                                (e.target as any).src = "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=120&auto=format&fit=crop";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                              <span className="text-xs font-black text-slate-400 uppercase">
                                {o.name.substring(0, 2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Name & link */}
                      <td className="p-3 font-semibold text-slate-100 max-w-[200px]">
                        <div className="space-y-1">
                          <div className="font-extrabold text-sm text-white tracking-tight group-hover:text-blue-300 transition-colors">
                            {o.name}
                          </div>
                          {o.itemUrl ? (
                            <a 
                              href={o.itemUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 hover:underline font-mono"
                            >
                              <span>Открыть на YangKeDuo</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic block">Нет ссылки</span>
                          )}
                        </div>
                      </td>

                      {/* For whom badge */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-bold">
                          {o.forWhom || "Родители"}
                        </span>
                      </td>

                      {/* Track number with copy */}
                      <td className="p-3">
                        {o.trackNumber ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-slate-300 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/80 select-all font-semibold">
                              {o.trackNumber}
                            </span>
                            <button
                              onClick={() => handleCopy(o.trackNumber || "")}
                              title="Копировать трек-номер"
                              className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-all cursor-pointer"
                            >
                              {copiedTrack === o.trackNumber ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-rose-400 italic text-[10px] font-semibold">
                            ⚠ Нет трека
                          </span>
                        )}
                      </td>

                      {/* Interactive Status Selector Badge */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="relative inline-block text-left">
                          <select
                            value={o.status}
                            onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-xl border text-[11px] font-extrabold cursor-pointer transition-all outline-none ${statusStyles.bg} ${statusStyles.bgHover} shadow-sm`}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status} className="bg-slate-900 text-slate-100 text-xs font-semibold">
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="p-3 text-center text-sm font-black text-white bg-slate-800/40">
                        {o.quantity}
                      </td>

                      {/* Price CNY */}
                      <td className="p-3 text-right font-mono font-medium text-slate-300 bg-slate-950/20">
                        ¥ {o.priceCny.toFixed(2)}
                      </td>

                      {/* Total CNY */}
                      <td className="p-3 text-right font-mono font-bold text-amber-400 bg-slate-950/20">
                        ¥ {o.itemTotalCny.toFixed(2)}
                      </td>

                      {/* Exchange Rate */}
                      <td className="p-3 text-right font-mono text-slate-400 text-[11px]">
                        {o.rateCnyByn.toFixed(4)}
                      </td>

                      {/* Price per unit, BYN (New field) */}
                      <td className="p-3 text-right font-mono font-bold text-blue-300 bg-blue-950/20 border-l border-blue-900/40">
                        {unitPriceByn.toFixed(2)} <span className="text-[9px] text-slate-400 font-normal">BYN</span>
                      </td>

                      {/* Total cost in BYN (New field) */}
                      <td className="p-3 text-right font-mono font-black text-emerald-300 bg-emerald-950/10 border-r border-emerald-900/20">
                        {o.itemCostByn.toFixed(2)} <span className="text-[9px] text-slate-400 font-normal">BYN</span>
                      </td>

                      {/* Delivery China CNY */}
                      <td className="p-3 text-right font-mono text-slate-400">
                        {o.shippingChinaCny ? `¥ ${o.shippingChinaCny.toFixed(2)}` : "—"}
                      </td>

                      {/* Delivery Belarus BYN */}
                      <td className="p-3 text-right font-mono text-slate-400">
                        {o.shippingBelarusByn ? `${o.shippingBelarusByn.toFixed(2)}` : "—"}
                      </td>

                      {/* Total With Shipping BYN */}
                      <td className="p-3 text-right font-mono font-black text-indigo-300 bg-indigo-950/20 text-xs">
                        {o.totalWithShippingByn.toFixed(2)} <span className="text-[9px] font-normal text-slate-400">BYN</span>
                      </td>

                      {/* Unit Cost Price BYN */}
                      <td className="p-3 text-right font-mono font-black text-teal-300 bg-teal-950/10 text-xs">
                        {o.unitCostByn.toFixed(2)} <span className="text-[9px] font-normal text-slate-400">BYN</span>
                      </td>

                      {/* Weight */}
                      <td className="p-3 text-center font-mono font-bold text-amber-400">
                        {o.weight ? `${o.weight} кг` : "—"}
                      </td>

                      {/* Date */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="space-y-0.5 text-[10px]">
                          {o.receivedDate ? (
                            <div className="text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                              <CheckCircle className="w-3 h-3" />
                              <span>Получен: {o.receivedDate}</span>
                            </div>
                          ) : o.plannedDate ? (
                            <div className="text-slate-400">
                              <span>План: <strong>{o.plannedDate}</strong></span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditClick(o)}
                            title="Изменить данные"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(o.id, o.name)}
                            title="Удалить товар"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              
              {/* Aggregation Row */}
              <tfoot>
                <tr className="bg-slate-800 font-bold border-t-2 border-slate-700 text-slate-200">
                  <td colSpan={5} className="p-3 text-right font-black">ИТОГО ПО ФИЛЬТРУ:</td>
                  <td className="p-3 text-center font-black text-sm text-white bg-slate-700">{filteredOrders.reduce((sum, o) => sum + o.quantity, 0)} шт</td>
                  <td className="p-3"></td>
                  <td className="p-3 text-right font-mono text-amber-300">¥ {filteredOrders.reduce((sum, o) => sum + o.itemTotalCny, 0).toFixed(2)}</td>
                  <td className="p-3"></td>
                  <td className="p-3 text-right font-mono text-blue-300 bg-blue-950/40 border-l border-blue-900/40">
                    {(filteredOrders.reduce((sum, o) => sum + (o.priceCny * o.rateCnyByn), 0) / (filteredOrders.length || 1)).toFixed(2)} BYN <span className="text-[8px] font-normal block text-slate-400">(ср.цена)</span>
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-300 bg-emerald-950/10 border-r border-emerald-900/20 text-xs">
                    {(filteredOrders.reduce((sum, o) => sum + o.itemCostByn, 0)).toFixed(2)} BYN
                  </td>
                  <td className="p-3 text-right font-mono text-slate-300">¥ {filteredOrders.reduce((sum, o) => sum + (o.shippingChinaCny || 0), 0).toFixed(2)}</td>
                  <td className="p-3 text-right font-mono text-slate-300">{filteredOrders.reduce((sum, o) => sum + (o.shippingBelarusByn || 0), 0).toFixed(2)} BYN</td>
                  <td className="p-3 text-right font-mono font-black text-indigo-300 bg-indigo-950/40 text-sm">
                    {filteredOrders.reduce((sum, o) => sum + o.totalWithShippingByn, 0).toFixed(2)} BYN
                  </td>
                  <td className="p-3"></td>
                  <td className="p-3 text-center font-mono font-black text-amber-400">
                    {filteredOrders.reduce((sum, o) => sum + (o.weight || 0), 0).toFixed(2)} кг
                  </td>
                  <td colSpan={2} className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* QUICK REFERENCE CARGO EXPLANATION */}
        <div className="bg-slate-800/20 p-5 rounded-3xl border border-slate-700/40 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="space-y-1">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-blue-400">
              <Clock className="w-4 h-4 text-blue-400" />
              1. По Китаю в среднем
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Посылка доставляется на склад консолидации (в Гуанчжоу/Иу) за 3-5 дней. Статус меняется на <strong className="text-amber-400">"На складе в Китае"</strong> после прибытия к вашему перевозчику.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-indigo-400">
              <Truck className="w-4 h-4 text-indigo-400" />
              2. Транзит в Беларусь (РБ)
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Отправка автотранспортом (быстрое карго) занимает 12-18 дней, авиа — 5-7 дней. Статус <strong className="text-indigo-400">"Едет в РБ"</strong>. При поступлении на ПВЗ в Минске статус меняется на <strong className="text-emerald-400">"Прибыло в РБ"</strong>.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-400">
              <Building className="w-4 h-4 text-emerald-400" />
              3. Расчет себестоимости
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Система автоматически рассчитывает <strong className="text-white">Себестоимость 1 ед.</strong> в BYN на основе курса CNY, стоимости доставки по Китаю и международной перевозки в Минск.
            </p>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Карго-Контроль Китая. Все расчеты выполняются в реальном времени. Просто, наглядно, прозрачно.</p>
        </div>
      </footer>

      {/* CREATE & EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-scaleIn">
            
            {/* Modal Header */}
            <div className="bg-slate-800 p-5 border-b border-slate-700/80 flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                {editingOrder ? `Редактирование: ${formData.name}` : "Добавить новый заказ из Китая"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer p-1.5 rounded-lg hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOrder} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Название товара *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Например: Пылесос для автомобиля, Фен черный"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Track Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Трек-номер Китая
                  </label>
                  <input
                    type="text"
                    value={formData.trackNumber}
                    onChange={(e) => setFormData({ ...formData, trackNumber: e.target.value })}
                    placeholder="Например: 4655594672890"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* For Whom */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Для кого (Получатель)
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={formData.forWhom}
                      onChange={(e) => setFormData({ ...formData, forWhom: e.target.value })}
                      placeholder="Например: Родители, Клиент..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setFormData({ ...formData, forWhom: e.target.value });
                        }
                      }}
                      className="px-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs cursor-pointer focus:outline-none"
                    >
                      <option value="">Варианты</option>
                      {FOR_WHOM_PRESETS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Текущий статус
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Ссылка на товар (PinDuoDuo и др)
                  </label>
                  <input
                    type="url"
                    value={formData.itemUrl}
                    onChange={(e) => setFormData({ ...formData, itemUrl: e.target.value })}
                    placeholder="https://mobile.yangkeduo.com/..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Image Upload Block (Base64 compression with Canvas) */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Фотография товара *
                  </label>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                    
                    {/* Live Preview Thumbnail */}
                    <div className="w-20 h-20 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative shadow">
                      {formData.imageUrl ? (
                        <>
                          <img 
                            src={formData.imageUrl} 
                            alt="Загруженное фото" 
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, imageUrl: "" })}
                            className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-xs text-rose-400 font-bold transition-opacity cursor-pointer"
                          >
                            Удалить
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-extrabold text-center px-1 uppercase">
                          Нет фото
                        </span>
                      )}
                    </div>

                    {/* Selector Zone */}
                    <div className="flex-1 space-y-2 w-full">
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const img = new Image();
                              img.onload = () => {
                                // Downscale and compress using canvas to keep database lightweight
                                const canvas = document.createElement("canvas");
                                const MAX_WIDTH = 250;
                                const scale = MAX_WIDTH / img.width;
                                canvas.width = MAX_WIDTH;
                                canvas.height = img.height * scale;

                                const ctx = canvas.getContext("2d");
                                if (ctx) {
                                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                  // Get highly compressed JPEG Base64
                                  const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
                                  setFormData({ ...formData, imageUrl: compressedBase64 });
                                  showAlert("Фото товара успешно сжато и прикреплено!", "success");
                                }
                              };
                              img.src = event.target?.result as string;
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-750 text-slate-300 text-xs font-bold text-center hover:bg-slate-800 hover:text-white transition-all">
                          📎 Выберите файл картинки на устройстве (или снимите на камеру)
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 leading-relaxed">
                        Поддерживаются любые файлы изображений (JPG, PNG, WebP). Система автоматически уменьшит разрешение для быстрой работы на телефонах.
                      </div>
                    </div>
                  </div>

                  {/* Manual URL input fallback just in case they really want to paste links */}
                  <details className="text-slate-500 text-[11px] group cursor-pointer">
                    <summary className="hover:text-slate-300 font-medium select-none">
                      или вставить ссылку на картинку текстом...
                    </summary>
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="Вставьте ссылку на фото, например https://images.unsplash.com/..."
                      className="w-full mt-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </details>
                </div>

                {/* Math variables */}
                <hr className="sm:col-span-2 border-slate-800 my-1" />

                {/* Price per unit (CNY) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Цена за ед. (CNY)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.priceCny}
                    onChange={(e) => setFormData({ ...formData, priceCny: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Количество
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Shipping China (CNY) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Доставка по Китаю (CNY)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.shippingChinaCny}
                    onChange={(e) => setFormData({ ...formData, shippingChinaCny: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Shipping Belarus (BYN) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Доставка в РБ (BYN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.shippingBelarusByn}
                    onChange={(e) => setFormData({ ...formData, shippingBelarusByn: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Rate CNY to BYN */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Курс за 1 CNY (в BYN)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.rateCnyByn}
                    onChange={(e) => setFormData({ ...formData, rateCnyByn: parseFloat(e.target.value) || defaultRate })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Вес товара (кг)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Dates */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Плановая дата получения
                  </label>
                  <input
                    type="date"
                    value={formData.plannedDate}
                    onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Received Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Дата фактического получения
                  </label>
                  <input
                    type="date"
                    value={formData.receivedDate}
                    onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Заметки и комментарии
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Например: Посылка в мешке с наклейкой 'AUTO', договорились на скидку"
                    className="w-full h-16 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  ></textarea>
                </div>

              </div>

              {/* LIVE CALCULATION PREVIEW */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                <div className="font-bold text-white uppercase text-[10px] tracking-wider mb-1 text-blue-400">📊 Предварительный расчет в реальном времени:</div>
                <div className="flex justify-between">
                  <span>Общая стоимость товара (CNY):</span>
                  <span className="font-mono text-white">¥ {(formData.quantity * formData.priceCny).toFixed(2)} CNY</span>
                </div>
                <div className="flex justify-between">
                  <span>Стоимость товара в BYN (по курсу {formData.rateCnyByn}):</span>
                  <span className="font-mono text-white">{(formData.quantity * formData.priceCny * formData.rateCnyByn).toFixed(2)} BYN</span>
                </div>
                <div className="flex justify-between">
                  <span>Доставка по Китаю в BYN:</span>
                  <span className="font-mono text-slate-400">{(formData.shippingChinaCny * formData.rateCnyByn).toFixed(2)} BYN</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                  <span className="text-indigo-300">Итого с доставками в РБ:</span>
                  <span className="font-mono text-indigo-300">
                    {((formData.quantity * formData.priceCny * formData.rateCnyByn) + (formData.shippingChinaCny * formData.rateCnyByn) + Number(formData.shippingBelarusByn)).toFixed(2)} BYN
                  </span>
                </div>
                <div className="flex justify-between font-bold text-emerald-400">
                  <span>Ориентировочная себестоимость за 1 шт:</span>
                  <span className="font-mono">
                    {(((formData.quantity * formData.priceCny * formData.rateCnyByn) + (formData.shippingChinaCny * formData.rateCnyByn) + Number(formData.shippingBelarusByn)) / (formData.quantity || 1)).toFixed(2)} BYN
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold cursor-pointer transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black cursor-pointer shadow transition-all active:scale-95"
                >
                  {editingOrder ? "Сохранить изменения" : "Добавить товар в базу"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT DIALOG MODAL */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl animate-scaleIn">
            
            {/* Header */}
            <div className="bg-slate-800 p-5 border-b border-slate-700/80 flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                Импорт данных из Excel (.xlsx / .xls / .csv)
              </h3>
              <button
                onClick={() => {
                  setIsExcelModalOpen(false);
                  setExcelPreview([]);
                  setExcelRows([]);
                }}
                className="text-slate-400 hover:text-white transition-all cursor-pointer p-1.5 rounded-lg hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Drop/Select Zone */}
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/80 rounded-2xl p-8 text-center bg-slate-950/40 transition-colors">
                <input
                  type="file"
                  ref={excelInputRef}
                  onChange={handleExcelFileUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Перетащите сюда файл таблицы или нажмите для выбора</p>
                    <p className="text-xs text-slate-400 mt-1">Поддерживаются форматы Excel (.xlsx, .xls) и CSV</p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => excelInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    Выбрать файл на диске
                  </button>
                </div>
              </div>

              {/* Sample headers hint */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-xs text-slate-400">
                <span className="font-bold text-white text-[10px] uppercase tracking-wider text-emerald-400 block mb-1">💡 Полезный совет по заголовкам столбцов:</span>
                Приложение автоматически распознает названия столбцов, если они содержат: 
                <strong className="text-slate-300"> «Название товара»</strong>, 
                <strong className="text-slate-300"> «Трек-номер»</strong>, 
                <strong className="text-slate-300"> «Для кого»</strong>, 
                <strong className="text-slate-300"> «Цена за ед.»</strong>, 
                <strong className="text-slate-300"> «Кол-во»</strong>, 
                <strong className="text-slate-300"> «Вес»</strong>, и др. Если столбцы называются иначе, система постарается подобрать совпадения автоматически!
              </div>

              {/* Loader */}
              {excelLoading && (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-sm text-slate-300">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                  <span>Обработка данных... Пожалуйста, подождите</span>
                  {importProgress && (
                    <span className="text-xs font-mono text-emerald-500 font-bold">
                      Выполнено: {importProgress.current} из {importProgress.total} ({Math.round(importProgress.current / importProgress.total * 100)}%)
                    </span>
                  )}
                </div>
              )}

              {/* Parsed Data Preview */}
              {excelPreview.length > 0 && !excelLoading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      🔍 Предварительный просмотр данных ({excelPreview.length} строк найдено):
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">
                      Все готово для записи в базу!
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs bg-slate-950/60">
                      <thead className="bg-slate-900 sticky top-0 text-slate-400 font-bold text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-2">Название товара</th>
                          <th className="p-2">Для кого</th>
                          <th className="p-2">Трек-номер</th>
                          <th className="p-2 text-center">Кол-во</th>
                          <th className="p-2 text-right">Цена (CNY)</th>
                          <th className="p-2 text-right">Вес (кг)</th>
                          <th className="p-2 text-right">Доставка РБ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {excelPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40 text-slate-300">
                            <td className="p-2 font-bold text-white max-w-[150px] truncate">{item.name}</td>
                            <td className="p-2"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">{item.forWhom}</span></td>
                            <td className="p-2 font-mono text-xs">{item.trackNumber || <span className="text-rose-400 italic">нет</span>}</td>
                            <td className="p-2 text-center font-bold text-white">{item.quantity}</td>
                            <td className="p-2 text-right font-mono">¥ {item.priceCny.toFixed(2)}</td>
                            <td className="p-2 text-right font-mono text-amber-400">{item.weight > 0 ? `${item.weight} кг` : "—"}</td>
                            <td className="p-2 text-right font-mono text-slate-400">{item.shippingBelarusByn > 0 ? `${item.shippingBelarusByn} BYN` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-800 p-5 border-t border-slate-700/80 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">
                Загружено строк: {excelRows.length}
              </span>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={excelLoading}
                  onClick={() => {
                    setIsExcelModalOpen(false);
                    setExcelPreview([]);
                    setExcelRows([]);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold cursor-pointer transition-all disabled:opacity-55"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={excelLoading || excelPreview.length === 0}
                  onClick={saveImportedRows}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black cursor-pointer shadow transition-all active:scale-95 disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {importProgress ? (
                    <span>Импорт ({importProgress.current}/{importProgress.total})</span>
                  ) : (
                    <span>ИМПОРТИРОВАТЬ ВСЕ ЗАПИСИ ({excelPreview.length})</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VOICE ASSISTANT MODAL DIALOG */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-scaleIn">
            
            {/* Header */}
            <div className="bg-slate-800 p-5 border-b border-slate-700/80 flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span className="animate-ping w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0"></span>
                Умный голосовой помощник «Карго-Ввод» 🎙️
              </h3>
              <button
                onClick={() => {
                  stopListening();
                  setIsVoiceModalOpen(false);
                }}
                className="text-slate-400 hover:text-white transition-all cursor-pointer p-1.5 rounded-lg hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* Instructions Prompt */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="font-extrabold text-rose-400 text-[11px] uppercase tracking-wider">🗣️ КАК ГОВОРИТЬ (ПРИМЕР):</p>
                <p className="italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-white font-medium leading-relaxed font-mono">
                  «Новый фен две штуки за сорок юаней для родителей трек номер JT551211»
                </p>
                <p className="text-[10px] text-slate-500">
                  Система сама выделит Название, Цену в юанях, Количество, Получателя и Трек-номер из ваших слов!
                </p>
              </div>

              {/* Real-time speech control */}
              <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl text-center space-y-4">
                
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all cursor-pointer shadow-lg outline-none active:scale-95 ${
                      isListening 
                        ? "bg-rose-600 text-white animate-pulse shadow-rose-600/30" 
                        : "bg-slate-800 text-slate-300 hover:bg-slate-750"
                    }`}
                  >
                    <span className="text-3xl">🎙️</span>
                  </button>
                  {isListening && (
                    <span className="absolute -inset-2 rounded-full border-2 border-rose-500 animate-ping opacity-45 pointer-events-none"></span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm">
                    {isListening ? "Слушаю вас... Говорите!" : "Микрофон выключен"}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {isListening ? "Нажмите еще раз для завершения" : "Нажмите круглую кнопку выше, чтобы начать запись"}
                  </p>
                </div>
              </div>

              {/* Text transcript or typing backup */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Распознанный текст (можно редактировать или вставить текстом вручную):
                </label>
                <textarea
                  value={voiceTranscript}
                  onChange={(e) => {
                    setVoiceTranscript(e.target.value);
                    setParsedVoiceData(parseVoiceText(e.target.value));
                  }}
                  placeholder="Здесь появится ваш голос или вставьте сюда текст вручную..."
                  className="w-full h-24 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-rose-500 font-medium leading-relaxed"
                ></textarea>
              </div>

              {/* Parsed live properties */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3">
                <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest">📋 РЕЗУЛЬТАТЫ АВТО-РАСПРЕДЕЛЕНИЯ:</div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Название:</span>
                    <strong className="text-white block mt-0.5">{parsedVoiceData.name || "—"}</strong>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Для кого:</span>
                    <strong className="text-emerald-400 block mt-0.5">{parsedVoiceData.forWhom || "—"}</strong>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Кол-во:</span>
                    <strong className="text-blue-300 block mt-0.5">{parsedVoiceData.quantity} шт</strong>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Цена (CNY):</span>
                    <strong className="text-amber-400 block mt-0.5">¥ {parsedVoiceData.priceCny.toFixed(2)}</strong>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 col-span-2">
                    <span className="text-slate-500 block text-[10px]">Трек-номер Китая:</span>
                    <strong className="text-white block mt-0.5 font-mono text-sm tracking-wider">
                      {parsedVoiceData.trackNumber || <span className="text-rose-400 italic font-sans text-xs">не найден</span>}
                    </strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="bg-slate-800 p-5 border-t border-slate-700/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setIsVoiceModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold cursor-pointer transition-all"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={applyVoiceDataToForm}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs sm:text-sm font-black cursor-pointer shadow transition-all active:scale-95"
              >
                ПЕРЕНЕСТИ В ФОРМУ ДОБАВЛЕНИЯ →
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
