"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import MobileOrderCards from "./mobile-order-cards";
import BarcodeScanner from "./barcode-scanner";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
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
  Loader2,
  MoreVertical,
  Download,
  Camera
} from "lucide-react";

interface Order {
  id: number;
  projectId: number;
  name: string;
  imageUrl: string | null;
  itemUrl: string | null;
  forWhom: string | null;
  trackNumber: string | null;
  status: string;
  quantity: number;
  priceCny: number;
  shippingChinaCny: number | null;
  shippingChinaUsd: number | null;
  shippingBelarusByn: number | null;
  rateCnyByn: number;
  weight: number | null;
  plannedDate: string | null;
  receivedDate: string | null;
  notes: string | null;
  createdAt: string;
}


interface Project {
  id: number;
  name: string;
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
        bg: "bg-blue-600 text-white border-blue-300",
        bgHover: "hover:bg-blue-500",
        dot: "bg-blue-500",
        rowBg: "bg-blue-50/20",
        colorText: "text-blue-800"
      };
    case "На складе в Китае":
      return {
        bg: "bg-orange-500 text-white border-orange-300",
        bgHover: "hover:bg-orange-400",
        dot: "bg-amber-500",
        rowBg: "bg-amber-50/20",
        colorText: "text-amber-900"
      };
    case "Едет в РБ":
      return {
        bg: "bg-violet-600 text-white border-violet-300",
        bgHover: "hover:bg-violet-500",
        dot: "bg-indigo-500",
        rowBg: "bg-indigo-50/20",
        colorText: "text-indigo-800"
      };
    case "Прибыло в РБ":
      return {
        bg: "bg-emerald-600 text-white border-emerald-300",
        bgHover: "hover:bg-emerald-500",
        dot: "bg-emerald-500",
        rowBg: "bg-emerald-50/25",
        colorText: "text-emerald-800"
      };
    case "Выдано / Получено":
      return {
        bg: "bg-slate-600 text-white border-slate-300",
        bgHover: "hover:bg-slate-500",
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportRecipient, setExportRecipient] = useState("Все");
  const [people, setPeople] = useState<string[]>(FOR_WHOM_PRESETS);
  const [isPeopleModalOpen, setIsPeopleModalOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [localScannerOpen, setLocalScannerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Все");
  const [forWhomFilter, setForWhomFilter] = useState("Все");
  const [copiedTrack, setCopiedTrack] = useState<string | null>(null);

  // New tab state to segment active collections vs archives
  const [activeTab, setActiveTab] = useState<"active" | "archived" | "all">("active");
  // Month selector filter
  const [monthFilter, setMonthFilter] = useState<string>("Все");

  // Dashboard boxes customizable layout state
  const [dashboardWidgets, setDashboardWidgets] = useState<Array<{ id: string; title: string; visible: boolean; order: number; bgClass: string; content?: string }>>([
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

  const addDashboardWidget = () => {
    const title = prompt("Название нового блока:", "Мой блок");
    if (!title?.trim()) return;
    const content = prompt("Текст внутри блока:", "Введите свою заметку или правило");
    const maxOrder = dashboardWidgets.reduce((m, w) => Math.max(m, w.order), 0);
    const widget = { id: `custom_${Date.now()}`, title: title.trim(), visible: true, order: maxOrder + 1, bgClass: "bg-slate-800/60", content: content || "" };
    saveWidgetsLayout([...dashboardWidgets, widget]);
    showAlert("Новый блок добавлен", "success");
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
      const res = await fetch(`/api/orders?projectId=${currentProjectId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showAlert("Текущий проект очищен! Нажмите 'Обновить' или добавьте новые товары.", "success");
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
  const [moveTargetProjectId, setMoveTargetProjectId] = useState<number | "">("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Default parameters for new orders
  const [defaultRate, setDefaultRate] = useState<number>(0.4800);
  const [cargoShippingUsdPerKg, setCargoShippingUsdPerKg] = useState<number>(5.5);
  const [usdBynRate, setUsdBynRate] = useState<number>(3.25);
  const [previewImage, setPreviewImage] = useState<{src:string; name:string} | null>(null);
  const [excelImages, setExcelImages] = useState<Record<string,string>>({});
  const [excelImagesByTrack, setExcelImagesByTrack] = useState<Record<string,string>>({});
  const [excelImagesByName, setExcelImagesByName] = useState<Record<string,string>>({});

  const normalizeTrack = (value: string | null | undefined) =>
    String(value || "").toUpperCase().replace(/[^A-ZА-Я0-9]/g, "");

  const normalizeName = (value: string | null | undefined) =>
    String(value || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ").trim();

  useEffect(() => {
    fetch("/china-images-map.json", { cache: "force-cache" })
      .then(r => r.ok ? r.json() : [])
      .then((items: Array<{name:string;track:string|null;data:string}>) => {
        const exactMap: Record<string,string> = {};
        const trackMap: Record<string,string> = {};
        const nameMap: Record<string,string> = {};
        for (const item of items) {
          if (!item.data) continue;
          exactMap[`${item.track || ""}|${item.name || ""}`] = item.data;
          const track = normalizeTrack(item.track);
          const name = normalizeName(item.name);
          if (track) trackMap[track] = item.data;
          if (name) nameMap[name] = item.data;
        }
        setExcelImages(exactMap);
        setExcelImagesByTrack(trackMap);
        setExcelImagesByName(nameMap);
      })
      .catch(() => {});
  }, []);

  const getEmbeddedImage = (o: Order) => {
    const track = normalizeTrack(o.trackNumber);
    const name = normalizeName(o.name);
    if (track && excelImagesByTrack[track]) return excelImagesByTrack[track];
    const exact = excelImages[`${o.trackNumber || ""}|${o.name || ""}`];
    if (exact) return exact;
    if (name && excelImagesByName[name]) return excelImagesByName[name];
    return null;
  };

  // Form State
  const [formData, setFormData] = useState<any>({
    name: "",
    imageUrl: "",
    itemUrl: "",
    forWhom: "Родители",
    trackNumber: "",
    status: "В пути на склад Китая",
    quantity: "",
    priceCny: "",
    shippingChinaCny: "",
    shippingBelarusByn: "",
    rateCnyByn: 0.4800,
    weight: "",
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
    name: "Новый товар", priceCny: 0, quantity: 1, forWhom: "Родители",
    trackNumber: "", weight: 0, shippingChinaCny: 0, shippingBelarusByn: 0, itemUrl: ""
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

  // Deterministic Russian speech parser. Only fills fields when an explicit marker/value is present.
  const parseVoiceText = (text: string) => {
    const original = text.replace(/\s+/g, " ").trim();
    const lower = original.toLowerCase();
    const numberWords: Record<string, number> = {
      "ноль":0,"один":1,"одна":1,"одно":1,"одну":1,"два":2,"две":2,"три":3,"четыре":4,"пять":5,
      "шесть":6,"семь":7,"восемь":8,"девять":9,"десять":10,"одиннадцать":11,"двенадцать":12,
      "полтора":1.5,"полторы":1.5,"трёх":3,"трех":3,"четырёх":4,"четырех":4,"пяти":5,"двух":2
    };
    const numberPattern = "(\d+(?:[.,]\d+)?|" + Object.keys(numberWords).join("|") + ")";
    const toNumber = (raw?: string) => raw ? (numberWords[raw.toLowerCase()] ?? Number(raw.replace(",", "."))) : 0;
    const matchNumber = (rx: RegExp) => { const m=lower.match(rx); return m ? toNumber(m[1]) : 0; };

    let priceCny = matchNumber(new RegExp("(?:цена|стоимость|по цене)\s*(?:за штуку|за единицу)?\s*" + numberPattern + "\s*(?:юан(?:ей|я|и|ь)?|юэн(?:ей|я|и|ь)?|cny|yuan)?", "i"));
    if (!priceCny) priceCny = matchNumber(new RegExp("(\d+(?:[.,]\d+)?)\s*(?:юан(?:ей|я|и|ь)?|юэн(?:ей|я|и|ь)?|cny|yuan)\b", "i"));

    const quantity = matchNumber(new RegExp("(?:количество|кол-во|в количестве|штук|\bшт\.?\s*)\s*" + numberPattern + "|(" + numberPattern + ")\s*(?:шт\.?|штук(?:и)?|единиц(?:ы)?)", "i")) || 1;
    const weight = matchNumber(new RegExp("(?:вес|весит)\s*(?:" + numberPattern + ")\s*(?:кг|килограмм(?:а|ов)?|kg)?", "i"));
    const shippingChinaCny = matchNumber(new RegExp("(?:доставка по Китаю|доставка в Китае|доставка Китай|доставка внутри Китая)\s*(?:около|примерно)?\s*" + numberPattern + "\s*(?:юан(?:ей|я|и|ь)?|cny)?", "i"));
    const shippingBelarusByn = matchNumber(new RegExp("(?:доставка в Беларусь|доставка по Беларуси|доставка РБ|доставка в РБ)\s*(?:около|примерно)?\s*" + numberPattern + "\s*(?:byn|бел(?:орусских)? руб(?:лей|ля)?|руб(?:лей|ля)?)?", "i"));

    let trackNumber = "";
    const track = original.match(/(?:трек(?:-номер)?|номер отслеживания|трек)\s*[:№#-]?\s*([a-zа-я0-9]{6,30})/i)
      || original.match(/\b([A-Z]{2}\d{8,22}[A-Z]{0,2})\b/i);
    if (track) trackNumber = track[1].toUpperCase();

    let forWhom = "Родители";
    const recipientRules: Array<[RegExp,string]> = [
      [/(?:для\s+)?родител(?:ей|ям|и)\b/i,"Родители"],[/(?:для\s+)?себя\b/i,"Себе"],
      [/(?:для\s+)?клиент(?:а|у)?\b/i,"Клиент"],[/(?:для\s+)?друз(?:ей|ьям)\b/i,"Друзьям"],
      [/(?:на\s+)?подарок\b/i,"Подарок"],[/(?:в\s+)?продаж(?:у|а|е)?\b/i,"В продажу"]
    ];
    for (const [rx,value] of recipientRules) if (rx.test(lower)) { forWhom=value; break; }
    const customRecipient=original.match(/(?:для|кому|получатель)\s+([А-ЯЁA-Z][а-яёa-z-]+)/i);
    if (customRecipient && !recipientRules.some(([rx])=>rx.test(lower))) forWhom=customRecipient[1];

    const urlMatch=original.match(/https?:\/\/[^\s]+/i);
    let productPart=original;
    const markers=/(?:для\s+(?:родител|себя|клиент|друз)|кому\s+|получатель\s+|в количестве|количество|кол-во|цена|стоимость|по цене|вес(?:ит)?|доставка по Китаю|доставка в Китае|доставка Китай|доставка внутри Китая|доставка в Беларусь|доставка по Беларуси|доставка РБ|доставка в РБ|трек(?:-номер)?|номер отслеживания|https?:\/\/)/i;
    const marker=productPart.match(markers);
    if(marker?.index!==undefined) productPart=productPart.slice(0,marker.index);
    productPart=productPart
      .replace(/\b(?:добавь|добавить|создай|создать|запиши|записать|новый|новая|новое|товар|купил|купить|мне|пожалуйста|давай|нужно|нужен|нужна)\b/gi," ")
      .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g,"").replace(/\s+/g," ").trim();
    const name=productPart ? productPart.charAt(0).toUpperCase()+productPart.slice(1) : "Новый товар";
    return {name,priceCny,quantity,forWhom,trackNumber,weight,shippingChinaCny,shippingBelarusByn,itemUrl:urlMatch?.[0]||""};
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
      itemUrl: parsedVoiceData.itemUrl || "",
      forWhom: parsedVoiceData.forWhom,
      trackNumber: parsedVoiceData.trackNumber,
      status: "В пути на склад Китая",
      quantity: parsedVoiceData.quantity || 1,
      priceCny: parsedVoiceData.priceCny || 0,
      shippingChinaCny: parsedVoiceData.shippingChinaCny || 0,
      shippingBelarusByn: parsedVoiceData.shippingBelarusByn || 0,
      rateCnyByn: defaultRate,
      weight: parsedVoiceData.weight || 0,
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
          body: JSON.stringify({ ...item, projectId: currentProjectId })
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

  // People directory is stored separately for each project so different projects can have different recipients.
  const peopleStorageKey = (projectId: number) => `cargo_people_${projectId}`;

  const loadPeople = (projectId: number) => {
    try {
      const saved = localStorage.getItem(peopleStorageKey(projectId));
      const savedPeople = saved ? JSON.parse(saved) : [];
      const merged = Array.from(new Set([...FOR_WHOM_PRESETS, ...(Array.isArray(savedPeople) ? savedPeople : [])]));
      setPeople(merged);
    } catch {
      setPeople([...FOR_WHOM_PRESETS]);
    }
  };

  const persistPeople = (next: string[]) => {
    const clean = Array.from(new Set(next.map(x => x.trim()).filter(Boolean)));
    setPeople(clean);
    localStorage.setItem(peopleStorageKey(currentProjectId), JSON.stringify(clean));
  };

  const addPerson = () => {
    const name = newPersonName.trim();
    if (!name) return;
    if (people.some(p => p.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      showAlert("Такой человек уже есть в списке", "info");
      return;
    }
    persistPeople([...people, name]);
    setNewPersonName("");
    showAlert(`Добавлен получатель «${name}»`, "success");
  };

  const removePerson = (name: string) => {
    if (FOR_WHOM_PRESETS.includes(name)) {
      showAlert("Базовых получателей удалить нельзя, но их можно не использовать", "info");
      return;
    }
    persistPeople(people.filter(p => p !== name));
    if (exportRecipient === name) setExportRecipient("Все");
    if (forWhomFilter === name) setForWhomFilter("Все");
  };

  const renamePerson = (oldName: string) => {
    const name = prompt("Новое имя получателя:", oldName)?.trim();
    if (!name || name === oldName) return;
    if (people.some(p => p.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      showAlert("Такой человек уже есть", "info");
      return;
    }
    persistPeople(people.map(p => p === oldName ? name : p));
    // Keep existing orders consistent when a person is renamed.
    const affected = orders.filter(o => o.forWhom === oldName);
    if (affected.length) {
      Promise.all(affected.map(o => fetch(`/api/orders/${o.id}`, {
        method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ forWhom: name, projectId: currentProjectId })
      }))).then(() => loadOrders(currentProjectId));
    }
    showAlert(`Получатель «${oldName}» переименован`, "success");
  };

  // Projects + orders
  const loadProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setProjects(json.data);
      const saved = Number(localStorage.getItem("cargo_current_project") || json.data[0]?.id || 1);
      const valid = json.data.some((p: Project) => p.id === saved) ? saved : json.data[0]?.id || 1;
      setCurrentProjectId(valid);
      loadPeople(valid);
      return valid;
    } catch (err:any) {
      showAlert("Не удалось загрузить проекты: " + err.message, "error");
      return 1;
    }
  };

  const loadOrders = async (projectId = currentProjectId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders?projectId=${projectId}`);
      const json = await res.json();
      if (json.success) { setOrders(json.data); setSelectedOrderIds([]); }
      else showAlert("Ошибка при загрузке данных: " + json.error, "error");
    } catch (err: any) { showAlert("Не удалось подключиться к серверу", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadProjects().then((pid) => loadOrders(pid));
  }, []);

  const switchProject = async (pid:number) => {
    setCurrentProjectId(pid);
    localStorage.setItem("cargo_current_project", String(pid));
    loadPeople(pid);
    setSearchQuery(""); setStatusFilter("Все"); setForWhomFilter("Все"); setMonthFilter("Все");
    await loadOrders(pid);
  };

  const createProject = async () => {
    const name = prompt("Название нового проекта:", "Китай — новый проект");
    if (!name?.trim()) return;
    const res = await fetch("/api/projects", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name})});
    const json = await res.json();
    if (json.success) { setProjects(prev=>[...prev,json.data]); await switchProject(json.data.id); showAlert("Новый проект создан", "success"); }
    else showAlert(json.error || "Не удалось создать проект", "error");
  };

  const renameCurrentProject = async () => {
    const current = projects.find(p=>p.id===currentProjectId);
    if (!current) return;
    const name = prompt("Новое название проекта:", current.name);
    if (!name?.trim()) return;
    const res=await fetch("/api/projects",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:currentProjectId,name})});
    const json=await res.json();
    if(json.success){setProjects(prev=>prev.map(p=>p.id===currentProjectId?json.data:p));showAlert("Проект переименован","success");} else showAlert(json.error,"error");
  };

  const deleteCurrentProject = async () => {
    if(projects.length<=1){showAlert("Нельзя удалить последний проект","info");return;}
    const current=projects.find(p=>p.id===currentProjectId);
    if(!current || !confirm(`Удалить проект «${current.name}» вместе со всеми его товарами?`)) return;
    const res=await fetch("/api/projects",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:currentProjectId})});
    const json=await res.json();
    if(json.success){const rest=projects.filter(p=>p.id!==currentProjectId);setProjects(rest);await switchProject(rest[0].id);showAlert("Проект удалён","info");}else showAlert(json.error,"error");
  };

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
      quantity: "",
      priceCny: "",
      shippingChinaCny: "",
      shippingBelarusByn: "",
      rateCnyByn: defaultRate,
      weight: "",
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
        projectId: currentProjectId,
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
      // One global CNY rate and one global cargo tariff drive the live calculation.
      const rate = defaultRate > 0 ? defaultRate : 0.48;
      const shipBelarusByn = o.shippingBelarusByn || 0;
      const weight = o.weight || 0;
      const shippingUsd = weight * cargoShippingUsdPerKg;
      const shippingChinaByn = shippingUsd * usdBynRate;

      const itemTotalCny = qty * priceCny;
      const itemCostByn = itemTotalCny * rate;
      const totalWithShippingByn = itemCostByn + shippingChinaByn + shipBelarusByn;
      const unitCostByn = totalWithShippingByn / qty;

      return { ...o, itemTotalCny, itemCostByn, shippingChinaByn, shippingUsd, totalWithShippingByn, unitCostByn };
    });
  }, [orders, defaultRate, cargoShippingUsdPerKg, usdBynRate]);

  // Unique "Для кого" list for filter dropdown
  const uniqueForWhomOptions = useMemo(() => {
    const set = new Set<string>(people);
    orders.forEach(o => {
      if (o.forWhom) set.add(o.forWhom);
    });
    return Array.from(set);
  }, [orders, people]);

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
      const searchLower = searchQuery.toLowerCase().trim();
      const normalizedSearch = normalizeTrack(searchQuery);
      const matchesSearch = !searchLower ||
        o.name.toLowerCase().includes(searchLower) ||
        (o.trackNumber || "").toLowerCase().includes(searchLower) ||
        (!!normalizedSearch && normalizeTrack(o.trackNumber).includes(normalizedSearch)) ||
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

  // Open a globally searched product directly in its row after switching projects.
  useEffect(() => {
    if (loading || orders.length === 0) return;
    const rawId = localStorage.getItem("cargo_focus_order_id");
    if (!rawId) return;
    const target = orders.find(order => order.id === Number(rawId));
    if (!target) return;
    setActiveTab("all");
    setStatusFilter("Все");
    setForWhomFilter("Все");
    setMonthFilter("Все");
    setSearchQuery(target.trackNumber || target.name);
  }, [loading, orders]);

  useEffect(() => {
    if (loading || !searchQuery.trim()) return;
    const rawId = localStorage.getItem("cargo_focus_order_id");
    if (!rawId) return;
    const target = sortedOrders.find(order => order.id === Number(rawId));
    if (!target) return;
    const timer = window.setTimeout(() => {
      const row = document.querySelector('tr[data-order-id="' + target.id + '"]');
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
      row?.classList.add("global-search-target");
      localStorage.removeItem("cargo_focus_order_id");
      window.setTimeout(() => row?.classList.remove("global-search-target"), 3200);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [loading, searchQuery, sortedOrders]);
  // Row selection + export
  const toggleOrderSelection = (id:number) => setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
  const allVisibleSelected = sortedOrders.length > 0 && sortedOrders.every(o=>selectedOrderIds.includes(o.id));
  const toggleSelectAllVisible = () => {
    const ids=sortedOrders.map(o=>o.id);
    setSelectedOrderIds(prev => allVisibleSelected ? prev.filter(id=>!ids.includes(id)) : Array.from(new Set([...prev,...ids])));
  };
  const clearSelection = () => setSelectedOrderIds([]);

  const exportOrders = async (mode:"all"|"filtered"|"selected"|"recipient"|"tracks", withImages = false) => {
    try {
      let rows = mode === "all"
        ? calculatedOrders
        : mode === "selected"
        ? calculatedOrders.filter(o=>selectedOrderIds.includes(o.id))
        : mode === "recipient"
        ? calculatedOrders.filter(o=>exportRecipient === "Все" || o.forWhom === exportRecipient)
        : mode === "tracks"
        ? calculatedOrders.filter(o=>o.trackNumber)
        : sortedOrders;

      if (!rows.length) {
        showAlert("Нет данных для выгрузки", "info");
        return;
      }

      const project = projects.find(p=>p.id===currentProjectId)?.name || "проект";
      const safe = project.replace(/[^a-zа-яё0-9_-]+/gi,"_");

      if (withImages) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Китай → Беларусь";
        const sheet = workbook.addWorksheet("Заказы");
        sheet.columns = [
          {header:"Фото", key:"image", width:14},
          {header:"Название", key:"name", width:32},
          {header:"Для кого", key:"forWhom", width:18},
          {header:"Трек-номер", key:"track", width:22},
          {header:"Статус", key:"status", width:25},
          {header:"Количество", key:"quantity", width:12},
          {header:"Цена CNY", key:"priceCny", width:14},
          {header:"Общая CNY", key:"totalCny", width:15},
          {header:"Доставка Китай CNY", key:"shippingChinaCny", width:20},
          {header:"Доставка РБ BYN", key:"shippingBelarusByn", width:18},
          {header:"Итого BYN", key:"totalByn", width:16},
          {header:"Вес кг", key:"weight", width:12},
          {header:"Дата", key:"date", width:18},
        ];
        const exportHeaders = ["Фото","Название","Для кого","Трек-номер","Статус","Количество","Цена CNY","Общая CNY","Доставка Китай CNY","Доставка РБ BYN","Итого BYN","Вес кг","Дата"];
        exportHeaders.forEach((header, index) => { sheet.getCell(1, index + 1).value = header; });
        sheet.getRow(1).font = {bold:true,color:{argb:"FFFFFFFF"}};
        sheet.getRow(1).height = 28;
        sheet.views = [{state:"frozen", ySplit:1}];
        sheet.autoFilter = {from:"A1",to:"M1"};

        const toDataUrl = async (src:string) => {
          if (src.startsWith("data:")) return src;
          const response = await fetch(src);
          if (!response.ok) throw new Error("image fetch failed");
          const blob = await response.blob();
          return await new Promise<string>((resolve,reject)=>{
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        };

        for (const o of rows) {
          const row = sheet.addRow({
            image:"",
            name:o.name,
            forWhom:o.forWhom||"",
            track:o.trackNumber||"",
            status:o.status,
            quantity:o.quantity,
            priceCny:o.priceCny,
            totalCny:o.itemTotalCny,
            shippingChinaCny:o.shippingChinaCny||0,
            shippingBelarusByn:o.shippingBelarusByn||0,
            totalByn:o.totalWithShippingByn,
            weight:o.weight||0,
            date:o.createdAt
          });
          row.height = 64;
          const image = o.imageUrl || getEmbeddedImage(o);
          if (image) {
            try {
              const dataUrl = await toDataUrl(image);
              const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i);
              if (match) {
                const extension = match[1].toLowerCase()==="jpg" ? "jpeg" : match[1].toLowerCase();
                const imageId = workbook.addImage({base64:dataUrl, extension: extension as any});
                sheet.addImage(imageId, {tl:{col:0,row:row.number-1},ext:{width:72,height:72}});
              }
            } catch {
              row.getCell(1).value = "Фото недоступно";
            }
          }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href=url;
        link.download=`cargo_${safe}_${mode}_с_картинками_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1500);
      } else {
        const data = mode === "tracks"
          ? rows.map(o=>({"Трек-номер":o.trackNumber || ""}))
          : rows.map(o=>({
              "Название":o.name,
              "Для кого":o.forWhom||"",
              "Трек-номер":o.trackNumber||"",
              "Статус":o.status,
              "Количество":o.quantity,
              "Цена CNY":o.priceCny,
              "Общая CNY":o.itemTotalCny,
              "Доставка Китай CNY":o.shippingChinaCny||0,
              "Доставка РБ BYN":o.shippingBelarusByn||0,
              "Итого BYN":o.totalWithShippingByn,
              "Вес кг":o.weight||0,
              "Дата":o.createdAt
            }));
        const exportHeaders = mode === "tracks"
          ? ["Трек-номер"]
          : ["Название","Для кого","Трек-номер","Статус","Количество","Цена CNY","Общая CNY","Доставка Китай CNY","Доставка РБ BYN","Итого BYN","Вес кг","Дата"];
        const exportRows = data.map((item:any) => exportHeaders.map(header => item[header] ?? ""));
        const sheet = XLSX.utils.aoa_to_sheet([exportHeaders, ...exportRows]);
        sheet["!cols"] = exportHeaders.map((header) => ({ wch: Math.max(14, Math.min(30, header.length + 4)) }));
        sheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(exportHeaders.length - 1)}1` };
        sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, "Заказы");
        const arrayBuffer = XLSX.write(book, {bookType:"xlsx", type:"array"});
        const blob = new Blob([arrayBuffer], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href=url;
        link.download=`cargo_${safe}_${mode}_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1500);
      }

      setIsExportMenuOpen(false);
      showAlert(`Файл Excel готов: ${rows.length} позиций${withImages ? " с картинками" : ""}`, "success");
    } catch (e:any) {
      console.error("Export error", e);
      showAlert("Не удалось создать Excel-файл: " + (e?.message || "неизвестная ошибка"), "error");
    }
  };

  const bulkUpdateSelectedStatus = async () => {
    if(selectedOrderIds.length===0){showAlert("Сначала выберите товары","info");return;}
    if(!confirm(`Изменить статус у ${selectedOrderIds.length} товаров на «${batchTargetStatus}»?`)) return;
    setIsBatchUpdating(true);
    try {
      const res=await fetch("/api/orders/batch-status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderIds:selectedOrderIds,targetStatus:batchTargetStatus,projectId:currentProjectId})});
      const json=await res.json();
      if(json.success){await loadOrders(currentProjectId);showAlert(`Статус изменён у ${json.updatedCount} товаров`,"success");} else showAlert(json.error,"error");
    } catch(e:any){showAlert(e.message||"Ошибка массовой смены статуса","error");}
    finally{setIsBatchUpdating(false);}
  };

  const moveSelectedToProject = async () => {
    if (selectedOrderIds.length === 0) {
      showAlert("Сначала выберите товары", "info");
      return;
    }
    const targetId = Number(moveTargetProjectId);
    if (!targetId || targetId === currentProjectId) {
      showAlert("Выберите другой проект", "info");
      return;
    }
    const target = projects.find(p => p.id === targetId);
    if (!target) {
      showAlert("Проект назначения не найден", "error");
      return;
    }
    if (!confirm(`Перенести ${selectedOrderIds.length} товаров в проект «${target.name}»?`)) return;

    try {
      setIsBatchUpdating(true);
      const res = await fetch("/api/orders/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          fromProjectId: currentProjectId,
          toProjectId: targetId
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Не удалось перенести товары");

      const moved = Number(json.movedCount || 0);
      setOrders(prev => prev.filter(o => !selectedOrderIds.includes(o.id)));
      setSelectedOrderIds([]);
      setMoveTargetProjectId("");
      showAlert(`Перенесено товаров: ${moved}`, "success");
    } catch (e: any) {
      showAlert(e?.message || "Не удалось перенести товары", "error");
    } finally {
      setIsBatchUpdating(false);
    }
  };

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

  const updateInlineOrderField = async (orderId: number, field: string, rawValue: string) => {
    const numericFields = new Set(["quantity","priceCny","weight","shippingBelarusByn","shippingChinaUsd","rateCnyByn"]);
    const value = numericFields.has(field) ? Number(String(rawValue).replace(",", ".")) : rawValue;
    if (numericFields.has(field) && !Number.isFinite(value)) return;

    // React state is the source for the live calculation. Never reload the row after blur.
    setOrders(prev => prev.map(o => o.id === orderId ? ({ ...o, [field]: value } as Order) : o));

    try {
      const res = await fetch("/api/orders/inline", {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({id: orderId, field, value})
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Ошибка сохранения");
      if (json.data) {
        setOrders(prev => prev.map(o => o.id === orderId ? ({...o, ...json.data} as Order) : o));
      }
    } catch (e) {
      // Keep the live calculation intact. A failed save must not blank/crash the table.
      console.error("Inline save failed", e);
      showAlert("Изменение показано, но не удалось сохранить в базе", "error");
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

            {/* Курс вынесен в Центр управления */}
          </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 flex flex-wrap items-center gap-2 shadow-lg">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-1">📁 Проект:</span>
          <select value={currentProjectId} onChange={e=>switchProject(Number(e.target.value))} className="min-w-[230px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:border-blue-500">
            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={createProject} className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black">+ Новый проект</button>
          <button onClick={renameCurrentProject} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold">Переименовать</button>
          <button onClick={deleteCurrentProject} className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold">Удалить проект</button>
          <button onClick={()=>setIsPeopleModalOpen(true)} className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold">👥 Люди</button>
          <div className="ml-auto text-xs text-slate-400">Товаров в проекте: <b className="text-white">{orders.length}</b></div>
        </div>
        
        {localScannerOpen && <BarcodeScanner onDetected={(value) => { setSearchQuery(value); setLocalScannerOpen(false); }} onClose={() => setLocalScannerOpen(false)} />}

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
            <div className="flex items-center gap-2">
              <button onClick={addDashboardWidget} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all text-[11px] cursor-pointer">
                + Добавить блок
              </button>
              <button
                onClick={resetWidgetsLayout}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all text-[11px] cursor-pointer"
              >
                Сбросить расположение окон
              </button>
            </div>
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

              if (widget.id.startsWith("custom_")) {
                return (
                  <div key={widget.id} className={`${widget.bgClass} p-4 rounded-2xl border border-slate-700/40 relative`}>
                    <div className="absolute top-2 right-2 z-10">{renderControls()}</div>
                    <h3 className="text-sm font-bold text-white mb-2 mr-28">{widget.title}</h3>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{widget.content || ""}</p>
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

                  <div className="relative">
                    <button onClick={()=>setIsExportMenuOpen(v=>!v)} className="p-3 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-white transition-all text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer">
                      <Download className="w-4 h-4 text-blue-400" /><span>Экспорт</span>
                    </button>
                    {isExportMenuOpen && (
                      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"><div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 text-slate-800"><div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4"><div><h3 className="text-base font-extrabold text-slate-900">Центр экспорта данных и фото</h3><p className="text-xs text-slate-500 mt-1">Выберите состав выгрузки. Для таблицы с фотографиями используйте Excel.</p></div><button type="button" onClick={()=>setIsExportMenuOpen(false)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">✕</button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button onClick={()=>exportOrders("all")} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800 text-sm text-white">📦 Весь проект</button>
                        <button onClick={()=>exportOrders("all", true)} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800 text-sm text-emerald-300 font-bold">🖼️ Весь проект + картинки</button>
                        <button onClick={()=>exportOrders("filtered", true)} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800 text-sm text-emerald-300 font-bold">🔎 Текущий фильтр</button>
                        <button onClick={()=>exportOrders("selected", true)} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800 text-sm text-emerald-300 font-bold">☑ Только выбранные</button>
                        <div className="p-2">
                          <select value={exportRecipient} onChange={e=>setExportRecipient(e.target.value)} className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs">
                            <option value="Все">Все получатели</option>
                            {uniqueForWhomOptions.map(x=><option key={x}>{x}</option>)}
                          </select>
                          <button onClick={()=>exportOrders("recipient", true)} className="w-full mt-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold">Экспорт по получателю</button>
                        </div>
                        <button onClick={()=>exportOrders("tracks", true)} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800 text-sm text-emerald-300 font-bold">🔢 Только трек-номера</button>
                      </div></div></div>
                    )}
                  </div>
                </div>

                {/* GLOBAL DATA RESET BUTTON */}
                <button
                  onClick={resetAllOrdersInDatabase}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-400 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-red-900/60 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                  <span>🚨 СБРОСИТЬ ВСЕ ТОВАРЫ (ОЧИСТИТЬ)</span>
                </button>
                <div className="mt-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-700/70">
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-wider mb-2">⚙️ Курсы и тариф карго</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <label className="min-w-0 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700">
                      <span className="block text-[9px] font-bold text-slate-400 mb-1">CNY → BYN</span>
                      <input type="number" min="0.0001" step="0.0001" value={defaultRate} onChange={e=>applyCnyRateLive(e.target.value)} onBlur={e=>persistCnyRate(e.target.value)} className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-right text-xs font-black text-emerald-300 focus:outline-none focus:border-emerald-500" />
                    </label>
                    <label className="min-w-0 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700">
                      <span className="block text-[9px] font-bold text-slate-400 mb-1">Карго $/кг</span>
                      <input type="number" min="0.01" step="0.1" value={cargoShippingUsdPerKg} onChange={e=>saveCargoRates(Number(e.target.value), usdBynRate)} className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-right text-xs font-black text-orange-300 focus:outline-none focus:border-orange-500" />
                    </label>
                    <label className="min-w-0 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700">
                      <span className="block text-[9px] font-bold text-slate-400 mb-1">USD → BYN</span>
                      <input type="number" min="0.01" step="0.01" value={usdBynRate} onChange={e=>saveCargoRates(cargoShippingUsdPerKg, Number(e.target.value))} className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-right text-xs font-black text-blue-300 focus:outline-none focus:border-blue-500" />
                    </label>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Доставка из Китая (по весу):</span>
                    <span className="font-black text-orange-400">$ {calculatedOrders.reduce((sum,o)=>sum+(o.shippingUsd||0),0).toFixed(2)}</span>
                  </div>
                </div>
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
                className="w-full pl-10 pr-24 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:border-blue-500 focus:outline-none placeholder-slate-500 text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-slate-800 px-1.5 py-0.5 rounded"
                >
                  очистить
                </button>
              )}
              <button type="button" onClick={() => setLocalScannerOpen(true)} title="Сканировать штрих-код" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white">
                <Camera className="w-4 h-4"/>
              </button>
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

        {selectedOrderIds.length > 0 && (
          <div className="sticky top-20 z-20 bg-blue-950/95 backdrop-blur border border-blue-700/60 rounded-2xl p-3 flex flex-wrap items-center gap-3 shadow-2xl">
            <span className="text-sm font-black text-white">☑ Выбрано: {selectedOrderIds.length}</span>
            <select value={batchTargetStatus} onChange={e=>setBatchTargetStatus(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm">
              {STATUS_OPTIONS.map(st=><option key={st}>{st}</option>)}
            </select>
            <button onClick={bulkUpdateSelectedStatus} disabled={isBatchUpdating} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black">{isBatchUpdating?"Сохраняю…":"Изменить статус выбранных"}</button>
            <div className="flex items-center gap-2">
              <select
                value={moveTargetProjectId}
                onChange={e=>setMoveTargetProjectId(e.target.value ? Number(e.target.value) : "")}
                disabled={isBatchUpdating || projects.length < 2}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold"
                title="Проект назначения"
              >
                <option value="">Перенести в проект…</option>
                {projects.filter(p=>p.id!==currentProjectId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button
                onClick={moveSelectedToProject}
                disabled={isBatchUpdating || !moveTargetProjectId}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-black"
              >
                Перенести
              </button>
            </div>
            <button onClick={()=>exportOrders("selected", true)} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold">Экспорт выбранных + фото</button>
            <button onClick={clearSelection} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm">Снять выбор</button>
          </div>
        )}

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
          <>
            <div className="mobile-orders-only">
            <MobileOrderCards
              orders={sortedOrders}
              defaultRate={defaultRate}
              cargoShippingUsdPerKg={cargoShippingUsdPerKg}
              selectedOrderIds={selectedOrderIds}
              toggleOrderSelection={toggleOrderSelection}
              updateOrderStatus={updateOrderStatus}
              updateInlineOrderField={updateInlineOrderField}
              setOrders={setOrders}
              getEmbeddedImage={getEmbeddedImage}
              setPreviewImage={setPreviewImage}
              handleEditClick={handleEditClick}
              handleDeleteClick={handleDeleteClick}
              statusOptions={STATUS_OPTIONS}
            />
            </div>

            <div className="desktop-orders-table w-full max-w-none mx-auto overflow-visible rounded-3xl border border-slate-800 shadow-xl bg-slate-900">
            <table className="w-full text-left border-collapse table-fixed text-xs min-w-0">
              <thead>
                <tr>
                  <th className="p-3 w-10 text-center"><input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} title="Выбрать все видимые" className="w-4 h-4 accent-indigo-600 cursor-pointer" /></th>
                  <th className="p-3 w-[34%]">Фото, товар и трек-номер</th>
                  <th className="p-3 w-[7%] text-center">Кол-во</th>
                  <th className="p-3 w-[11%] text-center">Закуп + дост. ¥</th>
                  <th className="p-3 w-[9%] text-center">Вес / объём</th>
                  <th className="p-3 w-[10%] text-center">Себест. 1 ед.</th>
                  <th className="p-3 w-[10%] text-center">Итого партия</th>
                  <th className="p-3 w-[9%] text-center">Для кого</th>
                  <th className="p-3 w-[13%] text-center">Статус доставки</th>
                  <th className="p-3 w-[7%] text-center">Действия</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((o) => {
                  const statusStyles = getStatusBadgeStyles(o.status);
                  const displayImage = o.imageUrl || getEmbeddedImage(o);
                  const unitCost = o.unitCostByn;
                  return (
                    <tr key={o.id} data-order-id={o.id} className={`transition-colors group ${statusStyles.rowBg}`}>
                      <td className="p-2 text-center align-middle"><input type="checkbox" checked={selectedOrderIds.includes(o.id)} onChange={()=>toggleOrderSelection(o.id)} title="Выбрать товар" className="w-4 h-4 accent-indigo-600 cursor-pointer" /></td>
                      <td className="p-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                            {displayImage ? <img src={displayImage} alt={o.name} onClick={(e)=>{e.stopPropagation();setPreviewImage({src:displayImage!,name:o.name})}} className="w-full h-full object-contain p-0.5 cursor-zoom-in" onError={(e)=>(e.target as HTMLImageElement).style.opacity="0"} /> : <span className="text-xs font-bold text-slate-400">{o.name.substring(0,2)}</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 text-[12px] leading-4 truncate" title={o.name}>{o.name}</div>
                            {o.notes && <div className="text-[10px] text-slate-500 truncate mt-0.5">{o.notes}</div>}
                            <div className="flex items-center gap-2 mt-1 min-w-0">
                              <input value={o.trackNumber || ""} placeholder="Трек-номер" onChange={e=>{const value=e.currentTarget.value;setOrders(prev=>prev.map(x=>x.id===o.id?{...x,trackNumber:value}:x))}} onBlur={e=>updateInlineOrderField(o.id,"trackNumber",e.currentTarget.value)} className="w-40 max-w-full px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-600 font-mono text-[10px] focus:outline-none focus:border-indigo-400" />
                              {o.itemUrl && <a href={o.itemUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 hover:underline shrink-0">Товар ↗</a>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center"><input type="number" min="1" step="1" value={o.quantity} onChange={e=>{const value=Number(e.currentTarget.value)||0;setOrders(prev=>prev.map(x=>x.id===o.id?{...x,quantity:value}:x))}} onBlur={e=>updateInlineOrderField(o.id,"quantity",e.currentTarget.value)} className="w-14 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-bold text-center focus:outline-none focus:border-indigo-400" /></td>
                      <td className="p-2 text-center">
                        <div className="font-mono font-bold text-slate-800">{o.priceCny.toFixed(2)} ¥</div>
                        <div className="text-[10px] text-slate-500 mt-1">+ {Number(o.shippingChinaCny||0).toFixed(2)} ¥ доставка</div>
                      </td>
                      <td className="p-2 text-center">
                        <input type="number" min="0" step="0.01" value={o.weight ?? 0} onChange={e=>{const raw=e.currentTarget.value;const value=raw===""?0:Number(raw);setOrders(prev=>prev.map(x=>x.id===o.id?{...x,weight:value}:x))}} onBlur={e=>updateInlineOrderField(o.id,"weight",e.currentTarget.value)} className="w-[6.5rem] max-w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-mono text-xs text-center focus:outline-none focus:border-indigo-400" />
                        <div className="text-[10px] text-orange-600 font-semibold mt-1">{(o.shippingUsd||0).toFixed(2)} $ карго</div>
                      </td>
                      <td className="p-2 text-center"><div className="font-mono font-bold text-indigo-600">{unitCost.toFixed(2)} <span className="text-[9px]">BYN</span></div><div className="text-[10px] text-slate-400 mt-1">за 1 ед.</div></td>
                      <td className="p-2 text-center"><div className="font-mono font-bold text-slate-800">{o.totalWithShippingByn.toFixed(2)} <span className="text-[9px] text-slate-500">BYN</span></div></td>
                      <td className="p-2 text-center"><input value={o.forWhom || "Родители"} onChange={e=>{const value=e.currentTarget.value;setOrders(prev=>prev.map(x=>x.id===o.id?{...x,forWhom:value}:x))}} onBlur={e=>updateInlineOrderField(o.id,"forWhom",e.currentTarget.value)} className="w-full min-w-0 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold text-center focus:outline-none focus:border-indigo-400" /></td>
                      <td className="p-2 text-center">
                        <div className={`inline-flex max-w-full rounded-lg border px-1.5 py-1 ${statusStyles.bg} ${statusStyles.bgHover}`}>
                          <select value={o.status} onChange={e=>updateOrderStatus(o.id,e.currentTarget.value)} data-status={o.status} className="status-select-desktop max-w-full bg-transparent border-0 text-[10px] font-bold cursor-pointer outline-none">
                            {STATUS_OPTIONS.map(status=><option key={status} value={status}>{status}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="p-2 text-center"><div className="flex items-center justify-center gap-1">
                        <button onClick={()=>handleEditClick(o)} title="Изменить данные" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-3.5 h-3.5"/></button>
                        <button onClick={()=>handleDeleteClick(o.id,o.name)} title="Удалить товар" className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="font-bold">
                <td colSpan={2} className="p-3 text-right text-slate-600">ИТОГО ПО ФИЛЬТРУ</td>
                <td className="p-3 text-center text-slate-800">{filteredOrders.reduce((sum,o)=>sum+o.quantity,0)} шт</td>
                <td className="p-3 text-center font-mono text-slate-700">¥ {filteredOrders.reduce((sum,o)=>sum+o.itemTotalCny+(o.shippingChinaCny||0),0).toFixed(2)}</td>
                <td className="p-3 text-center font-mono text-slate-700">{filteredOrders.reduce((sum,o)=>sum+(o.weight||0),0).toFixed(2)} кг</td>
                <td className="p-3 text-center font-mono text-indigo-600">{(filteredOrders.reduce((sum,o)=>sum+o.unitCostByn,0)/(filteredOrders.length||1)).toFixed(2)} BYN</td>
                <td className="p-3 text-center font-mono text-slate-800">{filteredOrders.reduce((sum,o)=>sum+o.totalWithShippingByn,0).toFixed(2)} BYN</td>
                <td colSpan={3}></td>
              </tr></tfoot>
            </table>
            </div>
          </>
        )}

        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm p-6 flex items-center justify-center" onClick={()=>setPreviewImage(null)}>
            <div className="relative max-w-[92vw] max-h-[90vh] rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl" onClick={e=>e.stopPropagation()}>
              <button type="button" onClick={()=>setPreviewImage(null)} className="absolute right-2 top-2 z-10 w-9 h-9 rounded-full bg-slate-950/90 border border-slate-700 text-white text-xl hover:bg-rose-900 cursor-pointer">×</button>
              <img src={previewImage.src} alt={previewImage.name} className="block max-w-[88vw] max-h-[84vh] object-contain rounded-xl bg-white" />
              <div className="mt-2 text-center text-xs text-slate-300 truncate max-w-[80vw]">{previewImage.name}</div>
            </div>
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

      {/* CREATE & EDIT MODAL - REDESIGNED HEIGHT TO FIT COMFORTABLY WITH INTERNALLY SCROLLING GRID */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scaleIn">
            
            {/* FIXED Header */}
            <div className="bg-slate-50 p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                {editingOrder ? `Редактирование: ${formData.name}` : "Добавить новый заказ из Китая"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 transition-all cursor-pointer p-1.5 rounded-lg hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOrder} className="flex flex-col flex-1 overflow-hidden">
              
              {/* INTERNAL SCROLLABLE BODY */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  
                  {/* Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Название товара *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Например: Пылесос для автомобиля, Фен черный"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Track Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Трек-номер Китая
                    </label>
                    <input
                      type="text"
                      value={formData.trackNumber}
                      onChange={(e) => setFormData({ ...formData, trackNumber: e.target.value })}
                      placeholder="Например: 4655594672890"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-500 text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* For Whom */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Для кого (Получатель)
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={formData.forWhom}
                        onChange={(e) => setFormData({ ...formData, forWhom: e.target.value })}
                        placeholder="Например: Родители, Клиент..."
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                      />
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setFormData({ ...formData, forWhom: e.target.value });
                          }
                        }}
                        className="px-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-700 text-xs cursor-pointer focus:outline-none"
                      >
                        <option value="">Варианты</option>
                        {uniqueForWhomOptions.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Текущий статус
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
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
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Ссылка на товар (PinDuoDuo и др)
                    </label>
                    <input
                      type="url"
                      value={formData.itemUrl}
                      onChange={(e) => setFormData({ ...formData, itemUrl: e.target.value })}
                      placeholder="https://mobile.yangkeduo.com/..."
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Image Upload Block (Base64 compression with Canvas) */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Фотография товара *
                    </label>
                    
                    <div className="flex flex-row gap-3 items-center bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
                      
                      {/* Live Preview Thumbnail */}
                      <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative shadow">
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
                              className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-[10px] text-rose-400 font-bold transition-opacity cursor-pointer"
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
                      <div className="flex-1 space-y-1 w-full">
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
                          <div className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-750 text-slate-300 text-xs font-bold text-center hover:bg-slate-800 hover:text-white transition-all">
                            📎 Выберите файл на устройстве
                          </div>
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
                        className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-600 text-xs focus:outline-none"
                      />
                    </details>
                  </div>

                  {/* Math variables */}
                  <hr className="sm:col-span-2 border-slate-800 my-0.5" />

                  {/* Price per unit (CNY) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Цена за ед. (CNY)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                       value={formData.priceCny}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setFormData({ ...formData, priceCny: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Количество
                    </label>
                    <input
                      type="number"
                      min="1"
                       value={formData.quantity}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Shipping China (CNY) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Доставка по Китаю (CNY)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.shippingChinaCny}
                      onChange={(e) => setFormData({ ...formData, shippingChinaCny: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Shipping Belarus (BYN) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Доставка в РБ (BYN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.shippingBelarusByn}
                      onChange={(e) => setFormData({ ...formData, shippingBelarusByn: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Rate CNY to BYN */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Курс за 1 CNY (в BYN)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.rateCnyByn}
                      onChange={(e) => setFormData({ ...formData, rateCnyByn: parseFloat(e.target.value) || defaultRate })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Вес товара (кг)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Dates */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Плановая дата получения
                    </label>
                    <input
                      type="date"
                      value={formData.plannedDate}
                      onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Received Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Дата фактического получения
                    </label>
                    <input
                      type="date"
                      value={formData.receivedDate}
                      onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Notes */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Заметки и комментарии
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Например: Посылка в мешке с наклейкой 'AUTO', договорились на скидку"
                      className="w-full h-14 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 resize-none"
                    ></textarea>
                  </div>

                </div>

                {/* LIVE CALCULATION PREVIEW */}
                <div className="p-3 sm:p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 text-xs text-slate-300">
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

              </div>

              {/* FIXED FOOTER with Action buttons */}
              <div className="bg-slate-800 p-4 border-t border-slate-700/80 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold cursor-pointer transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-slate-800 text-xs sm:text-sm font-black cursor-pointer shadow transition-all active:scale-95"
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
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-800 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
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
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-800 text-xs sm:text-sm font-black cursor-pointer shadow transition-all active:scale-95 disabled:bg-slate-800 disabled:text-slate-500"
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

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Вес:</span>
                    <strong className="text-amber-300 block mt-0.5">{parsedVoiceData.weight ? parsedVoiceData.weight + " кг" : "не указан"}</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Доставка по Китаю:</span>
                    <strong className="text-orange-300 block mt-0.5">{parsedVoiceData.shippingChinaCny ? "¥ " + parsedVoiceData.shippingChinaCny : "не указана"}</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Доставка по РБ:</span>
                    <strong className="text-orange-300 block mt-0.5">{parsedVoiceData.shippingBelarusByn ? parsedVoiceData.shippingBelarusByn + " BYN" : "не указана"}</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 col-span-2">
                    <span className="text-slate-500 block text-[10px]">Трек-номер Китая:</span>
                    <strong className="text-white block mt-0.5 font-mono text-sm tracking-wider">{parsedVoiceData.trackNumber || <span className="text-slate-500 italic font-sans text-xs">не найден</span>}</strong>
                  </div>
                  {parsedVoiceData.itemUrl && <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 col-span-2 min-w-0"><span className="text-slate-500 block text-[10px]">Ссылка:</span><strong className="text-blue-300 block mt-0.5 truncate">{parsedVoiceData.itemUrl}</strong></div>}
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
