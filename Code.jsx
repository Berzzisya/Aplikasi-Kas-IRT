import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Home, Plus, Receipt, PieChart as PieIcon, Image as ImageIcon, Menu,
  ArrowLeft, Eye, EyeOff, Mail, Lock, User as UserIcon, Check, X,
  TrendingUp, TrendingDown, Wallet, AlertTriangle, Repeat, Camera,
  Search, Filter, Download, Target, Bell, Trash2, Edit2, ChevronRight,
  ChevronDown, Tag, ShieldCheck, Cloud, Undo2, Sparkles, Calendar,
  ArrowUpRight, ArrowDownRight, LogOut, Settings as SettingsIcon,
  BadgeCheck, Zap, FileDown, RefreshCw, Fingerprint, Delete,
} from "lucide-react";

/* ============================= DESIGN TOKENS =============================
   Palette: hutan tropis rumah tangga — hijau tua sebagai identitas "stabilitas",
   krem hangat sebagai kanvas, emas untuk pencapaian/goals.
   Font: Plus Jakarta Sans (display+body), tetap konsisten dengan histori proyek.
============================================================================ */
const T = {
  bg: "#F7F5EF",
  surface: "#FFFFFF",
  surfaceAlt: "#F0EEE4",
  primary: "#1A5C3A",
  primaryDark: "#123F28",
  primaryLight: "#E4EEE7",
  sage: "#4F8A63",
  gold: "#C08A2E",
  goldLight: "#F6EBD3",
  warn: "#E08E45",
  warnLight: "#FBEADA",
  danger: "#C64545",
  dangerLight: "#FBE4E4",
  info: "#3B7CB8",
  infoLight: "#E4EFF7",
  text: "#1F2A24",
  textMuted: "#6B7A72",
  textFaint: "#9AA8A0",
  border: "#E6E2D6",
};

function useGoogleFont() {
  useEffect(() => {
    if (document.getElementById("kx-font")) return;
    const link = document.createElement("link");
    link.id = "kx-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);
}

const fontStack = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif";

/* ============================= HELPERS ============================= */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const rupiah = (n) =>
  "Rp" + Math.round(Math.abs(n)).toLocaleString("id-ID");
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthLabel = (d) =>
  new Date(d).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
const shortDate = (d) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

function createExcelSheet(rows, widths = []) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  if (widths.length) sheet["!cols"] = widths.map((wch) => ({ wch }));
  if (sheet["!ref"]) {
    sheet["!autofilter"] = { ref: sheet["!ref"] };
    sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  }
  return sheet;
}

function formatExcelColumn(sheet, columnName, format) {
  if (!sheet["!ref"]) return;
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const headers = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    headers.push(sheet[XLSX.utils.encode_cell({ r: 0, c })]?.v);
  }
  const columnIndex = headers.indexOf(columnName);
  if (columnIndex < 0) return;
  for (let r = 1; r <= range.e.r; r++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: columnIndex })];
    if (cell) cell.z = format;
  }
}

function buildExcelBackup(account, data) {
  const workbook = XLSX.utils.book_new();
  const categories = data.categories || [];
  const pockets = data.pockets || [];
  const categoryMap = Object.fromEntries(categories.map((category) => [category.id, category]));
  const pocketMap = Object.fromEntries(pockets.map((pocket) => [pocket.id, pocket]));

  const guide = [
    { Bagian: "Aplikasi", Keterangan: "Saku Ibu" },
    { Bagian: "Dibuat pada", Keterangan: new Date() },
    { Bagian: "Cara memakai", Keterangan: "Edit data di sheet yang sesuai, lalu impor kembali melalui aplikasi." },
    { Bagian: "Catatan", Keterangan: "Foto nota tidak ditanamkan ke workbook; status lampirannya tetap dicatat." },
    { Bagian: "Keamanan", Keterangan: "Password, PIN, biometrik, dan data rahasia tidak ikut diekspor." },
  ];
  const profile = [
    { Field: "Nama", Nilai: account?.name || "" },
    { Field: "Email", Nilai: account?.email || "" },
    { Field: "No. WhatsApp", Nilai: account?.phone || "" },
    { Field: "Pekerjaan", Nilai: account?.occupation || "" },
  ];
  const transactions = (data.transactions || []).filter((tx) => !tx.deleted).map((tx) => ({
    ID: tx.id,
    Tanggal: new Date(`${tx.date}T00:00:00`),
    Jenis: tx.type === "income" ? "Pemasukan" : "Pengeluaran",
    Nominal: Number(tx.amount) || 0,
    "Kategori ID": tx.categoryId || "",
    Kategori: categoryMap[tx.categoryId]?.name || "Lainnya",
    "Kantong ID": tx.pocketId || "",
    Kantong: pocketMap[tx.pocketId]?.name || "Kantong Utama",
    Catatan: tx.note || "",
    "Foto Nota": tx.photo ? "Ada" : "Tidak ada",
    Berulang: tx.recurring ? "Ya" : "Tidak",
    "Transfer Kantong": tx.isPocketTransfer ? "Ya" : "Tidak",
    "Transfer ID": tx.transferId || "",
  }));
  const pocketRows = pockets.map((pocket) => ({
    ID: pocket.id,
    Nama: pocket.name || "",
    Deskripsi: pocket.description || "",
    "Batas Pengeluaran": Number(pocket.limit) || 0,
    Warna: pocket.color || "",
  }));
  const categoryRows = categories.map((category) => ({
    ID: category.id,
    Nama: category.name || "",
    Ikon: category.icon || "Tag",
    Tipe: category.kind === "income" ? "Pemasukan" : "Pengeluaran",
    Saldo: category.saldo || "bersih",
    Warna: category.color || "",
  }));
  const budgetRows = (data.budgets || []).map((budget) => ({
    "Kategori ID": budget.categoryId || "",
    Kategori: categoryMap[budget.categoryId]?.name || "",
    "Batas Bulanan": Number(budget.limit) || 0,
    Periode: budget.period || "monthly",
  }));
  const goalRows = (data.goals || []).map((goal) => ({
    ID: goal.id,
    Nama: goal.name || "",
    Target: Number(goal.target) || 0,
    Terkumpul: Number(goal.current) || 0,
    Tenggat: goal.deadline ? new Date(`${goal.deadline}T00:00:00`) : "",
    Catatan: goal.note || "",
  }));
  const notificationRows = (data.notifications || []).map((notification) => ({
    ID: notification.id,
    Pesan: notification.message || "",
    Tanggal: notification.date ? new Date(`${notification.date}T00:00:00`) : "",
    Tone: notification.tone || "primary",
    "Sudah Dibaca": notification.read ? "Ya" : "Belum",
  }));

  const sheets = [
    ["Petunjuk", guide, [18, 92]],
    ["Profil", profile, [22, 44]],
    ["Transaksi", transactions, [24, 14, 16, 16, 18, 24, 16, 20, 34, 14, 12, 18, 26]],
    ["Kantong", pocketRows, [24, 24, 38, 22, 16]],
    ["Kategori", categoryRows, [24, 24, 18, 18, 14, 16]],
    ["Anggaran", budgetRows, [18, 24, 20, 14]],
    ["Target", goalRows, [24, 28, 18, 18, 18, 36]],
    ["Notifikasi", notificationRows, [24, 48, 18, 14, 16]],
  ];
  sheets.forEach(([name, rows, widths]) => {
    const sheet = createExcelSheet(rows, widths);
    ["Tanggal", "Tenggat"].forEach((column) => formatExcelColumn(sheet, column, "dd mmm yyyy"));
    ["Nominal", "Batas Pengeluaran", "Batas Bulanan", "Target", "Terkumpul"].forEach((column) => formatExcelColumn(sheet, column, "#,##0"));
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  });
  return workbook;
}

function readExcelRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  return sheet ? XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true }) : [];
}

function textValue(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function numberValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const digits = textValue(value).replace(/[^0-9-]/g, "");
  return digits ? Number(digits) : 0;
}

function excelDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const raw = textValue(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = raw ? new Date(raw) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : todayISO();
}

function importExcelBackup(workbook, currentAccount, currentData) {
  const knownSheet = ["Transaksi", "Kantong", "Kategori", "Anggaran", "Target", "Profil"].some((name) => workbook.SheetNames.includes(name));
  if (!knownSheet) throw new Error("Workbook tidak memiliki sheet cadangan Saku Ibu yang dikenali.");

  const profileRows = readExcelRows(workbook, "Profil");
  const profile = Object.fromEntries(profileRows.map((row) => [textValue(row.Field), textValue(row.Nilai)]));
  const importedAccount = profileRows.length ? {
    ...currentAccount,
    name: profile.Nama || currentAccount?.name || "Pengguna",
    email: profile.Email || currentAccount?.email || "",
    phone: profile["No. WhatsApp"] || currentAccount?.phone || "",
    occupation: profile.Pekerjaan || currentAccount?.occupation || "",
  } : currentAccount;

  const categoryRows = readExcelRows(workbook, "Kategori");
  const categories = categoryRows.length ? categoryRows.map((row) => ({
    id: textValue(row.ID) || uid(),
    name: textValue(row.Nama) || "Kategori Baru",
    icon: textValue(row.Ikon) || "Tag",
    kind: /pemasukan|income/i.test(textValue(row.Tipe)) ? "income" : "expense",
    saldo: textValue(row.Saldo) || "bersih",
    color: textValue(row.Warna) || T.primary,
  })) : (currentData.categories || DEFAULT_CATEGORIES);
  const categoryById = Object.fromEntries(categories.map((category) => [category.id, category]));
  const categoryByName = Object.fromEntries(categories.map((category) => [category.name.toLowerCase(), category]));
  const resolveCategory = (row) => categoryById[textValue(row["Kategori ID"])] || categoryByName[textValue(row.Kategori).toLowerCase()] || categories[0];

  const pocketRows = readExcelRows(workbook, "Kantong");
  const pockets = pocketRows.length ? pocketRows.map((row) => ({
    id: textValue(row.ID) || uid(),
    name: textValue(row.Nama) || "Kantong Baru",
    description: textValue(row.Deskripsi),
    limit: numberValue(row["Batas Pengeluaran"]),
    color: textValue(row.Warna) || T.primary,
  })) : (currentData.pockets || []);
  const pocketById = Object.fromEntries(pockets.map((pocket) => [pocket.id, pocket]));
  const pocketByName = Object.fromEntries(pockets.map((pocket) => [pocket.name.toLowerCase(), pocket]));
  const resolvePocket = (row) => {
    const name = textValue(row.Kantong);
    if (!name || /utama/i.test(name)) return null;
    return pocketById[textValue(row["Kantong ID"])] || pocketByName[name.toLowerCase()] || null;
  };

  const transactionRows = readExcelRows(workbook, "Transaksi");
  const transactions = transactionRows.map((row) => {
    const category = resolveCategory(row);
    const pocket = resolvePocket(row);
    const amount = numberValue(row.Nominal);
    if (!category || amount <= 0) return null;
    return {
      id: textValue(row.ID) || uid(),
      date: excelDateValue(row.Tanggal),
      type: /pemasukan|income|masuk/i.test(textValue(row.Jenis)) ? "income" : "expense",
      amount,
      categoryId: category.id,
      pocketId: pocket?.id || null,
      note: textValue(row.Catatan),
      photo: null,
      recurring: /ya|yes|true/i.test(textValue(row.Berulang)) ? true : null,
      deleted: false,
      createdAt: Date.now(),
      isPocketTransfer: /ya|yes|true/i.test(textValue(row["Transfer Kantong"])),
      transferId: textValue(row["Transfer ID"]) || null,
    };
  }).filter(Boolean);

  const budgetRows = readExcelRows(workbook, "Anggaran");
  const budgets = budgetRows.map((row) => {
    const category = resolveCategory(row);
    const limit = numberValue(row["Batas Bulanan"]);
    return category && limit > 0 ? { categoryId: category.id, limit, period: textValue(row.Periode) || "monthly" } : null;
  }).filter(Boolean);
  const goalRows = readExcelRows(workbook, "Target");
  const goals = goalRows.map((row) => ({
    id: textValue(row.ID) || uid(),
    name: textValue(row.Nama) || "Target Baru",
    target: numberValue(row.Target),
    current: numberValue(row.Terkumpul),
    deadline: textValue(row.Tenggat) ? excelDateValue(row.Tenggat) : "",
    note: textValue(row.Catatan),
  })).filter((goal) => goal.target > 0);
  const notificationRows = readExcelRows(workbook, "Notifikasi");
  const notifications = notificationRows.map((row) => ({
    id: textValue(row.ID) || uid(),
    message: textValue(row.Pesan),
    date: textValue(row.Tanggal) ? excelDateValue(row.Tanggal) : todayISO(),
    tone: textValue(row.Tone) || "primary",
    read: /ya|yes|true/i.test(textValue(row["Sudah Dibaca"])),
  })).filter((notification) => notification.message);

  return {
    account: importedAccount,
    data: {
      categories,
      transactions,
      pockets,
      budgets,
      goals,
      notifications,
      onboarded: true,
    },
  };
}

const ICON_CHOICES = [
  "Home", "ShoppingCart", "Utensils", "Car", "Zap", "Heart", "GraduationCap",
  "Gift", "Shirt", "Smartphone", "Plane", "Coffee", "Wallet", "PiggyBank",
  "Briefcase", "Music", "Dumbbell", "Baby", "Dog", "Wrench",
];
import {
  ShoppingCart, Utensils, Car, GraduationCap, Gift, Shirt, Smartphone,
  Plane, Coffee, PiggyBank, Briefcase, Music, Dumbbell, Baby, Dog, Wrench, Heart as HeartIcon,
} from "lucide-react";
const ICON_MAP = {
  Home, ShoppingCart, Utensils, Car, Zap, Heart: HeartIcon, GraduationCap, Gift,
  Shirt, Smartphone, Plane, Coffee, Wallet, PiggyBank, Briefcase, Music,
  Dumbbell, Baby, Dog, Wrench,
};
function CatIcon({ name, size = 18, color }) {
  const Cmp = ICON_MAP[name] || Tag;
  return <Cmp size={size} color={color} />;
}

const DEFAULT_CATEGORIES = [
  { id: "cat-gaji", name: "Gaji", icon: "Briefcase", saldo: "bersih", kind: "income", color: T.primary },
  { id: "cat-lain-in", name: "Pemasukan Lain", icon: "Gift", saldo: "kotor", kind: "income", color: T.sage },
  { id: "cat-makan", name: "Makan & Belanja", icon: "Utensils", saldo: "bersih", kind: "expense", color: "#C0673F" },
  { id: "cat-transport", name: "Transportasi", icon: "Car", saldo: "bersih", kind: "expense", color: "#3B7CB8" },
  { id: "cat-tagihan", name: "Tagihan & Listrik", icon: "Zap", saldo: "bersih", kind: "expense", color: "#8A6DB0" },
  { id: "cat-pendidikan", name: "Pendidikan", icon: "GraduationCap", saldo: "bersih", kind: "expense", color: "#3B8A6B" },
  { id: "cat-hiburan", name: "Hiburan", icon: "Music", saldo: "kotor", kind: "expense", color: "#C08A2E" },
  { id: "cat-belanja", name: "Belanja Pribadi", icon: "Shirt", saldo: "kotor", kind: "expense", color: "#C64545" },
];

const emptyData = () => ({
  categories: DEFAULT_CATEGORIES,
  transactions: [],
  pockets: [],
  budgets: [],
  goals: [],
  notifications: [],
  notificationsEnabled: true,
  onboarded: false,
});

/* ============================= STORAGE ============================= */
async function loadAll() {
  let account = null, data = null, session = null;
  try { const r = await window.storage.get("account"); account = r ? JSON.parse(r.value) : null; } catch (e) {}
  try { const r = await window.storage.get("app-data"); data = r ? JSON.parse(r.value) : null; } catch (e) {}
  try { const r = await window.storage.get("session"); session = r ? JSON.parse(r.value) : null; } catch (e) {}
  return { account, data: data || emptyData(), session };
}
async function saveAccount(account) {
  try { await window.storage.set("account", JSON.stringify(account)); } catch (e) { console.error(e); }
}
async function saveData(data) {
  try { await window.storage.set("app-data", JSON.stringify(data)); } catch (e) { console.error(e); }
}
async function saveSession(session) {
  try {
    if (session) await window.storage.set("session", JSON.stringify(session));
    else await window.storage.delete("session");
  } catch (e) { console.error(e); }
}
async function loadSecurity() {
  try { const r = await window.storage.get("security"); return r ? JSON.parse(r.value) : { pinEnabled: false, pinHash: null, biometricEnabled: false, biometricCredentialId: null }; }
  catch (e) { return { pinEnabled: false, pinHash: null, biometricEnabled: false, biometricCredentialId: null }; }
}
async function saveSecurity(security) {
  try { await window.storage.set("security", JSON.stringify(security)); } catch (e) { console.error(e); }
}
// Hash sederhana untuk PIN — HANYA untuk kebutuhan demo/prototipe.
// Pada aplikasi produksi, verifikasi PIN semestinya dilakukan di server
// dengan hashing kriptografis (mis. bcrypt/argon2), bukan di client.
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/* ============================= SMALL UI PRIMITIVES ============================= */
function Button({ children, onClick, variant = "primary", full, disabled, icon: Icon, size = "md", type = "button" }) {
  const base = {
    fontFamily: fontStack, fontWeight: 700, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 14, transition: "transform .12s ease, opacity .12s ease",
    width: full ? "100%" : undefined, opacity: disabled ? 0.5 : 1,
  };
  const sizes = { sm: { padding: "8px 14px", fontSize: 13 }, md: { padding: "13px 18px", fontSize: 15 }, lg: { padding: "16px 20px", fontSize: 16 } };
  const variants = {
    primary: { background: T.primary, color: "#fff" },
    secondary: { background: T.primaryLight, color: T.primary },
    ghost: { background: "transparent", color: T.text },
    danger: { background: T.dangerLight, color: T.danger },
    outline: { background: "transparent", color: T.primary, border: `1.5px solid ${T.primary}` },
  };
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant] }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {Icon && <Icon size={17} />}
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, marginBottom: 6, display: "block" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 12,
  border: `1.5px solid ${T.border}`, fontSize: 15, fontFamily: fontStack,
  background: T.surface, color: T.text, outline: "none",
};

function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: T.surface, borderRadius: 18, padding: 18,
      border: `1px solid ${T.border}`, ...style,
    }}>
      {children}
    </div>
  );
}

function Badge({ children, tone = "primary" }) {
  const tones = {
    primary: { bg: T.primaryLight, fg: T.primary },
    warn: { bg: T.warnLight, fg: T.warn },
    danger: { bg: T.dangerLight, fg: T.danger },
    gold: { bg: T.goldLight, fg: T.gold },
    info: { bg: T.infoLight, fg: T.info },
  };
  const c = tones[tone];
  return (
    <span style={{ background: c.bg, color: c.fg, fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 999, letterSpacing: 0.2 }}>
      {children}
    </span>
  );
}

function Toast({ toast, onUndo, onClose }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "absolute", left: 16, right: 16, bottom: 90, zIndex: 60,
      background: T.primaryDark, color: "#fff", borderRadius: 14, padding: "12px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)", animation: "kxUp .2s ease",
    }}>
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{toast.message}</span>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        {toast.onUndo && (
          <button onClick={onUndo} style={{ background: "none", border: "none", color: T.goldLight, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
            URUNGKAN
          </button>
        )}
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", opacity: 0.7, cursor: "pointer", display: "flex" }}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, right, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(20,25,22,0.45)", zIndex: 70,
      display: "flex", alignItems: "flex-end",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.surface, width: "100%", borderRadius: "22px 22px 0 0",
        padding: "18px 18px 26px", maxHeight: "85%", overflowY: "auto",
        animation: "kxUp .22s ease",
      }}>
        <div style={{ width: 40, height: 4, background: T.border, borderRadius: 4, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>{title}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {right}
            <button type="button" onClick={onClose} style={{ background: T.surfaceAlt, border: "none", borderRadius: 10, padding: 6, cursor: "pointer", display: "flex" }}>
              <X size={18} color={T.textMuted} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function TopBar({ title, onBack, right }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 18px 10px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: T.surfaceAlt, border: "none", borderRadius: 10, padding: 7, cursor: "pointer", display: "flex" }}>
            <ArrowLeft size={18} color={T.text} />
          </button>
        )}
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: T.text }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: T.textMuted }}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <Icon size={26} color={T.primary} />
      </div>
      <div style={{ fontWeight: 800, color: T.text, fontSize: 15, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, marginBottom: 16 }}>{desc}</div>
      {action}
    </div>
  );
}

/* ============================= AUTH SCREENS ============================= */
function AuthShell({ children }) {
  useGoogleFont();
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.bg, fontFamily: fontStack }}>
      <div style={{ padding: "36px 26px 10px" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16, background: T.primary,
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18,
        }}>
          <Wallet size={26} color="#fff" />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 26px 26px" }}>{children}</div>
    </div>
  );
}

function SignUpScreen({ onSwitch, onDone, existing }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [otpErr, setOtpErr] = useState("");
  const [step, setStep] = useState("form"); // form -> verify
  const [otp, setOtp] = useState("");
  const [genOtp, setGenOtp] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [resendCooldown, setResendCooldown] = useState(0);
  const pwRules = {
    len: form.password.length >= 8,
    num: /\d/.test(form.password),
    upper: /[A-Z]/.test(form.password),
  };
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && pwRules.len && pwRules.num && pwRules.upper && form.password === form.confirm;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function submit() {
    setErr("");
    if (!form.name.trim()) return setErr("Nama lengkap wajib diisi.");
    if (!/\S+@\S+\.\S+/.test(form.email)) return setErr("Format email tidak valid.");
    if (existing && existing.email === form.email.toLowerCase()) return setErr("Email sudah terdaftar. Silakan masuk.");
    if (!pwRules.len || !pwRules.num || !pwRules.upper) return setErr("Password belum memenuhi syarat keamanan.");
    if (form.password !== form.confirm) return setErr("Konfirmasi password tidak cocok.");
    setOtp(""); setOtpErr(""); setResendCooldown(30);
    setStep("verify");
    // Simulasi pengiriman OTP: karena prototipe ini belum tersambung ke
    // layanan email sungguhan, kode dicatat ke console (bukan ditampilkan
    // di layar) supaya alur tetap bisa diuji tanpa membocorkannya ke UI.
    console.log("[DEMO] Kode OTP verifikasi email:", genOtp);
  }

  function verifyOtp() {
    if (otp.length !== 6) { setOtpErr("Masukkan 6 digit kode OTP."); return; }
    if (otp !== genOtp) { setOtpErr("Kode OTP salah. Periksa kembali email Anda."); return; }
    setOtpErr("");
    onDone({ name: form.name.trim(), email: form.email.toLowerCase(), password: form.password });
  }

  function resendOtp() {
    if (resendCooldown > 0) return;
    const next = String(Math.floor(100000 + Math.random() * 900000));
    setGenOtp(next);
    setOtp(""); setOtpErr(""); setResendCooldown(30);
    console.log("[DEMO] Kode OTP verifikasi email (kirim ulang):", next);
  }

  return (
    <AuthShell>
      {step === "form" ? (
        <>
          <h1 style={{ fontSize: 25, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>Buat akun baru</h1>
          <p style={{ color: T.textMuted, fontSize: 14, margin: "0 0 22px" }}>Mulai kelola keuangan rumah tangga Anda.</p>
          <Field label="Nama lengkap">
            <TextInput placeholder="cth. Berliana Putri" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Alamat email">
            <TextInput type="email" placeholder="nama@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Kata sandi">
            <div style={{ position: "relative" }}>
              <TextInput type={showPw ? "text" : "password"} placeholder="Minimal 8 karakter" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ paddingRight: 44 }} />
              <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 13, background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                {showPw ? <EyeOff size={18} color={T.textMuted} /> : <Eye size={18} color={T.textMuted} />}
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              {[["8+ karakter", pwRules.len], ["1 angka", pwRules.num], ["1 huruf besar", pwRules.upper]].map(([label, ok]) => (
                <span key={label} style={{ fontSize: 11, fontWeight: 700, color: ok ? T.primary : T.textFaint, display: "flex", alignItems: "center", gap: 4 }}>
                  <Check size={12} /> {label}
                </span>
              ))}
            </div>
          </Field>
          <Field label="Konfirmasi kata sandi">
            <TextInput type={showPw ? "text" : "password"} placeholder="Ulangi kata sandi" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </Field>
          {err && <div style={{ color: T.danger, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{err}</div>}
          <Button full size="lg" onClick={submit} disabled={!valid}>Daftar</Button>
          <p style={{ textAlign: "center", fontSize: 13, color: T.textMuted, marginTop: 18 }}>
            Sudah punya akun? <span onClick={() => onSwitch("login")} style={{ color: T.primary, fontWeight: 700, cursor: "pointer" }}>Masuk</span>
          </p>
        </>
      ) : (
        <div style={{ textAlign: "center", paddingTop: 24 }}>
          <div style={{ width: 70, height: 70, borderRadius: 20, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <Mail size={30} color={T.primary} />
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: T.text, margin: "0 0 8px" }}>Verifikasi email Anda</h2>
          <p style={{ color: T.textMuted, fontSize: 14, lineHeight: 1.6, margin: "0 0 22px" }}>
            Kami mengirim kode OTP 6-digit ke <b style={{ color: T.text }}>{form.email}</b>. Masukkan kode tersebut untuk mengaktifkan akun.
          </p>
          <div style={{ background: T.goldLight, color: T.gold, borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 18, textAlign: "left" }}>
            Kode OTP demo: <span style={{ letterSpacing: 3 }}>{genOtp}</span>
          </div>
          <div style={{ textAlign: "left" }}>
            <Field label="Kode OTP">
              <TextInput
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpErr(""); }}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                style={{ textAlign: "center", fontSize: 20, fontWeight: 800, letterSpacing: 6 }}
              />
            </Field>
          </div>
          {otpErr && <div style={{ color: T.danger, fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: "left" }}>{otpErr}</div>}
          <Button full size="lg" icon={BadgeCheck} onClick={verifyOtp} disabled={otp.length !== 6}>
            Verifikasi & Aktifkan Akun
          </Button>
          <p style={{ fontSize: 12, color: T.textFaint, marginTop: 14 }}>
            Tidak menerima kode?{" "}
            {resendCooldown > 0 ? (
              <span>Kirim ulang dalam {resendCooldown}d</span>
            ) : (
              <span onClick={resendOtp} style={{ color: T.primary, fontWeight: 700, cursor: "pointer" }}>Kirim ulang</span>
            )}
          </p>
          <p onClick={() => setStep("form")} style={{ fontSize: 12.5, color: T.textMuted, marginTop: 10, cursor: "pointer", fontWeight: 700 }}>
            ← Ubah email
          </p>
        </div>
      )}
    </AuthShell>
  );
}

function LoginScreen({ onSwitch, onLogin, account }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  function submit() {
    if (lockedUntil && Date.now() < lockedUntil) {
      setErr("Akun terkunci sementara. Coba lagi dalam beberapa saat.");
      return;
    }
    if (!account) { setErr("Belum ada akun terdaftar. Silakan daftar terlebih dahulu."); return; }
    if (email.toLowerCase() !== account.email || password !== account.password) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 5) {
        setLockedUntil(Date.now() + 60000);
        setErr("Terlalu banyak percobaan gagal. Akun dikunci 1 menit demi keamanan.");
      } else {
        setErr(`Email atau kata sandi salah. (${next}/5 percobaan)`);
      }
      return;
    }
    setErr("");
    onLogin(remember);
  }

  return (
    <AuthShell>
      <h1 style={{ fontSize: 25, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>Selamat datang kembali</h1>
      <p style={{ color: T.textMuted, fontSize: 14, margin: "0 0 22px" }}>Masuk untuk melanjutkan pencatatan keuangan.</p>
      <Field label="Alamat email">
        <TextInput type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Kata sandi">
        <div style={{ position: "relative" }}>
          <TextInput type={showPw ? "text" : "password"} placeholder="Kata sandi" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: 44 }} />
          <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 13, background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            {showPw ? <EyeOff size={18} color={T.textMuted} /> : <Eye size={18} color={T.textMuted} />}
          </button>
        </div>
      </Field>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: T.textMuted, cursor: "pointer" }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Ingat saya
        </label>
        <span onClick={() => onSwitch("forgot")} style={{ fontSize: 13, color: T.primary, fontWeight: 700, cursor: "pointer" }}>Lupa kata sandi?</span>
      </div>
      {err && <div style={{ color: T.danger, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{err}</div>}
      <Button full size="lg" onClick={submit}>Masuk</Button>
      <p style={{ textAlign: "center", fontSize: 13, color: T.textMuted, marginTop: 18 }}>
        Belum punya akun? <span onClick={() => onSwitch("signup")} style={{ color: T.primary, fontWeight: 700, cursor: "pointer" }}>Daftar sekarang</span>
      </p>
    </AuthShell>
  );
}

function ForgotPasswordScreen({ onSwitch, account, onReset }) {
  const [stage, setStage] = useState("email"); // email -> code -> newpw -> done
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [genCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");

  return (
    <AuthShell>
      {stage === "email" && (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>Lupa kata sandi</h1>
          <p style={{ color: T.textMuted, fontSize: 14, margin: "0 0 22px" }}>Masukkan email akun Anda, kami akan kirim kode reset.</p>
          <Field label="Alamat email">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
          </Field>
          {err && <div style={{ color: T.danger, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <Button full size="lg" onClick={() => {
            if (!account || email.toLowerCase() !== account.email) { setErr("Email tidak terdaftar."); return; }
            setErr(""); setStage("code");
          }}>Kirim kode reset</Button>
          <p style={{ textAlign: "center", fontSize: 13, color: T.textMuted, marginTop: 18 }}>
            <span onClick={() => onSwitch("login")} style={{ color: T.primary, fontWeight: 700, cursor: "pointer" }}>Kembali ke halaman masuk</span>
          </p>
        </>
      )}
      {stage === "code" && (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>Masukkan kode</h1>
          <p style={{ color: T.textMuted, fontSize: 14, margin: "0 0 10px" }}>Kode 6-digit dikirim ke {email}. Berlaku 1 jam.</p>
          <div style={{ background: T.goldLight, color: T.gold, borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 18 }}>
            Kode simulasi (demo): {genCode}
          </div>
          <Field label="Kode verifikasi">
            <TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" maxLength={6} />
          </Field>
          {err && <div style={{ color: T.danger, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <Button full size="lg" onClick={() => {
            if (code !== genCode) { setErr("Kode tidak sesuai."); return; }
            setErr(""); setStage("newpw");
          }}>Verifikasi</Button>
        </>
      )}
      {stage === "newpw" && (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>Buat kata sandi baru</h1>
          <p style={{ color: T.textMuted, fontSize: 14, margin: "0 0 22px" }}>Minimal 8 karakter, kombinasi huruf besar dan angka.</p>
          <Field label="Kata sandi baru">
            <TextInput type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
          </Field>
          <Field label="Konfirmasi kata sandi">
            <TextInput type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </Field>
          {err && <div style={{ color: T.danger, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <Button full size="lg" onClick={() => {
            if (pw1.length < 8 || !/\d/.test(pw1) || !/[A-Z]/.test(pw1)) { setErr("Kata sandi belum memenuhi syarat."); return; }
            if (pw1 !== pw2) { setErr("Konfirmasi tidak cocok."); return; }
            onReset(pw1); setStage("done");
          }}>Simpan kata sandi</Button>
        </>
      )}
      {stage === "done" && (
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div style={{ width: 70, height: 70, borderRadius: 20, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <ShieldCheck size={30} color={T.primary} />
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: T.text, margin: "0 0 8px" }}>Kata sandi diperbarui</h2>
          <p style={{ color: T.textMuted, fontSize: 14, marginBottom: 26 }}>Silakan masuk dengan kata sandi baru Anda.</p>
          <Button full size="lg" onClick={() => onSwitch("login")}>Ke halaman masuk</Button>
        </div>
      )}
    </AuthShell>
  );
}

/* ============================= KEAMANAN: PIN & BIOMETRIK ============================= */
function bufToB64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function b64ToBuf(b64) { return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer; }

async function isBiometricAvailable() {
  try {
    if (!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) { return false; }
}

// Mendaftarkan sidik jari/biometrik perangkat sebagai kunci aplikasi.
// Catatan: ini memakai WebAuthn platform authenticator sebagai gerbang
// verifikasi lokal (mengandalkan prompt biometrik OS/browser). Tanpa
// server untuk memverifikasi signature secara kriptografis, pola ini
// cocok untuk "kunci aplikasi lokal" seperti pada umumnya app mobile,
// bukan otentikasi akun penuh.
async function registerBiometric(account) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Keuangan Rumah Tangga" },
      user: { id: userId, name: account?.email || "user", displayName: account?.name || "Pengguna" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60000,
    },
  });
  return bufToB64(cred.rawId);
}

async function verifyBiometric(credentialId) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: b64ToBuf(credentialId), type: "public-key" }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  return true; // resolve berarti verifikasi OS berhasil; reject/exception ditangani caller
}

function PinDots({ length, filled }) {
  return (
    <div style={{ display: "flex", gap: 14, justifyContent: "center", margin: "18px 0 28px" }}>
      {Array.from({ length }).map((_, i) => (
        <div key={i} style={{
          width: 16, height: 16, borderRadius: "50%",
          background: i < filled ? T.primary : T.surfaceAlt,
          border: `1.5px solid ${i < filled ? T.primary : T.border}`,
        }} />
      ))}
    </div>
  );
}

function PinKeypad({ onDigit, onBackspace }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, maxWidth: 260, margin: "0 auto" }}>
      {keys.map((k, i) => {
        if (k === "") return <div key={i} />;
        if (k === "back") {
          return (
            <button key={i} onClick={onBackspace} style={{ height: 58, borderRadius: 16, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Delete size={22} color={T.textMuted} />
            </button>
          );
        }
        return (
          <button key={i} onClick={() => onDigit(k)} style={{
            height: 58, borderRadius: 16, border: `1.5px solid ${T.border}`, background: T.surface,
            fontSize: 20, fontWeight: 800, color: T.text, cursor: "pointer", fontFamily: fontStack,
          }}>
            {k}
          </button>
        );
      })}
    </div>
  );
}

// Modal untuk MENGAKTIFKAN PIN (set + konfirmasi) dari halaman Settings
function SetPinModal({ onSave, onClose }) {
  const [stage, setStage] = useState("set"); // set -> confirm
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [err, setErr] = useState("");

  function handleDigit(d) {
    setErr("");
    if (stage === "set") {
      if (pin.length >= 6) return;
      const next = pin + d;
      setPin(next);
      if (next.length === 6) setTimeout(() => setStage("confirm"), 150);
    } else {
      if (confirmPin.length >= 6) return;
      const next = confirmPin + d;
      setConfirmPin(next);
      if (next.length === 6) {
        if (next === pin) onSave(pin);
        else { setErr("PIN tidak cocok. Coba lagi."); setConfirmPin(""); setPin(""); setStage("set"); }
      }
    }
  }
  function handleBackspace() {
    if (stage === "set") setPin(pin.slice(0, -1));
    else setConfirmPin(confirmPin.slice(0, -1));
  }

  return (
    <div style={{ textAlign: "center", padding: "8px 0 10px" }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
        {stage === "set" ? "Buat PIN baru (6 digit)" : "Konfirmasi PIN"}
      </div>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 4 }}>PIN ini dipakai untuk membuka aplikasi.</div>
      <PinDots length={6} filled={stage === "set" ? pin.length : confirmPin.length} />
      {err && <div style={{ color: T.danger, fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>{err}</div>}
      <PinKeypad onDigit={handleDigit} onBackspace={handleBackspace} />
    </div>
  );
}

// Layar kunci aplikasi — tampil setiap kali app dibuka bila PIN/biometrik aktif
function AppLockScreen({ security, account, onUnlock }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => { isBiometricAvailable().then(setBioAvailable); }, []);

  async function tryBiometric() {
    if (bioBusy) return;
    setBioBusy(true); setErr("");
    try {
      await verifyBiometric(security.biometricCredentialId);
      onUnlock();
    } catch (e) {
      setErr("Verifikasi sidik jari gagal atau dibatalkan. Gunakan PIN.");
    } finally {
      setBioBusy(false);
    }
  }

  useEffect(() => {
    if (security.biometricEnabled && security.biometricCredentialId && bioAvailable) tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bioAvailable]);

  function handleDigit(d) {
    if (pin.length >= 6) return;
    setErr("");
    const next = pin + d;
    setPin(next);
    if (next.length === 6) {
      if (simpleHash(next) === security.pinHash) { onUnlock(); }
      else { setErr("PIN salah. Coba lagi."); setTimeout(() => setPin(""), 300); }
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.bg, fontFamily: fontStack, alignItems: "center", justifyContent: "center", padding: 30 }}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: T.primary, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <Lock size={26} color="#fff" />
      </div>
      <div style={{ fontWeight: 800, fontSize: 17, color: T.text, marginBottom: 4 }}>Aplikasi Terkunci</div>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 10, textAlign: "center" }}>
        {account?.name ? `Halo, ${account.name.split(" ")[0]}. ` : ""}
        {security.pinEnabled ? "Masukkan PIN untuk melanjutkan." : "Verifikasi untuk melanjutkan."}
      </div>
      {security.pinEnabled && <PinDots length={6} filled={pin.length} />}
      {err && <div style={{ color: T.danger, fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>{err}</div>}
      {security.pinEnabled && <PinKeypad onDigit={handleDigit} onBackspace={() => setPin(pin.slice(0, -1))} />}
      {security.biometricEnabled && security.biometricCredentialId && bioAvailable && (
        <button onClick={tryBiometric} disabled={bioBusy} style={{
          marginTop: 22, display: "flex", alignItems: "center", gap: 8, background: T.primaryLight, color: T.primary,
          border: "none", borderRadius: 14, padding: "11px 20px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: fontStack,
        }}>
          <Fingerprint size={18} /> {bioBusy ? "Memverifikasi..." : "Gunakan Sidik Jari"}
        </button>
      )}
    </div>
  );
}

/* ============================= ONBOARDING ============================= */
function Onboarding({ onFinish, categories }) {
  const [step, setStep] = useState(0);
  const [budgets, setBudgets] = useState({});
  const slides = [
    { icon: Wallet, title: "Pantau dua jenis saldo", desc: "Saldo Bersih untuk kebutuhan pokok, Saldo Kotor untuk pengeluaran fleksibel — semua terpisah otomatis." },
    { icon: Zap, title: "Catat transaksi dalam detik", desc: "Gunakan tombol Tambah Cepat kapan saja, atau isi form lengkap dengan foto nota." },
    { icon: Target, title: "Tetapkan anggaran & tujuan", desc: "Dapatkan peringatan saat mendekati batas anggaran, dan rayakan progres tabungan Anda." },
  ];
  if (step < slides.length) {
    const S = slides[step];
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.primary, color: "#fff", fontFamily: fontStack }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30, textAlign: "center" }}>
          <div style={{ width: 90, height: 90, borderRadius: 26, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
            <S.icon size={40} color="#fff" />
          </div>
          <h1 style={{ fontSize: 23, fontWeight: 800, margin: "0 0 10px" }}>{S.title}</h1>
          <p style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.6, maxWidth: 300 }}>{S.desc}</p>
        </div>
        <div style={{ padding: "0 30px 40px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 22 }}>
            {slides.map((_, i) => (
              <div key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, background: i === step ? "#fff" : "rgba(255,255,255,0.35)", transition: "all .2s" }} />
            ))}
          </div>
          <Button full size="lg" onClick={() => setStep(step + 1)}>
            {step === slides.length - 1 ? "Atur anggaran awal" : "Lanjut"}
          </Button>
          {step < slides.length - 1 && (
            <p onClick={() => setStep(slides.length)} style={{ textAlign: "center", fontSize: 13, opacity: 0.75, marginTop: 14, cursor: "pointer" }}>Lewati</p>
          )}
        </div>
      </div>
    );
  }
  const expenseCats = categories.filter((c) => c.kind === "expense");
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.bg, fontFamily: fontStack }}>
      <TopBar title="Atur anggaran awal" />
      <p style={{ padding: "0 20px", color: T.textMuted, fontSize: 13, margin: "0 0 12px" }}>Opsional — Anda bisa mengubahnya kapan saja nanti.</p>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
        {expenseCats.map((c) => (
          <Card key={c.id} style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CatIcon name={c.icon} size={18} color={c.color} />
            </div>
            <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{c.name}</div>
            <input
              placeholder="Rp 0"
              value={budgets[c.id] || ""}
              onChange={(e) => setBudgets({ ...budgets, [c.id]: e.target.value.replace(/\D/g, "") })}
              style={{ width: 100, padding: "8px 10px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, textAlign: "right", fontFamily: fontStack }}
            />
          </Card>
        ))}
      </div>
      <div style={{ padding: 20 }}>
        <Button full size="lg" onClick={() => onFinish(budgets)}>Mulai gunakan aplikasi</Button>
      </div>
    </div>
  );
}

/* ============================= DASHBOARD ============================= */
function BalanceMeter({ bersih, kotor }) {
  const total = bersih + kotor || 1;
  const pctBersih = Math.max(0, Math.min(100, (bersih / total) * 100));
  return (
    <div style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`, borderRadius: 22, padding: 20, color: "#fff", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: -30, top: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12.5, opacity: 0.75, fontWeight: 600, marginBottom: 4 }}>Total Saldo Rumah Tangga</div>
          <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.5 }}>{rupiah(bersih + kotor)}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.14)", borderRadius: 10, padding: 6 }}>
          <Wallet size={18} />
        </div>
      </div>
      <div style={{ height: 10, background: "rgba(255,255,255,0.18)", borderRadius: 8, marginTop: 18, overflow: "hidden", display: "flex" }}>
        <div style={{ width: pctBersih + "%", background: T.gold, borderRadius: 8 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: T.gold, display: "inline-block" }} /> SALDO BERSIH (Pokok)
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 3 }}>{rupiah(bersih)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
            SALDO KOTOR (Fleksibel) <span style={{ width: 8, height: 8, borderRadius: 3, background: "rgba(255,255,255,0.35)", display: "inline-block" }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 3 }}>{rupiah(kotor)}</div>
        </div>
      </div>
    </div>
  );
}

function computeBalances(transactions, categories) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  let bersih = 0, kotor = 0, income = 0, expense = 0;
  transactions.filter((t) => !t.deleted && !t.isPocketTransfer).forEach((t) => {
    const cat = catMap[t.categoryId];
    const bucket = cat ? cat.saldo : "kotor";
    const sign = t.type === "income" ? 1 : -1;
    if (t.type === "income") income += t.amount; else expense += t.amount;
    if (bucket === "bersih") bersih += sign * t.amount; else kotor += sign * t.amount;
  });
  return { bersih, kotor, income, expense };
}

function budgetStatus(categories, budgets, transactions, period) {
  const now = new Date();
  const inPeriod = (d) => {
    const dt = new Date(d);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  };
  return budgets.map((b) => {
    const cat = categories.find((c) => c.id === b.categoryId);
    const spent = transactions
      .filter((t) => !t.deleted && !t.isPocketTransfer && t.categoryId === b.categoryId && t.type === "expense" && inPeriod(t.date))
      .reduce((s, t) => s + t.amount, 0);
    const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
    return { ...b, cat, spent, pct };
  });
}

function getGamification(data) {
  const now = new Date();
  const monthTransactions = data.transactions.filter((t) => {
    const d = new Date(t.date);
    return !t.deleted && !t.isPocketTransfer && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const points = (Math.min(monthTransactions.length, 12) * 10)
    + (Math.min(data.budgets.length, 4) * 20)
    + (Math.min(data.goals.filter((g) => g.current > 0).length, 3) * 30);
  const levels = [
    { min: 0, title: "Pemula Rapi" },
    { min: 80, title: "Pencatat Konsisten" },
    { min: 180, title: "Jagoan Hemat" },
    { min: 350, title: "Penjaga Keuangan" },
    { min: 600, title: "Master Kas Rumah" },
  ];
  const current = levels.slice().reverse().find((level) => points >= level.min) || levels[0];
  const next = levels.find((level) => level.min > points);
  const progress = next ? ((points - current.min) / (next.min - current.min)) * 100 : 100;
  const missions = [
    { label: "Catat 3 transaksi bulan ini", current: Math.min(monthTransactions.length, 3), target: 3, reward: "+30 poin" },
    { label: "Atur satu anggaran", current: Math.min(data.budgets.length, 1), target: 1, reward: "+20 poin" },
    { label: "Isi satu target tabungan", current: data.goals.some((g) => g.current > 0) ? 1 : 0, target: 1, reward: "+30 poin" },
  ];
  return { points, current, next, progress, missions, month: monthLabel(now) };
}

function GamificationCard({ data, onOpenRewards }) {
  const game = useMemo(() => getGamification(data), [data]);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "4px 0 9px" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.textFaint, textTransform: "uppercase" }}>Pencapaian & Hadiah</div>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>Kebiasaan baikmu punya nilai</div>
        </div>
        <Sparkles size={18} color={T.gold} />
      </div>
      <button type="button" onClick={onOpenRewards} aria-label="Buka halaman reward" style={{ width: "100%", textAlign: "left", fontFamily: fontStack, background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})`, color: "#fff", border: "none", padding: 16, borderRadius: 18, overflow: "hidden", position: "relative", cursor: "pointer" }}>
        <div style={{ position: "absolute", width: 150, height: 150, borderRadius: "50%", right: -62, top: -75, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: T.gold, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={19} color="#fff" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, opacity: 0.72, fontWeight: 700 }}>LEVEL BULAN INI · {game.month}</div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>{game.current.title}</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.goldLight }}>{game.points} poin</div>
        </div>
        <div style={{ height: 7, background: "rgba(255,255,255,0.18)", borderRadius: 8, overflow: "hidden", marginTop: 16, position: "relative" }}><div style={{ height: "100%", width: Math.min(100, game.progress) + "%", background: T.gold, borderRadius: 8 }} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, opacity: 0.74, marginTop: 6, position: "relative" }}>
          <span>{game.next ? `Menuju ${game.next.title}` : "Level tertinggi tercapai"}</span>
          <span>{game.next ? `${game.next.min} poin` : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 14, overflowX: "auto", position: "relative", paddingBottom: 2 }}>
          {game.missions.slice(0, 2).map((mission) => {
            const done = mission.current >= mission.target;
            return (
              <div key={mission.label} style={{ minWidth: 142, background: "rgba(255,255,255,0.11)", borderRadius: 11, padding: "9px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, lineHeight: 1.3 }}><Check size={12} color={done ? T.goldLight : "rgba(255,255,255,0.65)"} /> {mission.label}</div>
                <div style={{ fontSize: 10, color: T.goldLight, marginTop: 5 }}>{done ? "Selesai" : `${mission.current}/${mission.target} · ${mission.reward}`}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 14, paddingTop: 11, borderTop: "1px solid rgba(255,255,255,0.14)", position: "relative" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: T.goldLight }}>Lihat semua reward</span>
          <ChevronRight size={16} color={T.goldLight} />
        </div>
      </button>
    </div>
  );
}

const REWARD_CATALOG = [
  { id: "badge-pemula", type: "badge", title: "Badge Pemula Rapi", partner: "Saku Ibu", cost: 0, description: "Tanda awal perjalanan mencatat keuangan dengan rapi." },
  { id: "indomaret-25", type: "voucher", title: "Voucher belanja Rp25.000", partner: "Indomaret", cost: 250, description: "Bantu penuhi kebutuhan rumah tangga bulanan." },
  { id: "badge-konsisten", type: "badge", title: "Badge Pencatat Konsisten", partner: "Saku Ibu", cost: 180, description: "Untuk kebiasaan mencatat transaksi secara rutin." },
  { id: "indomaret-50", type: "voucher", title: "Voucher belanja Rp50.000", partner: "Indomaret", cost: 500, description: "Hadiah untuk perjalanan menabung yang semakin konsisten." },
  { id: "badge-hemat", type: "badge", title: "Badge Jagoan Hemat", partner: "Saku Ibu", cost: 350, description: "Apresiasi karena berhasil menjaga pengeluaran." },
  { id: "indomaret-100", type: "voucher", title: "Voucher belanja Rp100.000", partner: "Indomaret", cost: 900, description: "Reward spesial untuk level keuangan yang lebih tinggi." },
];

function RewardItem({ reward, unlocked, onSelect }) {
  return (
    <button type="button" disabled={!unlocked} onClick={() => unlocked && onSelect(reward)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: fontStack, padding: 13, marginBottom: 9, borderRadius: 16, border: `1px solid ${unlocked ? T.gold : T.border}`, background: unlocked ? T.goldLight : T.surface, cursor: unlocked ? "pointer" : "not-allowed", opacity: unlocked ? 1 : 0.78 }}>
      <div style={{ width: 40, height: 40, borderRadius: 13, background: unlocked ? "#fff" : T.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {unlocked ? <Gift size={19} color={T.gold} /> : <Lock size={18} color={T.textFaint} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: T.textMuted }}>
          <span>{reward.partner}</span>
          <span style={{ color: T.textFaint }}>·</span>
          <span>{reward.cost === 0 ? "Gratis" : `${reward.cost} poin`}</span>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: T.text, marginTop: 2 }}>{reward.title}</div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3, lineHeight: 1.35 }}>{reward.description}</div>
      </div>
      <div style={{ flexShrink: 0, color: unlocked ? T.gold : T.textFaint }}>
        {unlocked ? <ChevronRight size={18} /> : <span style={{ fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}>Terkunci</span>}
      </div>
    </button>
  );
}

function RewardsPage({ data, onBack }) {
  const [selectedReward, setSelectedReward] = useState(null);
  const game = useMemo(() => getGamification(data), [data]);
  const available = REWARD_CATALOG.filter((reward) => game.points >= reward.cost);
  const locked = REWARD_CATALOG.filter((reward) => game.points < reward.cost);

  return (
    <div style={{ paddingBottom: 28 }}>
      <TopBar title="Level & Reward" onBack={onBack} />
      <div style={{ padding: "0 18px" }}>
        <Card style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})`, color: "#fff", border: "none", padding: 16, overflow: "hidden", position: "relative", marginBottom: 22 }}>
          <div style={{ position: "absolute", width: 170, height: 170, borderRadius: "50%", right: -75, top: -85, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: T.gold, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={20} color="#fff" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, opacity: 0.72, fontWeight: 700 }}>Poin kamu bulan ini</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{game.points} poin</div>
            </div>
            <Gift size={24} color={T.goldLight} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginTop: 15, position: "relative" }}>
            <div>
              <div style={{ fontSize: 10.5, opacity: 0.7 }}>Level saat ini</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{game.current.title}</div>
            </div>
            <div style={{ fontSize: 10.5, color: T.goldLight, textAlign: "right" }}>{game.next ? `${game.next.min - game.points} poin lagi ke ${game.next.title}` : "Level tertinggi tercapai"}</div>
          </div>
          <div style={{ height: 7, background: "rgba(255,255,255,0.18)", borderRadius: 8, overflow: "hidden", marginTop: 12, position: "relative" }}><div style={{ height: "100%", width: Math.min(100, game.progress) + "%", background: T.gold, borderRadius: 8 }} /></div>
        </Card>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 9 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Bisa diambil</div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>Reward yang sudah terbuka untukmu</div>
          </div>
          <span style={{ fontSize: 11, color: T.gold, fontWeight: 800 }}>{available.length} reward</span>
        </div>
        {available.length > 0 ? available.map((reward) => <RewardItem key={reward.id} reward={reward} unlocked onSelect={setSelectedReward} />) : (
          <Card style={{ padding: 18, textAlign: "center", marginBottom: 22 }}><Gift size={22} color={T.textFaint} /><div style={{ fontWeight: 800, marginTop: 8 }}>Belum ada reward terbuka</div><div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Selesaikan misi untuk mengumpulkan poin.</div></Card>
        )}

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", margin: "22px 0 9px" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Belum bisa diambil</div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>Kumpulkan poin lagi untuk membukanya</div>
          </div>
          <span style={{ fontSize: 11, color: T.textFaint, fontWeight: 800 }}>{locked.length} reward</span>
        </div>
        {locked.map((reward) => <RewardItem key={reward.id} reward={reward} unlocked={false} onSelect={setSelectedReward} />)}
      </div>

      <Modal open={!!selectedReward} onClose={() => setSelectedReward(null)} title="Detail Reward">
        {selectedReward && <div style={{ textAlign: "center", padding: "8px 0 10px" }}>
          <div style={{ width: 58, height: 58, borderRadius: 18, background: T.goldLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Gift size={27} color={T.gold} /></div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedReward.title}</div>
          <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.55, margin: "8px 0 18px" }}>{selectedReward.type === "voucher" ? "Kamu sudah memenuhi poin untuk reward ini. Penerbitan voucher toko akan aktif setelah integrasi partner hadiah disiapkan." : "Reward ini sudah terbuka. Kamu bisa menggunakannya sebagai pencapaian di Saku Ibu."}</p>
          <Button full onClick={() => setSelectedReward(null)}>Mengerti</Button>
        </div>}
      </Modal>
    </div>
  );
}

function Dashboard({ data, account, onNav, onQuickAdd }) {
  const { bersih, kotor, income, expense } = useMemo(() => computeBalances(data.transactions, data.categories), [data]);
  const game = useMemo(() => getGamification(data), [data]);
  const budgets = useMemo(() => budgetStatus(data.categories, data.budgets, data.transactions), [data]);
  const overBudget = budgets.filter((b) => b.pct >= 100);
  const nearBudget = budgets.filter((b) => b.pct >= 80 && b.pct < 100);
  const recent = useMemo(() => data.transactions.filter((t) => !t.deleted && !t.isPocketTransfer).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5), [data]);
  const catMap = Object.fromEntries(data.categories.map((c) => [c.id, c]));

  const pieData = useMemo(() => {
    const now = new Date();
    const byCat = {};
    data.transactions.filter((t) => !t.deleted && !t.isPocketTransfer && t.type === "expense" && new Date(t.date).getMonth() === now.getMonth()).forEach((t) => {
      byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount;
    });
    return Object.entries(byCat).map(([id, val]) => ({ name: catMap[id]?.name || "Lainnya", value: val, color: catMap[id]?.color || T.textFaint }));
  }, [data]);

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: "18px 18px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12.5, color: T.textMuted, fontWeight: 600 }}>Halo, {account?.name?.split(" ")[0] || "Pengguna"} 👋</div>
          <div style={{ fontSize: 12, color: T.textFaint }}>{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={() => onNav("rewards")} aria-label={`Buka level dan reward, ${game.points} poin`} style={{ display: "flex", alignItems: "center", gap: 5, background: T.goldLight, border: `1px solid ${T.gold}55`, borderRadius: 12, padding: "8px 10px", color: T.gold, cursor: "pointer", fontFamily: fontStack }}>
            <Sparkles size={15} />
            <span style={{ fontSize: 11.5, fontWeight: 800 }}>{game.points} poin</span>
          </button>
          <button type="button" onClick={() => onNav("notifications")} aria-label="Buka notifikasi" style={{ position: "relative", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 9, cursor: "pointer", display: "flex" }}>
            <Bell size={18} color={T.text} />
            {data.notifications.some((n) => !n.read) && <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 4, background: T.danger }} />}
          </button>
        </div>
      </div>

      <div style={{ padding: "12px 18px" }}>
        <BalanceMeter bersih={bersih} kotor={kotor} />
      </div>

      <div style={{ display: "flex", gap: 10, padding: "0 18px 4px" }}>
        <Card style={{ flex: 1, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.sage, fontSize: 12, fontWeight: 700 }}>
            <ArrowUpRight size={15} /> Pemasukan Bulan Ini
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6, color: T.text }}>{rupiah(income)}</div>
        </Card>
        <Card style={{ flex: 1, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.danger, fontSize: 12, fontWeight: 700 }}>
            <ArrowDownRight size={15} /> Pengeluaran Bulan Ini
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6, color: T.text }}>{rupiah(expense)}</div>
        </Card>
      </div>

      <div style={{ padding: "12px 18px 0" }}>
        <button type="button" onClick={() => onNav("pockets")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, border: `1px solid ${T.border}`, borderRadius: 16, padding: "12px 14px", background: T.surface, color: T.text, fontFamily: fontStack, textAlign: "left", cursor: "pointer" }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: T.primaryLight, color: T.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Wallet size={19} /></span>
          <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 13.5, fontWeight: 800 }}>Buka Kantong</span><span style={{ display: "block", marginTop: 2, fontSize: 11.5, color: T.textMuted }}>Pisahkan dan tabung uang sesuai kebutuhan</span></span>
          <ChevronRight size={17} color={T.textFaint} />
        </button>
      </div>

      {(overBudget.length > 0 || nearBudget.length > 0) && (
        <div style={{ padding: "14px 18px 0" }}>
          {overBudget.map((b) => (
            <div key={b.categoryId} onClick={() => onNav("budget")} style={{ display: "flex", alignItems: "center", gap: 10, background: T.dangerLight, borderRadius: 14, padding: "11px 14px", marginBottom: 8, cursor: "pointer" }}>
              <AlertTriangle size={18} color={T.danger} />
              <div style={{ fontSize: 12.5, color: T.danger, fontWeight: 700 }}>
                Anggaran <b>{b.cat?.name}</b> sudah melebihi batas ({Math.round(b.pct)}%)
              </div>
            </div>
          ))}
          {nearBudget.map((b) => (
            <div key={b.categoryId} onClick={() => onNav("budget")} style={{ display: "flex", alignItems: "center", gap: 10, background: T.warnLight, borderRadius: 14, padding: "11px 14px", marginBottom: 8, cursor: "pointer" }}>
              <AlertTriangle size={18} color={T.warn} />
              <div style={{ fontSize: 12.5, color: T.warn, fontWeight: 700 }}>
                Anggaran <b>{b.cat?.name}</b> mendekati batas ({Math.round(b.pct)}%)
              </div>
            </div>
          ))}
        </div>
      )}

      {pieData.length > 0 && (
        <div style={{ padding: "16px 18px 0" }}>
          <Card>
            <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 6 }}>Pengeluaran per Kategori</div>
            <div style={{ fontSize: 11.5, color: T.textFaint, marginBottom: 6 }}>{monthLabel(new Date())}</div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 130, height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60} paddingAngle={2}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, marginLeft: 6 }}>
                {pieData.slice(0, 4).map((d) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: T.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700 }}>{rupiah(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      <div style={{ padding: "18px 18px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Transaksi Terbaru</div>
          <span onClick={() => onNav("transactions")} style={{ fontSize: 12.5, color: T.primary, fontWeight: 700, cursor: "pointer" }}>Lihat semua</span>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={Receipt} title="Belum ada transaksi" desc="Mulai catat pemasukan dan pengeluaran Anda." action={<Button icon={Plus} onClick={onQuickAdd}>Tambah Transaksi</Button>} />
        ) : recent.map((t) => <TxRow key={t.id} t={t} cat={catMap[t.categoryId]} onClick={() => onNav("txdetail", t.id)} />)}
      </div>
    </div>
  );
}

function getPocketTransactions(transactions, pocketId) {
  return transactions
    .filter((t) => !t.deleted && (pocketId === "main" ? !t.pocketId : t.pocketId === pocketId))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getPocketStats(transactions, pocketId) {
  const history = getPocketTransactions(transactions, pocketId);
  const now = new Date();
  const income = history.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = history.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const spentThisMonth = history.filter((t) => {
    const date = new Date(t.date);
    return t.type === "expense" && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((sum, t) => sum + t.amount, 0);
  return { history, income, expense, balance: income - expense, spentThisMonth };
}

const POCKET_COLORS = [T.primary, T.info, T.gold, T.sage, T.warn, T.danger];
const POCKET_ICONS = ["Wallet", "Home", "ShoppingCart", "PiggyBank", "Briefcase", "Heart"];

function PocketEditor({ initial, onSave }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    description: initial?.description || "",
    limit: initial?.limit ? String(initial.limit) : "",
    color: initial?.color || T.primary,
    icon: initial?.icon || "Wallet",
  });
  const [err, setErr] = useState("");

  function submit() {
    if (!form.name.trim()) return setErr("Nama kantong wajib diisi.");
    setErr("");
    onSave({
      id: initial?.id || uid(),
      name: form.name.trim(),
      description: form.description.trim(),
      limit: Number(form.limit.replace(/\D/g, "")) || 0,
      color: form.color,
      icon: form.icon,
      createdAt: initial?.createdAt || Date.now(),
    });
  }

  return (
    <div>
      <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.55, margin: "0 0 18px" }}>
        Buat kantong sesuai kebutuhanmu. Transaksi yang dipilihkan ke kantong ini akan muncul di riwayatnya.
      </p>
      <Field label="Nama kantong">
        <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth. Belanja Bulanan" autoFocus />
      </Field>
      <Field label="Keterangan (opsional)">
        <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="cth. Kebutuhan rumah" />
      </Field>
      <Field label="Batas spend bulanan (opsional)">
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: 13, fontWeight: 700, color: T.textMuted }}>Rp</span>
          <TextInput value={form.limit ? Number(form.limit.replace(/\D/g, "")).toLocaleString("id-ID") : ""} onChange={(e) => setForm({ ...form, limit: e.target.value.replace(/\D/g, "") })} placeholder="Tidak dibatasi" style={{ paddingLeft: 38 }} inputMode="numeric" />
        </div>
      </Field>
      <Field label="Warna kantong">
        <div style={{ display: "flex", gap: 10 }}>
          {POCKET_COLORS.map((color) => <button key={color} type="button" aria-label={`Pilih warna ${color}`} onClick={() => setForm({ ...form, color })} style={{ width: 32, height: 32, borderRadius: "50%", background: color, border: form.color === color ? `3px solid ${T.text}` : "3px solid transparent", boxShadow: form.color === color ? `0 0 0 2px ${T.surface}` : "none", cursor: "pointer" }} />)}
        </div>
      </Field>
      <Field label="Ikon kantong">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {POCKET_ICONS.map((icon) => <button key={icon} type="button" aria-label={`Pilih ikon ${icon}`} onClick={() => setForm({ ...form, icon })} style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${form.icon === icon ? T.primary : T.border}`, background: form.icon === icon ? T.primaryLight : T.surface, color: form.icon === icon ? T.primary : T.textMuted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><CatIcon name={icon} size={18} color="currentColor" /></button>)}
        </div>
      </Field>
      {err && <div style={{ color: T.danger, fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>{err}</div>}
      <Button full size="lg" icon={Check} onClick={submit}>{initial ? "Simpan Perubahan" : "Buat Kantong"}</Button>
    </div>
  );
}

function PocketLimitEditor({ pocket, onSave }) {
  const [limit, setLimit] = useState(pocket?.limit ? String(pocket.limit) : "");
  return (
    <div>
      <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.55, margin: "0 0 18px" }}>
        Tentukan batas pengeluaran bulanan untuk {pocket.name}. Batas ini membantu memantau dana yang dipakai dari Kantong Utama.
      </p>
      <Field label="Batas spend bulanan">
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: 13, fontWeight: 700, color: T.textMuted }}>Rp</span>
          <TextInput value={limit ? Number(limit.replace(/\D/g, "")).toLocaleString("id-ID") : ""} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} placeholder="0 = tanpa batas" style={{ paddingLeft: 38, fontSize: 17, fontWeight: 800 }} inputMode="numeric" autoFocus />
        </div>
      </Field>
      <Button full size="lg" icon={Check} onClick={() => onSave(Number(limit.replace(/\D/g, "")) || 0)}>Simpan Batas Spend</Button>
    </div>
  );
}

function PocketAllocationEditor({ pocket, available, onSave }) {
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  function submit() {
    const value = Number(amount.replace(/\D/g, "")) || 0;
    if (!value) return setErr("Masukkan nominal yang ingin ditabung.");
    if (value > available) return setErr("Nominal melebihi saldo Kantong Utama.");
    setErr("");
    onSave(value);
  }
  return (
    <div>
      <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.55, margin: "0 0 18px" }}>
        Ambil sebagian saldo dari Kantong Utama untuk ditabung di {pocket.name}.
      </p>
      <div style={{ background: T.primaryLight, borderRadius: 13, padding: "11px 13px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: T.textMuted, fontSize: 12 }}>Saldo Kantong Utama</span><strong style={{ color: T.primary, fontSize: 14 }}>{rupiah(available)}</strong></div>
      <Field label="Nominal yang ditabung">
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: 13, fontWeight: 700, color: T.textMuted }}>Rp</span>
          <TextInput value={amount ? Number(amount.replace(/\D/g, "")).toLocaleString("id-ID") : ""} onChange={(e) => { setErr(""); setAmount(e.target.value.replace(/\D/g, "")); }} placeholder="0" style={{ paddingLeft: 38, fontSize: 18, fontWeight: 800 }} inputMode="numeric" autoFocus />
        </div>
      </Field>
      {err && <div style={{ color: T.danger, fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>{err}</div>}
      <Button full size="lg" icon={ArrowDownRight} onClick={submit}>Tambahkan ke Kantong</Button>
    </div>
  );
}

function PocketDetailPage({ pocket, stats, catMap, onBack, onEdit, onDelete, onSetLimit, onAllocate, onQuickAdd, onEditTransaction }) {
  const [historyType, setHistoryType] = useState("all");
  const isMain = pocket.id === "main";
  const history = stats.history.filter((t) => historyType === "all" || t.type === historyType);
  const limit = pocket.limit || 0;
  const progress = limit > 0 ? Math.min(100, (stats.spentThisMonth / limit) * 100) : 0;
  const amount = stats.balance < 0 ? `-${rupiah(stats.balance)}` : rupiah(stats.balance);
  const addToPocket = () => onQuickAdd(isMain ? "main" : pocket.id);

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title={isMain ? "Kantong Utama" : pocket.name} onBack={onBack} right={!isMain && <div style={{ display: "flex", gap: 6 }}><button type="button" aria-label="Edit kantong" onClick={onEdit} style={{ background: T.primaryLight, border: "none", borderRadius: 10, padding: 8, cursor: "pointer", display: "flex" }}><Edit2 size={16} color={T.primary} /></button><button type="button" aria-label="Hapus kantong" onClick={() => window.confirm(`Hapus kantong ${pocket.name}? Transaksi di dalamnya akan kembali ke Kantong Utama.`) && onDelete()} style={{ background: T.dangerLight, border: "none", borderRadius: 10, padding: 8, cursor: "pointer", display: "flex" }}><Trash2 size={16} color={T.danger} /></button></div>} />
      <div style={{ padding: "2px 18px 0" }}>
        <div style={{ background: `linear-gradient(135deg, ${pocket.color || T.primary}, ${T.primaryDark})`, borderRadius: 22, padding: 18, color: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 150, height: 150, borderRadius: "50%", right: -66, top: -78, background: "rgba(255,255,255,0.09)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(255,255,255,0.17)", display: "flex", alignItems: "center", justifyContent: "center" }}><CatIcon name={pocket.icon || "Wallet"} size={21} color="#fff" /></div>
            <div><div style={{ fontSize: 11, opacity: 0.72, fontWeight: 700 }}>{isMain ? "SEMUA TRANSAKSI UTAMA" : "KANTONG PRIBADI"}</div><div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{pocket.name}</div></div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 22, position: "relative" }}>{amount}</div>
          <div style={{ display: "flex", gap: 18, marginTop: 13, position: "relative" }}>
            <div><div style={{ fontSize: 10.5, opacity: 0.7 }}>Masuk</div><div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 2 }}>{rupiah(stats.income)}</div></div>
            <div><div style={{ fontSize: 10.5, opacity: 0.7 }}>Keluar</div><div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 2 }}>{rupiah(stats.expense)}</div></div>
          </div>
        </div>

        {!isMain && <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 14, marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><div style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 700 }}>Spend bulan ini</div><div style={{ fontSize: 16, fontWeight: 800, marginTop: 3 }}>{rupiah(stats.spentThisMonth)}</div></div><button type="button" onClick={onSetLimit} style={{ border: "none", background: T.goldLight, color: T.gold, borderRadius: 10, padding: "8px 10px", fontFamily: fontStack, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>{limit ? "Ubah batas" : "Atur batas"}</button></div>
          {limit > 0 ? <><div style={{ height: 7, background: T.surfaceAlt, borderRadius: 8, overflow: "hidden", marginTop: 11 }}><div style={{ height: "100%", width: progress + "%", background: progress >= 100 ? T.danger : pocket.color || T.primary, borderRadius: 8 }} /></div><div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, color: progress >= 100 ? T.danger : T.textMuted, fontSize: 10.5, fontWeight: 700 }}><span>{Math.round(progress)}% terpakai</span><span>Batas {rupiah(limit)}</span></div></> : <div style={{ color: T.textFaint, fontSize: 11.5, marginTop: 8 }}>Belum ada batas spend bulanan.</div>}
        </div>}

        <div style={{ display: "grid", gridTemplateColumns: isMain ? "1fr" : "1fr 1fr", gap: 8, marginTop: 12 }}><Button full size="md" icon={Plus} onClick={addToPocket}>Tambah Transaksi</Button>{!isMain && <Button full size="md" variant="secondary" icon={ArrowDownRight} onClick={onAllocate}>Tambah dari Utama</Button>}</div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 0 10px" }}><div><h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Riwayat Transaksi</h3><div style={{ color: T.textMuted, fontSize: 11.5, marginTop: 3 }}>{history.length} transaksi di kantong ini</div></div></div>
        <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
          {[['all', 'Semua'], ['income', 'Masuk'], ['expense', 'Keluar']].map(([value, label]) => <button key={value} type="button" onClick={() => setHistoryType(value)} style={{ flex: 1, padding: "9px 5px", borderRadius: 11, border: `1.5px solid ${historyType === value ? T.primary : T.border}`, background: historyType === value ? T.primaryLight : T.surface, color: historyType === value ? T.primary : T.textMuted, fontFamily: fontStack, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>{label}</button>)}
        </div>
        {history.length === 0 ? <EmptyState icon={Receipt} title="Belum ada transaksi" desc={isMain ? "Transaksi yang belum dipilihkan kantong akan tercatat di sini." : "Pilih kantong ini saat membuat transaksi agar riwayatnya muncul di sini."} action={<Button icon={Plus} onClick={addToPocket}>Tambah Transaksi</Button>} /> : history.map((t) => <TxRow key={t.id} t={t} cat={catMap[t.categoryId]} onClick={() => onEditTransaction(t)} />)}
      </div>
    </div>
  );
}

function PocketsPage({ data, onBack, onSavePocket, onDeletePocket, onSavePocketLimit, onAllocate, onQuickAdd, onEditTransaction }) {
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState("");
  const pockets = data.pockets || [];
  const visiblePockets = pockets.filter((pocket) => `${pocket.name} ${pocket.description || ""}`.toLowerCase().includes(query.toLowerCase()));
  const mainPocket = { id: "main", name: "Kantong Utama", description: "Transaksi umum dan saldo yang belum dipisahkan", color: T.primary, icon: "Wallet" };
  const selectedPocket = selectedId === "main" ? mainPocket : pockets.find((pocket) => pocket.id === selectedId);
  const selectedStats = selectedPocket ? getPocketStats(data.transactions, selectedPocket.id) : null;
  const mainStats = getPocketStats(data.transactions, "main");

  function handleDeletePocket(id) {
    onDeletePocket(id);
    setSelectedId(null);
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {selectedPocket ? <PocketDetailPage pocket={selectedPocket} stats={selectedStats} catMap={Object.fromEntries(data.categories.map((c) => [c.id, c]))} onBack={() => setSelectedId(null)} onEdit={() => setModal({ type: "edit", pocket: selectedPocket })} onDelete={() => handleDeletePocket(selectedPocket.id)} onSetLimit={() => setModal({ type: "limit", pocket: selectedPocket })} onAllocate={() => setModal({ type: "allocate", pocket: selectedPocket })} onQuickAdd={onQuickAdd} onEditTransaction={onEditTransaction} /> : <>
        <TopBar title="Kantong" onBack={onBack} right={<button type="button" aria-label="Buat kantong baru" onClick={() => setModal({ type: "new" })} style={{ background: T.primary, border: "none", borderRadius: 11, padding: 8, cursor: "pointer", display: "flex" }}><Plus size={18} color="#fff" /></button>} />
        <div style={{ padding: "0 18px" }}>
          <div style={{ padding: "2px 0 12px" }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Semua Kantong</h2>
            <div style={{ color: T.textMuted, fontSize: 11.5, marginTop: 3 }}>{pockets.length > 0 ? `${pockets.length + 1} kantong tersimpan` : "Atur uang sesuai kebutuhanmu"}</div>
          </div>

          <div style={{ position: "relative", marginBottom: 16 }}><Search size={17} color={T.textFaint} style={{ position: "absolute", left: 13, top: 14 }} /><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari kantong..." style={{ paddingLeft: 39, background: T.surface }} /></div>

          {query.trim() && visiblePockets.length === 0 ? <EmptyState icon={Search} title="Kantong tidak ditemukan" desc="Coba gunakan kata kunci lain." /> : <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <button type="button" onClick={() => setSelectedId("main")} style={{ minHeight: 152, textAlign: "left", border: `1px solid ${T.border}`, borderRadius: 17, padding: 13, background: T.goldLight, color: T.text, cursor: "pointer", fontFamily: fontStack, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}><span style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(192,138,46,0.14)", color: T.gold, display: "flex", alignItems: "center", justifyContent: "center" }}><Wallet size={18} /></span><ChevronRight size={16} color={T.textFaint} /></div>
              <div style={{ marginTop: "auto", fontSize: 12.5, fontWeight: 800 }}>Kantong Utama</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 3 }}>{mainStats.balance < 0 ? "-" : ""}{rupiah(mainStats.balance)}</div>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 4 }}>Masuk {rupiah(mainStats.income)} · Keluar {rupiah(mainStats.expense)}</div>
            </button>

            {visiblePockets.map((pocket) => {
              const stats = getPocketStats(data.transactions, pocket.id);
              const accent = pocket.color || T.primary;
              return <button key={pocket.id} type="button" onClick={() => setSelectedId(pocket.id)} style={{ minHeight: 152, textAlign: "left", border: `1px solid ${T.border}`, borderRadius: 17, padding: 13, background: `${accent}12`, color: T.text, cursor: "pointer", fontFamily: fontStack, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}><span style={{ width: 36, height: 36, borderRadius: 12, background: `${accent}1A`, color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}><CatIcon name={pocket.icon || "Wallet"} size={18} color={accent} /></span><ChevronRight size={16} color={T.textFaint} /></div>
                <div style={{ marginTop: "auto", fontSize: 12.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pocket.name}</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 3 }}>{stats.balance < 0 ? "-" : ""}{rupiah(stats.balance)}</div>
                <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 4 }}>{pocket.limit > 0 ? `Batas ${rupiah(pocket.limit)}` : "Batas spend belum diatur"}</div>
              </button>;
            })}

            {pockets.length === 0 && <button type="button" onClick={() => setModal({ type: "new" })} style={{ minHeight: 152, border: `1px dashed ${T.border}`, borderRadius: 17, padding: 13, background: "transparent", color: T.primary, cursor: "pointer", fontFamily: fontStack, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}><span style={{ width: 36, height: 36, borderRadius: 12, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={18} /></span><span style={{ fontSize: 12.5, fontWeight: 800, marginTop: 9 }}>Buat kantong baru</span><span style={{ fontSize: 10.5, color: T.textMuted, marginTop: 3 }}>Pisahkan uangmu</span></button>}
          </div>}
        </div>
      </>}

      <Modal open={modal?.type === "new" || modal?.type === "edit"} onClose={() => setModal(null)} title={modal?.type === "new" ? "Buat Kantong Baru" : "Edit Kantong"}>
        {modal && <PocketEditor key={`${modal.type}-${modal.pocket?.id || "new"}`} initial={modal.pocket} onSave={(pocket) => { onSavePocket(pocket); setModal(null); }} />}
      </Modal>
      <Modal open={modal?.type === "limit"} onClose={() => setModal(null)} title="Atur Batas Spend">
        {modal?.pocket && <PocketLimitEditor pocket={modal.pocket} onSave={(limit) => { onSavePocketLimit(modal.pocket.id, limit); setModal(null); }} />}
      </Modal>
      <Modal open={modal?.type === "allocate"} onClose={() => setModal(null)} title="Tambah dari Kantong Utama">
        {modal?.pocket && <PocketAllocationEditor pocket={modal.pocket} available={Math.max(0, mainStats.balance)} onSave={(amount) => { onAllocate(modal.pocket.id, amount); setModal(null); }} />}
      </Modal>
    </div>
  );
}

function TxRow({ t, cat, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 4px", cursor: "pointer", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: (cat?.color || T.textFaint) + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <CatIcon name={cat?.icon} size={18} color={cat?.color || T.textFaint} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.note || cat?.name || "Transaksi"}</div>
        <div style={{ fontSize: 11.5, color: T.textFaint, display: "flex", alignItems: "center", gap: 5 }}>
          {cat?.name} · {shortDate(t.date)} {t.recurring && <Repeat size={11} />} {t.photo && <ImageIcon size={11} />}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: t.type === "income" ? T.sage : T.danger, flexShrink: 0 }}>
        {t.type === "income" ? "+" : "-"}{rupiah(t.amount)}
      </div>
    </div>
  );
}

/* ============================= TRANSAKSI ============================= */
function fileToCompressedDataUrl(file, maxDim = 480, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = (height * maxDim) / width; width = maxDim; }
        else if (height > maxDim) { width = (width * maxDim) / height; height = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Kompres dataURL hasil jepretan kamera dengan cara yang sama seperti file upload,
// supaya ukuran foto nota tetap kecil dan aman disimpan (batas 5MB per key).
function compressDataUrl(dataUrl, maxDim = 480, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) { height = (height * maxDim) / width; width = maxDim; }
      else if (height > maxDim) { width = (width * maxDim) / height; height = maxDim; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/* ---- Kamera real-time (getUserMedia) — dipakai untuk memotret nota langsung ---- */
function CameraCapture({ onCapture, onClose, onPickGallery }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [facing, setFacing] = useState("environment"); // kamera belakang default (cocok utk foto nota)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (mode) => {
    setError(""); setReady(false);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch (err) {
      console.error("Gagal mengakses kamera:", err);
      setError("Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan di browser, lalu coba lagi — atau pilih foto dari galeri.");
    }
  }, [stopStream]);

  useEffect(() => {
    startCamera(facing);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  async function handleSnap() {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || !ready) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL("image/png");
    const compressed = await compressDataUrl(rawDataUrl, 480, 0.7);
    stopStream();
    onCapture(compressed);
  }

  return (
    <div style={{
      position: "absolute", inset: 0, background: "#000", zIndex: 80,
      display: "flex", flexDirection: "column", fontFamily: fontStack,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 16px 10px" }}>
        <button onClick={() => { stopStream(); onClose(); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", display: "flex" }}>
          <X size={20} color="#fff" />
        </button>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 13.5 }}>Foto Nota</span>
        <button onClick={() => setFacing(facing === "environment" ? "user" : "environment")} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", display: "flex" }}>
          <RefreshCw size={18} color="#fff" />
        </button>
      </div>
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {error ? (
          <div style={{ color: "#fff", textAlign: "center", padding: "0 30px", fontSize: 13.5, lineHeight: 1.6 }}>{error}</div>
        ) : (
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: ready ? "block" : "none" }} />
        )}
        {!ready && !error && (
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>Membuka kamera...</div>
        )}
        <div style={{ position: "absolute", inset: 24, border: "1.5px dashed rgba(255,255,255,0.4)", borderRadius: 16, pointerEvents: "none" }} />
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div style={{ padding: "18px 20px calc(env(safe-area-inset-bottom, 0px) + 22px)", display: "flex", justifyContent: "center", alignItems: "center", gap: 26 }}>
        <button
          onClick={() => { stopStream(); onPickGallery(); }}
          title="Pilih file dari perangkat"
          style={{
            width: 46, height: 46, borderRadius: 14, background: "rgba(255,255,255,0.15)", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ImageIcon size={20} color="#fff" />
        </button>
        <button
          onClick={handleSnap}
          disabled={!ready}
          style={{
            width: 68, height: 68, borderRadius: "50%", background: "#fff", border: "5px solid rgba(255,255,255,0.35)",
            cursor: ready ? "pointer" : "not-allowed", opacity: ready ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Camera size={26} color={T.primaryDark} />
        </button>
        <div style={{ width: 46, height: 46 }} />
      </div>
      <div style={{ textAlign: "center", paddingBottom: 10 }}>
        <span onClick={() => { stopStream(); onPickGallery(); }} style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
           Tidak mau foto langsung? Pilih file dari perangkat
        </span>
      </div>
    </div>
  );
}

function SelectOptionIcon({ option, size = 17 }) {
  if (!option?.icon) return null;
  if (typeof option.icon === "string") return <CatIcon name={option.icon} size={size} color={option.color || T.primary} />;
  const Icon = option.icon;
  return <Icon size={size} color={option.color || T.primary} />;
}

function SelectMenu({ value, onChange, options, placeholder, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const accent = selected?.color || T.primary;

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, border: `1.5px solid ${selected ? accent : T.border}`, borderRadius: 13, padding: "8px 12px", background: T.surface, color: T.text, fontFamily: fontStack, cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ width: 32, height: 32, borderRadius: 10, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <SelectOptionIcon option={selected} size={17} />
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: selected ? 700 : 500, color: selected ? T.text : T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={16} color={T.textFaint} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .16s ease", flexShrink: 0 }} />
      </button>

      {open && (
        <div role="listbox" aria-label={ariaLabel} style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)", zIndex: 25, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 6, boxShadow: "0 12px 28px rgba(31,42,36,0.16)", maxHeight: 230, overflowY: "auto" }}>
          {options.map((option) => (
            <button
              key={option.value || "default"}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => { onChange(option.value); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", border: "none", borderRadius: 10, background: option.value === value ? T.primaryLight : "transparent", color: option.value === value ? T.primary : T.text, fontFamily: fontStack, cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ width: 28, height: 28, borderRadius: 9, background: `${option.color || T.primary}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <SelectOptionIcon option={option} size={15} />
              </span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: option.value === value ? 800 : 600 }}>{option.label}</span>
              {option.value === value && <Check size={15} color={T.primary} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionForm({ initial, defaultPocketId = "", startWithCamera = false, categories, pockets = [], onSave, onClose, onDelete }) {
  const [type, setType] = useState(initial?.type || "expense");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId || categories.find((c) => c.kind === "expense")?.id || "");
  const [pocketId, setPocketId] = useState(initial?.pocketId || defaultPocketId || "");
  const [date, setDate] = useState(initial?.date || todayISO());
  const [note, setNote] = useState(initial?.note || "");
  const [photo, setPhoto] = useState(initial?.photo || null);
  const [recurring, setRecurring] = useState(initial?.recurring?.freq || "");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [showMore, setShowMore] = useState(Boolean(initial?.photo || initial?.recurring || (!initial && startWithCamera)));
  const fileRef = useRef(null);

  const filteredCats = categories.filter((c) => c.kind === type);
  const categoryOptions = filteredCats.map((category) => ({ value: category.id, label: category.name, icon: category.icon, color: category.color }));
  const pocketOptions = [{ value: "", label: "Kantong Utama", icon: Wallet, color: T.primary }, ...pockets.map((pocket) => ({ value: pocket.id, label: pocket.name, icon: Wallet, color: pocket.color || T.primary }))];
  useEffect(() => { if (!filteredCats.find((c) => c.id === categoryId)) setCategoryId(filteredCats[0]?.id || ""); /* eslint-disable-next-line */ }, [type]);
  useEffect(() => {
    if (initial) return undefined;
    if (startWithCamera) setCameraOpen(true);
    return undefined;
  }, [initial, startWithCamera]);

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    try { setPhoto(await fileToCompressedDataUrl(file)); } catch { /* ignore */ }
  }

  function handleCameraClose() {
    setCameraOpen(false);
    if (!initial && startWithCamera && !photo) onClose();
  }

  function submit() {
    const num = parseFloat(amount.replace(/[^\d]/g, ""));
    if (!num || num <= 0 || !categoryId) return;
    onSave({
      id: initial?.id || uid(),
      type, amount: num, categoryId, pocketId: pocketId || null, date, note: note.trim(), photo,
      recurring: recurring ? { freq: recurring } : null,
      deleted: false, createdAt: initial?.createdAt || Date.now(),
    });
  }

  return (
    <div>
      <div style={{ display: "flex", background: T.surfaceAlt, borderRadius: 14, padding: 4, marginBottom: 18 }}>
        {["expense", "income"].map((tp) => (
          <button key={tp} onClick={() => setType(tp)} style={{
            flex: 1, padding: "10px 0", borderRadius: 11, border: "none", cursor: "pointer",
            fontWeight: 800, fontSize: 13.5, fontFamily: fontStack,
            background: type === tp ? (tp === "income" ? T.sage : T.danger) : "transparent",
            color: type === tp ? "#fff" : T.textMuted,
          }}>
            {tp === "income" ? "Pemasukan" : "Pengeluaran"}
          </button>
        ))}
      </div>

      <Field label="Nominal">
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: 13, fontWeight: 700, color: T.textMuted }}>Rp</span>
          <TextInput
            value={amount ? Number(amount.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            placeholder="0" style={{ paddingLeft: 38, fontSize: 18, fontWeight: 800 }}
            inputMode="numeric"
          />
        </div>
      </Field>

      <Field label="Kategori">
        <SelectMenu value={categoryId} onChange={setCategoryId} options={categoryOptions} placeholder="Pilih kategori" ariaLabel="Pilih kategori" />
      </Field>

      <Field label="Masuk ke kantong">
        <SelectMenu value={pocketId} onChange={setPocketId} options={pocketOptions} placeholder="Kantong Utama" ariaLabel="Pilih kantong" />
        <div style={{ fontSize: 11, color: T.textFaint, marginTop: 5 }}>Pilih kantong agar transaksi muncul di riwayat yang tepat.</div>
      </Field>

      <Field label="Tanggal">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <Field label="Catatan (opsional)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="cth. Belanja bulanan di pasar" />
      </Field>

      <button type="button" onClick={() => setShowMore(!showMore)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${T.border}`, borderRadius: 13, background: T.surfaceAlt, color: T.primary, padding: "11px 13px", margin: "2px 0 14px", fontFamily: fontStack, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>
        <span>{showMore ? "Sembunyikan detail tambahan" : "Tambahkan detail tambahan"}</span>
        <ChevronDown size={16} style={{ transform: showMore ? "rotate(180deg)" : "none", transition: "transform .16s ease" }} />
      </button>
      {showMore && <div>
      <Field label="Ulangi transaksi (opsional)">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["", "Tidak berulang"], ["daily", "Harian"], ["weekly", "Mingguan"], ["monthly", "Bulanan"], ["yearly", "Tahunan"]].map(([val, label]) => (
            <button key={val} onClick={() => setRecurring(val)} style={{
              padding: "7px 12px", borderRadius: 10, cursor: "pointer", fontFamily: fontStack, fontSize: 12,
              fontWeight: 700, border: `1.5px solid ${recurring === val ? T.primary : T.border}`,
              background: recurring === val ? T.primaryLight : T.surface, color: recurring === val ? T.primary : T.textMuted,
            }}>
              {val && <Repeat size={11} style={{ marginRight: 4, verticalAlign: -1 }} />}{label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Foto nota (opsional)">
        {photo ? (
          <div style={{ position: "relative", width: 100 }}>
            <img src={photo} alt="nota" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 12, border: `1px solid ${T.border}` }} />
            <button onClick={() => setPhoto(null)} style={{ position: "absolute", top: -6, right: -6, background: T.danger, border: "2px solid #fff", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer" }}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setCameraOpen(true)} style={{
              width: 100, height: 100, borderRadius: 12, border: `1.5px dashed ${T.primary}`, background: T.primaryLight,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer",
            }}>
              <Camera size={20} color={T.primary} />
              <span style={{ fontSize: 10.5, color: T.primary, fontWeight: 700 }}>Buka Kamera</span>
            </button>
            {startWithCamera && <button onClick={() => fileRef.current.click()} style={{
              width: 100, height: 100, borderRadius: 12, border: `1.5px dashed ${T.border}`, background: T.surfaceAlt,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer",
            }}>
              <ImageIcon size={20} color={T.textMuted} />
              <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 700 }}>Pilih dari perangkat</span>
            </button>}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
        {cameraOpen && (
          <CameraCapture
            onCapture={(dataUrl) => { setPhoto(dataUrl); setCameraOpen(false); }}
            onClose={handleCameraClose}
            onPickGallery={() => { setCameraOpen(false); setTimeout(() => fileRef.current.click(), 50); }}
          />
        )}
      </Field>

      </div>}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        {initial && onDelete && (
          <Button variant="danger" icon={Trash2} onClick={() => onDelete(initial.id)}>Hapus</Button>
        )}
        <Button full size="lg" onClick={submit}>{initial ? "Simpan Perubahan" : "Simpan Transaksi"}</Button>
      </div>
    </div>
  );
}

function TransactionsPage({ data, onNav, onEdit, catMap }) {
  const [query, setQuery] = useState("");
  const defaultFilters = { range: "all", from: "", to: "", min: "", max: "", category: "all", type: "all" };
  const [filters, setFilters] = useState(defaultFilters);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const activeFilterCount = [filters.range !== "all", filters.min !== "", filters.max !== "", filters.category !== "all", filters.type !== "all"].filter(Boolean).length;
  const list = useMemo(() => {
    const now = new Date();
    return data.transactions.filter((t) => !t.deleted)
      .filter((t) => {
        if (filters.range === "7d") {
          const from = new Date(now);
          from.setHours(0, 0, 0, 0);
          from.setDate(from.getDate() - 6);
          return new Date(`${t.date}T00:00:00`) >= from;
        }
        if (filters.range === "month") {
          const d = new Date(`${t.date}T00:00:00`);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (filters.range === "custom") {
          const d = new Date(`${t.date}T00:00:00`);
          if (filters.from && d < new Date(`${filters.from}T00:00:00`)) return false;
          if (filters.to && d > new Date(`${filters.to}T23:59:59`)) return false;
        }
        return true;
      })
      .filter((t) => (filters.type === "all" ? true : t.type === filters.type))
      .filter((t) => (filters.category === "all" ? true : t.categoryId === filters.category))
      .filter((t) => {
        const min = filters.min ? Number(filters.min) : null;
        const max = filters.max ? Number(filters.max) : null;
        return (min == null || t.amount >= min) && (max == null || t.amount <= max);
      })
      .filter((t) => (t.note || "").toLowerCase().includes(query.toLowerCase()) || (catMap[t.categoryId]?.name || "").toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data, query, filters, catMap]);

  const grouped = useMemo(() => {
    const g = {};
    list.forEach((t) => { const k = shortDate(t.date); (g[k] = g[k] || []).push(t); });
    return g;
  }, [list]);
  const totalMoney = useMemo(() => {
    const { bersih, kotor } = computeBalances(data.transactions, data.categories);
    return bersih + kotor;
  }, [data.transactions, data.categories]);

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="Transaksi" />
      <div style={{ padding: "0 18px 14px" }}>
        <Card style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`, color: "#fff", border: "none", padding: 16, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", right: -40, top: -50, background: "rgba(255,255,255,0.07)" }} />
          <div style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.76, position: "relative" }}>Total uang</div>
          <div style={{ fontSize: 27, fontWeight: 800, marginTop: 4, position: "relative" }}>{totalMoney < 0 ? "-" : ""}{rupiah(totalMoney)}</div>
        </Card>
      </div>
      <div style={{ padding: "0 18px 10px", display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={16} color={T.textFaint} style={{ position: "absolute", left: 12, top: 13 }} />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari transaksi..." style={{ paddingLeft: 36 }} />
        </div>
        <button type="button" aria-label="Buka filter transaksi" onClick={() => { setDraftFilters(filters); setFilterOpen(true); }} style={{ width: 46, height: 46, borderRadius: 12, border: `1.5px solid ${activeFilterCount ? T.primary : T.border}`, background: activeFilterCount ? T.primaryLight : T.surface, color: activeFilterCount ? T.primary : T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
          <Filter size={18} />
          {activeFilterCount > 0 && <span style={{ position: "absolute", right: -3, top: -3, width: 16, height: 16, borderRadius: 8, background: T.gold, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeFilterCount}</span>}
        </button>
      </div>
      {activeFilterCount > 0 && <div style={{ padding: "0 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 11.5, color: T.textMuted }}>{activeFilterCount} filter aktif</span><button type="button" onClick={() => { setFilters(defaultFilters); setDraftFilters(defaultFilters); }} style={{ border: "none", background: "transparent", color: T.primary, fontWeight: 800, fontSize: 11.5, cursor: "pointer", padding: 0 }}>Reset filter</button></div>}
      <div style={{ padding: "0 18px" }}>
        {list.length === 0 ? (
          <EmptyState icon={Search} title="Tidak ditemukan" desc="Coba ubah kata kunci atau filter pencarian." />
        ) : Object.entries(grouped).map(([date, txs]) => (
          <div key={date} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: T.textFaint, margin: "12px 0 4px", textTransform: "uppercase" }}>{date}</div>
            {txs.map((t) => <TxRow key={t.id} t={t} cat={catMap[t.categoryId]} onClick={() => onEdit(t)} />)}
          </div>
        ))}
      </div>
      <Modal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter Transaksi"
        right={<button type="button" onClick={() => setDraftFilters(defaultFilters)} style={{ border: "none", background: "transparent", color: T.primary, fontWeight: 800, fontSize: 15, textDecoration: "underline", textDecorationColor: T.primary, textDecorationThickness: 3, textUnderlineOffset: 4, cursor: "pointer" }}>Reset</button>}
      >
        <div style={{ paddingBottom: 2 }}>
          <div style={{ color: T.textMuted, fontWeight: 800, fontSize: 13.5, margin: "8px 0 5px" }}>Rentang waktu</div>
          {[['7d', '7 hari terakhir'], ['month', 'Bulan ini'], ['custom', 'Atur rentang tanggal']].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setDraftFilters({ ...draftFilters, range: value })} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", border: "none", borderBottom: `1px solid ${T.border}`, background: "transparent", color: T.text, fontFamily: fontStack, fontSize: 15, textAlign: "left", cursor: "pointer" }}>
              <span>{label}</span>
              <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${draftFilters.range === value ? T.primary : T.textFaint}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{draftFilters.range === value && <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.primary }} />}</span>
            </button>
          ))}
          {draftFilters.range === "custom" && <div style={{ display: "flex", gap: 9, padding: "12px 0 4px" }}><TextInput type="date" value={draftFilters.from} onChange={(e) => setDraftFilters({ ...draftFilters, from: e.target.value })} style={{ flex: 1, fontSize: 12.5 }} /><TextInput type="date" value={draftFilters.to} onChange={(e) => setDraftFilters({ ...draftFilters, to: e.target.value })} style={{ flex: 1, fontSize: 12.5 }} /></div>}

          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 15 }}>
            <div style={{ color: T.textMuted, fontWeight: 800, fontSize: 13.5, marginBottom: 10 }}>Besar transaksi</div>
            <div style={{ display: "flex", gap: 10 }}>
              <TextInput value={draftFilters.min ? Number(draftFilters.min).toLocaleString("id-ID") : ""} onChange={(e) => setDraftFilters({ ...draftFilters, min: e.target.value.replace(/\D/g, "") })} placeholder="Dari Rp0" inputMode="numeric" style={{ flex: 1, background: T.surfaceAlt, border: "none" }} />
              <TextInput value={draftFilters.max ? Number(draftFilters.max).toLocaleString("id-ID") : ""} onChange={(e) => setDraftFilters({ ...draftFilters, max: e.target.value.replace(/\D/g, "") })} placeholder="Ke Rp0" inputMode="numeric" style={{ flex: 1, background: T.surfaceAlt, border: "none" }} />
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 16, paddingTop: 15 }}>
            <div style={{ color: T.textMuted, fontWeight: 800, fontSize: 13.5, marginBottom: 9 }}>Jenis transaksi</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[['all', 'Semua'], ['income', 'Pemasukan'], ['expense', 'Pengeluaran']].map(([value, label]) => <button key={value} type="button" onClick={() => setDraftFilters({ ...draftFilters, type: value })} style={{ flex: 1, padding: "10px 5px", borderRadius: 12, border: `1.5px solid ${draftFilters.type === value ? T.primary : T.border}`, background: draftFilters.type === value ? T.primaryLight : T.surface, color: draftFilters.type === value ? T.primary : T.textMuted, fontFamily: fontStack, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>{label}</button>)}
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 16, paddingTop: 15 }}>
            <div style={{ color: T.textMuted, fontWeight: 800, fontSize: 13.5, marginBottom: 9 }}>Kategori</div>
            <SelectMenu
              value={draftFilters.category === "all" ? "" : draftFilters.category}
              onChange={(value) => setDraftFilters({ ...draftFilters, category: value || "all" })}
              options={data.categories.map((c) => ({ value: c.id, label: c.name, icon: c.icon, color: c.color }))}
              placeholder="Pilih kategori"
              ariaLabel="Pilih kategori transaksi"
            />
          </div>

          <button type="button" onClick={() => { setFilters(draftFilters); setFilterOpen(false); }} style={{ width: "100%", marginTop: 20, padding: "15px 18px", border: "none", borderRadius: 14, background: T.primary, color: "#fff", fontFamily: fontStack, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Terapkan Filter</button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================= KATEGORI ============================= */
function CategoryEditor({ initial, onSave, onClose, onDelete }) {
  const [name, setName] = useState(initial?.name || "");
  const [kind, setKind] = useState(initial?.kind || "expense");
  const [saldo, setSaldo] = useState(initial?.saldo || "bersih");
  const [icon, setIcon] = useState(initial?.icon || "Tag");
  const [color, setColor] = useState(initial?.color || T.primary);
  const colors = ["#1A5C3A", "#C0673F", "#3B7CB8", "#8A6DB0", "#C08A2E", "#C64545", "#4F8A63", "#3B8A6B"];

  return (
    <div>
      <Field label="Nama kategori">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Kesehatan" />
      </Field>
      <Field label="Jenis">
        <div style={{ display: "flex", gap: 8 }}>
          {[["expense", "Pengeluaran"], ["income", "Pemasukan"]].map(([v, l]) => (
            <button key={v} onClick={() => setKind(v)} style={{
              flex: 1, padding: "10px", borderRadius: 12, cursor: "pointer", fontFamily: fontStack, fontWeight: 700, fontSize: 13,
              border: `1.5px solid ${kind === v ? T.primary : T.border}`, background: kind === v ? T.primaryLight : T.surface, color: kind === v ? T.primary : T.textMuted,
            }}>{l}</button>
          ))}
        </div>
      </Field>
      <Field label="Mapping ke jenis saldo">
        <div style={{ display: "flex", gap: 8 }}>
          {[["bersih", "Saldo Bersih (Pokok)"], ["kotor", "Saldo Kotor (Fleksibel)"]].map(([v, l]) => (
            <button key={v} onClick={() => setSaldo(v)} style={{
              flex: 1, padding: "10px", borderRadius: 12, cursor: "pointer", fontFamily: fontStack, fontWeight: 700, fontSize: 12,
              border: `1.5px solid ${saldo === v ? T.gold : T.border}`, background: saldo === v ? T.goldLight : T.surface, color: saldo === v ? T.gold : T.textMuted,
            }}>{l}</button>
          ))}
        </div>
      </Field>
      <Field label="Ikon">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {ICON_CHOICES.map((ic) => (
            <button key={ic} onClick={() => setIcon(ic)} style={{
              aspectRatio: "1", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${icon === ic ? color : T.border}`, background: icon === ic ? color + "18" : T.surface,
            }}>
              <CatIcon name={ic} size={17} color={icon === ic ? color : T.textMuted} />
            </button>
          ))}
        </div>
      </Field>
      <Field label="Warna">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {colors.map((c) => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 30, height: 30, borderRadius: "50%", background: c, cursor: "pointer",
              border: color === c ? `3px solid ${T.text}` : "3px solid transparent",
            }} />
          ))}
        </div>
      </Field>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        {initial && onDelete && <Button variant="danger" icon={Trash2} onClick={() => onDelete(initial.id)}>Hapus</Button>}
        <Button full size="lg" onClick={() => name.trim() && onSave({ id: initial?.id || uid(), name: name.trim(), kind, saldo, icon, color })}>
          {initial ? "Simpan Perubahan" : "Tambah Kategori"}
        </Button>
      </div>
    </div>
  );
}

function CategoriesPage({ categories, onSave, onDelete, onBack }) {
  const [modal, setModal] = useState(null); // null | 'new' | category
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Kelola Kategori" onBack={onBack} right={
        <button onClick={() => setModal("new")} style={{ background: T.primary, border: "none", borderRadius: 10, padding: 8, cursor: "pointer", display: "flex" }}>
          <Plus size={18} color="#fff" />
        </button>
      } />
      <div style={{ padding: "0 18px" }}>
        {["expense", "income"].map((kind) => (
          <div key={kind} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.textFaint, textTransform: "uppercase", margin: "10px 0 8px" }}>
              {kind === "expense" ? "Kategori Pengeluaran" : "Kategori Pemasukan"}
            </div>
            {categories.filter((c) => c.kind === kind).map((c) => (
              <div key={c.id} onClick={() => setModal(c)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: "pointer", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: c.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CatIcon name={c.icon} size={17} color={c.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</div>
                  <Badge tone={c.saldo === "bersih" ? "gold" : "info"}>{c.saldo === "bersih" ? "Saldo Bersih" : "Saldo Kotor"}</Badge>
                </div>
                <ChevronRight size={17} color={T.textFaint} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "new" ? "Kategori Baru" : "Edit Kategori"}>
        <CategoryEditor
          initial={modal && modal !== "new" ? modal : null}
          onSave={(c) => { onSave(c); setModal(null); }}
          onDelete={(id) => { onDelete(id); setModal(null); }}
        />
      </Modal>
    </div>
  );
}

/* ============================= BUDGETING ============================= */
function BudgetPage({ data, onSaveBudget, onBack }) {
  const [modal, setModal] = useState(null);
  const [limitVal, setLimitVal] = useState("");
  const statuses = budgetStatus(data.categories, data.budgets, data.transactions);
  const expenseCats = data.categories.filter((c) => c.kind === "expense");
  const unbudgeted = expenseCats.filter((c) => !data.budgets.find((b) => b.categoryId === c.id));

  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Anggaran Bulanan" onBack={onBack} />
      <div style={{ padding: "0 18px" }}>
        <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 14px" }}>{monthLabel(new Date())} — atur batas pengeluaran per kategori.</p>
        {statuses.map((b) => (
          <Card key={b.categoryId} style={{ marginBottom: 10 }} onClick={() => { setModal(b.categoryId); setLimitVal(String(b.limit)); }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CatIcon name={b.cat?.icon} size={16} color={b.cat?.color} />
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{b.cat?.name}</span>
              </div>
              {b.pct >= 100 ? <Badge tone="danger">Lewat batas</Badge> : b.pct >= 80 ? <Badge tone="warn">Mendekati</Badge> : <Badge tone="primary">Aman</Badge>}
            </div>
            <div style={{ height: 8, background: T.surfaceAlt, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: Math.min(100, b.pct) + "%", height: "100%", background: b.pct >= 100 ? T.danger : b.pct >= 80 ? T.warn : T.primary, borderRadius: 6 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: T.textMuted }}>
              <span>{rupiah(b.spent)} terpakai</span>
              <span>dari {rupiah(b.limit)}</span>
            </div>
          </Card>
        ))}
        {unbudgeted.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.textFaint, textTransform: "uppercase", margin: "18px 0 8px" }}>Belum diatur</div>
            {unbudgeted.map((c) => (
              <div key={c.id} onClick={() => { setModal(c.id); setLimitVal(""); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: "pointer", borderBottom: `1px solid ${T.border}` }}>
                <CatIcon name={c.icon} size={16} color={c.color} />
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5 }}>{c.name}</span>
                <Plus size={16} color={T.primary} />
              </div>
            ))}
          </>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title="Atur Batas Anggaran">
        <Field label="Batas bulanan">
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: 13, fontWeight: 700, color: T.textMuted }}>Rp</span>
            <TextInput value={limitVal ? Number(limitVal).toLocaleString("id-ID") : ""} onChange={(e) => setLimitVal(e.target.value.replace(/\D/g, ""))} style={{ paddingLeft: 38 }} inputMode="numeric" />
          </div>
        </Field>
        <Button full size="lg" onClick={() => { onSaveBudget(modal, parseFloat(limitVal) || 0); setModal(null); }}>Simpan</Button>
      </Modal>
    </div>
  );
}

/* ============================= GALERI NOTA ============================= */
function GalleryPage({ data, catMap, onOpenTx }) {
  const [filterCat, setFilterCat] = useState("all");
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(null);
  const allItems = useMemo(() => data.transactions
    .filter((t) => !t.deleted && t.photo)
    .sort((a, b) => new Date(b.date) - new Date(a.date)), [data.transactions]);
  const items = useMemo(() => allItems.filter((t) => {
    const categoryName = catMap[t.categoryId]?.name || "";
    const matchesCategory = filterCat === "all" || t.categoryId === filterCat;
    const matchesQuery = !query.trim() || `${t.note || ""} ${categoryName}`.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  }), [allItems, catMap, filterCat, query]);
  const albums = useMemo(() => {
    const categoryAlbums = data.categories.map((category) => {
      const categoryItems = allItems.filter((t) => t.categoryId === category.id);
      return { ...category, count: categoryItems.length, photo: categoryItems[0]?.photo };
    }).filter((category) => category.count > 0);
    return [
      { id: "all", name: "Semua nota", count: allItems.length, photo: allItems[0]?.photo, icon: "Image" },
      ...categoryAlbums,
    ];
  }, [allItems, data.categories]);
  const activeAlbum = albums.find((album) => album.id === filterCat) || albums[0];

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: "18px 18px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: T.text }}>Galeri Nota</h2>
      </div>
      <div style={{ padding: "0 18px 18px", position: "relative" }}>
        <Search size={17} color={T.textFaint} style={{ position: "absolute", left: 31, top: 14 }} />
        <TextInput id="gallery-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nota atau kategori..." style={{ paddingLeft: 40, background: T.surface, borderRadius: 14 }} />
      </div>

      <section aria-labelledby="gallery-albums-heading" style={{ padding: "0 18px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
          <h3 id="gallery-albums-heading" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>Koleksi</h3>
          {filterCat !== "all" && <button type="button" onClick={() => setFilterCat("all")} style={{ border: "none", background: "transparent", color: T.primary, fontFamily: fontStack, fontSize: 11.5, fontWeight: 800, cursor: "pointer", padding: 0 }}>Lihat semua</button>}
        </div>
        {albums.length === 1 && albums[0].count === 0 ? (
          <div style={{ padding: "17px 16px", border: `1px dashed ${T.border}`, borderRadius: 16, color: T.textMuted, fontSize: 12.5, lineHeight: 1.5 }}>
            Koleksi akan muncul setelah Anda menyimpan foto nota pada transaksi.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {albums.map((album) => {
              const selected = filterCat === album.id;
              const AlbumIcon = album.id === "all" ? ImageIcon : null;
              return (
                <button key={album.id} type="button" aria-pressed={selected} onClick={() => setFilterCat(album.id)} style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: 9, borderRadius: 17, border: `1.5px solid ${selected ? T.primary : T.border}`, background: selected ? T.primaryLight : T.surface, color: T.text, fontFamily: fontStack, textAlign: "left", cursor: "pointer", boxSizing: "border-box" }}>
                  <div style={{ width: 58, height: 58, borderRadius: 14, flexShrink: 0, overflow: "hidden", background: album.color ? `${album.color}22` : T.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {album.photo ? <img src={album.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : AlbumIcon && <AlbumIcon size={22} color={T.primary} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{album.name}</div>
                    <div style={{ marginTop: 3, fontSize: 11.5, color: T.textMuted }}>{album.count} nota</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="gallery-latest-heading" style={{ padding: "0 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
          <div>
            <h3 id="gallery-latest-heading" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>Nota terbaru</h3>
            <div style={{ marginTop: 3, fontSize: 11.5, color: T.textMuted }}>{activeAlbum?.name || "Semua nota"}</div>
          </div>
          <span style={{ fontSize: 11.5, color: T.textFaint, fontWeight: 700 }}>{items.length} foto</span>
        </div>
      </section>
      {items.length === 0 ? (
        <EmptyState icon={ImageIcon} title="Belum ada nota" desc="Foto nota yang Anda lampirkan pada transaksi akan tampil di sini." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, padding: "0 18px" }}>
          {items.map((t) => (
            <button key={t.id} type="button" onClick={() => setZoom(t)} aria-label={`Buka nota ${rupiah(t.amount)}`} style={{ aspectRatio: "1", position: "relative", cursor: "pointer", overflow: "hidden", padding: 0, border: "none", borderRadius: 16, background: T.surfaceAlt, boxShadow: "0 2px 8px rgba(31,42,36,0.07)" }}>
              <img src={t.photo} alt="Foto nota" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(20,32,24,0.78))", padding: "17px 7px 7px", fontSize: 9.5, color: "#fff", fontWeight: 800, textAlign: "left" }}>
                {rupiah(t.amount)}
              </div>
            </button>
          ))}
        </div>
      )}
      <Modal open={!!zoom} onClose={() => setZoom(null)} title={catMap[zoom?.categoryId]?.name || "Nota"}>
        {zoom && (
          <div>
            <img src={zoom.photo} alt="nota besar" style={{ width: "100%", borderRadius: 14, marginBottom: 14 }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: T.textMuted, fontSize: 13 }}>Nominal</span>
              <span style={{ fontWeight: 800 }}>{rupiah(zoom.amount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ color: T.textMuted, fontSize: 13 }}>Tanggal</span>
              <span style={{ fontWeight: 700 }}>{shortDate(zoom.date)}</span>
            </div>
            <Button full onClick={() => { setZoom(null); onOpenTx(zoom); }}>Lihat Detail Transaksi</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================= LAPORAN & ANALITIK ============================= */
function ReportsPage({ data, catMap }) {
  const [period, setPeriod] = useState("monthly"); // weekly, monthly, yearly
  const [customCat, setCustomCat] = useState("all");

  const filtered = useMemo(() => {
    const now = new Date();
    return data.transactions.filter((t) => {
      if (t.deleted || t.isPocketTransfer) return false;
      const d = new Date(t.date);
      if (period === "weekly") { const diffDays = (now - d) / 86400000; if (diffDays > 7 || diffDays < 0) return false; }
      if (period === "monthly") { if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false; }
      if (period === "yearly") { if (d.getFullYear() !== now.getFullYear()) return false; }
      if (customCat !== "all" && t.categoryId !== customCat) return false;
      return true;
    });
  }, [data, period, customCat]);

  const income = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  const trendData = useMemo(() => {
    const buckets = {};
    const now = new Date();
    const rangeDays = period === "weekly" ? 7 : period === "monthly" ? 30 : 365;
    data.transactions.filter((t) => !t.deleted && !t.isPocketTransfer).forEach((t) => {
      const d = new Date(t.date);
      if ((now - d) / 86400000 > rangeDays || d > now) return;
      const key = period === "yearly" ? d.toLocaleDateString("id-ID", { month: "short" }) : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      buckets[key] = buckets[key] || { name: key, Pemasukan: 0, Pengeluaran: 0, order: d.getTime() };
      if (t.type === "income") buckets[key].Pemasukan += t.amount; else buckets[key].Pengeluaran += t.amount;
    });
    return Object.values(buckets).sort((a, b) => a.order - b.order);
  }, [data, period]);

  const byCat = useMemo(() => {
    const m = {};
    filtered.filter((t) => t.type === "expense").forEach((t) => { m[t.categoryId] = (m[t.categoryId] || 0) + t.amount; });
    return Object.entries(m).map(([id, v]) => ({ id, name: catMap[id]?.name, value: v, color: catMap[id]?.color })).sort((a, b) => b.value - a.value);
  }, [filtered, catMap]);

  const insights = useMemo(() => {
    const list = [];
    if (byCat.length > 0) list.push(`Pengeluaran terbesar Anda pada ${period === "weekly" ? "minggu" : period === "monthly" ? "bulan" : "tahun"} ini adalah kategori "${byCat[0].name}" sebesar ${rupiah(byCat[0].value)}.`);
    if (net < 0) list.push("Pengeluaran melebihi pemasukan pada periode ini — pertimbangkan meninjau kategori dengan porsi terbesar.");
    else if (income > 0) list.push(`Anda berhasil menyisihkan ${rupiah(net)} (${Math.round((net / income) * 100)}% dari pemasukan) pada periode ini.`);
    const overB = budgetStatus(data.categories, data.budgets, data.transactions).filter((b) => b.pct >= 100);
    if (overB.length > 0) list.push(`${overB.length} kategori telah melewati batas anggaran bulan ini.`);
    return list;
  }, [byCat, net, income, data, period]);

  function exportCSV() {
    const rows = [["Tanggal", "Jenis", "Kategori", "Catatan", "Nominal"]];
    filtered.forEach((t) => rows.push([t.date, t.type === "income" ? "Pemasukan" : "Pengeluaran", catMap[t.categoryId]?.name || "", t.note || "", t.amount]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `laporan-keuangan-${period}-${todayISO()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="Laporan & Analitik" right={
        <button onClick={exportCSV} style={{ background: T.primaryLight, border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: fontStack, fontWeight: 700, fontSize: 12, color: T.primary }}>
          <FileDown size={15} /> Ekspor CSV
        </button>
      } />
      <div style={{ padding: "0 18px 12px", display: "flex", gap: 8 }}>
        {[["weekly", "Mingguan"], ["monthly", "Bulanan"], ["yearly", "Tahunan"]].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)} style={{
            flex: 1, padding: "9px 0", borderRadius: 11, cursor: "pointer", fontFamily: fontStack, fontWeight: 700, fontSize: 12.5,
            border: `1.5px solid ${period === v ? T.primary : T.border}`, background: period === v ? T.primary : T.surface, color: period === v ? "#fff" : T.textMuted,
          }}>{l}</button>
        ))}
      </div>
      <div style={{ padding: "0 18px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <Card style={{ flex: 1, padding: 12 }}>
            <div style={{ fontSize: 11, color: T.sage, fontWeight: 700 }}>Pemasukan</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{rupiah(income)}</div>
          </Card>
          <Card style={{ flex: 1, padding: 12 }}>
            <div style={{ fontSize: 11, color: T.danger, fontWeight: 700 }}>Pengeluaran</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{rupiah(expense)}</div>
          </Card>
          <Card style={{ flex: 1, padding: 12 }}>
            <div style={{ fontSize: 11, color: T.primary, fontWeight: 700 }}>Selisih</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: net >= 0 ? T.primary : T.danger }}>{net >= 0 ? "+" : "-"}{rupiah(net)}</div>
          </Card>
        </div>

        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Tren Kas Masuk vs Keluar</div>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid stroke={T.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: fontStack }} stroke={T.textFaint} />
                <YAxis tick={{ fontSize: 9, fontFamily: fontStack }} stroke={T.textFaint} width={36} tickFormatter={(v) => (v >= 1000000 ? v / 1000000 + "jt" : v >= 1000 ? v / 1000 + "rb" : v)} />
                <Tooltip formatter={(v) => rupiah(v)} contentStyle={{ fontFamily: fontStack, fontSize: 12, borderRadius: 10, border: `1px solid ${T.border}` }} />
                <Line type="monotone" dataKey="Pemasukan" stroke={T.sage} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Pengeluaran" stroke={T.danger} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Pengeluaran per Kategori</div>
          <div style={{ width: "100%", height: Math.max(120, byCat.length * 34) }}>
            <ResponsiveContainer>
              <BarChart data={byCat} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 11, fontFamily: fontStack }} stroke={T.textFaint} />
                <Tooltip formatter={(v) => rupiah(v)} contentStyle={{ fontFamily: fontStack, fontSize: 12, borderRadius: 10, border: `1px solid ${T.border}` }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {byCat.map((d, i) => <Cell key={i} fill={d.color || T.primary} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {insights.length > 0 && (
          <Card style={{ background: T.primaryDark, border: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Sparkles size={17} color={T.goldLight} />
              <span style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>Wawasan Otomatis</span>
            </div>
            {insights.map((ins, i) => (
              <div key={i} style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", marginBottom: 8, lineHeight: 1.5 }}>• {ins}</div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

/* ============================= GOALS ============================= */
function GoalsPage({ goals, onSave, onDelete, onBack, onContribute }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", target: "", deadline: "", icon: "PiggyBank" });
  const [contribAmt, setContribAmt] = useState("");
  const [celebrate, setCelebrate] = useState(null);

  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Target Tabungan" onBack={onBack} right={
        <button onClick={() => { setForm({ name: "", target: "", deadline: "", icon: "PiggyBank" }); setModal("new"); }} style={{ background: T.primary, border: "none", borderRadius: 10, padding: 8, cursor: "pointer", display: "flex" }}>
          <Plus size={18} color="#fff" />
        </button>
      } />
      <div style={{ padding: "0 18px" }}>
        {goals.length === 0 ? (
          <EmptyState icon={Target} title="Belum ada target" desc="Buat target tabungan seperti dana darurat atau liburan keluarga." />
        ) : goals.map((g) => {
          const pct = Math.min(100, (g.current / g.target) * 100);
          const done = pct >= 100;
          return (
            <Card key={g.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: T.goldLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CatIcon name={g.icon} size={17} color={T.gold} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{g.name}</div>
                    {g.deadline && <div style={{ fontSize: 11, color: T.textFaint }}>Target: {shortDate(g.deadline)}</div>}
                  </div>
                </div>
                {done && <Badge tone="gold">Tercapai! 🎉</Badge>}
              </div>
              <div style={{ height: 9, background: T.surfaceAlt, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: pct + "%", height: "100%", background: done ? T.gold : T.primary, borderRadius: 6 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
                <span>{rupiah(g.current)}</span>
                <span>{rupiah(g.target)} ({Math.round(pct)}%)</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {!done && (
                  <Button size="sm" variant="secondary" icon={Plus} onClick={() => { setModal(g.id); setContribAmt(""); }}>Tambah Dana</Button>
                )}
                <Button size="sm" variant="ghost" icon={Edit2} onClick={() => { setForm({ name: g.name, target: String(g.target), deadline: g.deadline || "", icon: g.icon }); setModal("edit-" + g.id); }}>Edit</Button>
                <Button size="sm" variant="danger" icon={Trash2} onClick={() => onDelete(g.id)}>Hapus</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={modal === "new" || (typeof modal === "string" && modal.startsWith("edit-"))} onClose={() => setModal(null)} title={modal === "new" ? "Target Baru" : "Edit Target"}>
        <Field label="Nama target"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth. Dana Darurat" /></Field>
        <Field label="Jumlah target">
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: 13, fontWeight: 700, color: T.textMuted }}>Rp</span>
            <TextInput value={form.target ? Number(form.target).toLocaleString("id-ID") : ""} onChange={(e) => setForm({ ...form, target: e.target.value.replace(/\D/g, "") })} style={{ paddingLeft: 38 }} />
          </div>
        </Field>
        <Field label="Tenggat waktu (opsional)"><TextInput type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
        <Button full size="lg" onClick={() => {
          if (!form.name.trim() || !form.target) return;
          const id = typeof modal === "string" && modal.startsWith("edit-") ? modal.slice(5) : uid();
          const existing = goals.find((g) => g.id === id);
          onSave({ id, name: form.name.trim(), target: parseFloat(form.target), current: existing?.current || 0, deadline: form.deadline, icon: form.icon });
          setModal(null);
        }}>Simpan Target</Button>
      </Modal>

      <Modal open={!!modal && typeof modal === "string" && !modal.startsWith("edit-") && modal !== "new"} onClose={() => setModal(null)} title="Tambah Dana ke Target">
        <Field label="Nominal">
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: 13, fontWeight: 700, color: T.textMuted }}>Rp</span>
            <TextInput value={contribAmt ? Number(contribAmt).toLocaleString("id-ID") : ""} onChange={(e) => setContribAmt(e.target.value.replace(/\D/g, ""))} style={{ paddingLeft: 38 }} />
          </div>
        </Field>
        <Button full size="lg" onClick={() => { const g = goals.find((x) => x.id === modal); onContribute(modal, parseFloat(contribAmt) || 0); if (g && g.current + parseFloat(contribAmt || 0) >= g.target) setCelebrate(g.name); setModal(null); }}>Tambahkan</Button>
      </Modal>

      <Modal open={!!celebrate} onClose={() => setCelebrate(null)} title="Selamat! 🎉">
        <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🎊</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Target "{celebrate}" tercapai!</div>
          <div style={{ color: T.textMuted, fontSize: 13, marginBottom: 18 }}>Kerja bagus mengelola keuangan rumah tangga Anda.</div>
          <Button full onClick={() => setCelebrate(null)}>Tutup</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================= LAINNYA / SETTINGS ============================= */
function ToggleSwitch({ on, onChange, disabled, ariaLabel }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel || (on ? "Nonaktifkan pengaturan" : "Aktifkan pengaturan")}
      aria-pressed={on}
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 46, height: 27, borderRadius: 999, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        background: on ? T.primary : T.border, position: "relative", flexShrink: 0, opacity: disabled ? 0.5 : 1,
        transition: "background .15s ease",
      }}
    >
      <div style={{
        width: 21, height: 21, borderRadius: "50%", background: "#fff", position: "absolute", top: 3,
        left: on ? 22 : 3, transition: "left .15s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
      }} />
    </button>
  );
}

function VerifyPinModal({ security, onSuccess, title = "Masukkan PIN" }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  function handleDigit(d) {
    if (pin.length >= 6) return;
    setErr("");
    const next = pin + d;
    setPin(next);
    if (next.length === 6) {
      if (simpleHash(next) === security.pinHash) onSuccess();
      else { setErr("PIN salah."); setTimeout(() => setPin(""), 300); }
    }
  }
  return (
    <div style={{ textAlign: "center", padding: "8px 0 10px" }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>{title}</div>
      <PinDots length={6} filled={pin.length} />
      {err && <div style={{ color: T.danger, fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>{err}</div>}
      <PinKeypad onDigit={handleDigit} onBackspace={() => setPin(pin.slice(0, -1))} />
    </div>
  );
}

function ProfileEditor({ account, onSave }) {
  const [form, setForm] = useState({
    name: account?.name || "",
    email: account?.email || "",
    phone: account?.phone || "",
    occupation: account?.occupation || "",
  });
  const [err, setErr] = useState("");

  function submit() {
    if (!form.name.trim()) return setErr("Nama lengkap wajib diisi.");
    if (!/\S+@\S+\.\S+/.test(form.email)) return setErr("Format email tidak valid.");
    setErr("");
    onSave({
      ...account,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      occupation: form.occupation.trim(),
    });
  }

  return (
    <div>
      <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.55, margin: "0 0 18px" }}>
        Lengkapi data diri agar profil dan catatan keuangan Anda lebih personal.
      </p>
      <Field label="Nama lengkap">
        <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth. Bito" />
      </Field>
      <Field label="Email">
        <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nama@email.com" />
      </Field>
      <Field label="Nomor WhatsApp (opsional)">
        <TextInput type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" inputMode="tel" />
      </Field>
      <Field label="Pekerjaan (opsional)">
        <TextInput value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="cth. Ibu rumah tangga" />
      </Field>
      {err && <div style={{ color: T.danger, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{err}</div>}
      <Button full size="lg" icon={Check} onClick={submit}>Simpan Data Diri</Button>
    </div>
  );
}

function PasswordEditor({ account, onSave }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  function submit() {
    if (current !== account?.password) return setErr("Password saat ini tidak sesuai.");
    if (next.length < 8 || !/\d/.test(next) || !/[A-Z]/.test(next)) return setErr("Password baru harus minimal 8 karakter, memiliki angka dan huruf besar.");
    if (next !== confirm) return setErr("Konfirmasi password tidak cocok.");
    setErr("");
    onSave(next);
  }

  return (
    <div>
      <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.55, margin: "0 0 18px" }}>
        Gunakan password yang kuat dan jangan bagikan kepada orang lain.
      </p>
      <Field label="Password saat ini">
        <TextInput type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Masukkan password saat ini" />
      </Field>
      <Field label="Password baru">
        <TextInput type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Minimal 8 karakter" />
      </Field>
      <Field label="Konfirmasi password baru">
        <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ulangi password baru" />
      </Field>
      {err && <div style={{ color: T.danger, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{err}</div>}
      <Button full size="lg" icon={Lock} onClick={submit}>Simpan Password</Button>
    </div>
  );
}

function MorePage({ onNav, onLogout, account, data, onImport, onUpdateAccount }) {
  const fileRef = useRef(null);
  const [profileModal, setProfileModal] = useState(false);
  const game = useMemo(() => getGamification(data), [data]);
  const items = [
    { icon: Tag, label: "Kelola Kategori", desc: "Tambah, ubah, atau hapus kategori", nav: "categories" },
    { icon: Target, label: "Target Tabungan", desc: "Kelola tujuan menabung Anda", nav: "goals" },
    { icon: AlertTriangle, label: "Anggaran Bulanan", desc: "Atur batas pengeluaran per kategori", nav: "budget" },
    { icon: PieIcon, label: "Laporan Keuangan", desc: "Ringkasan pemasukan dan pengeluaran", nav: "report" },
  ];
  function exportBackup() {
    const workbook = buildExcelBackup(account, data);
    XLSX.writeFile(workbook, `cadangan-keuangan-${todayISO()}.xlsx`, { compression: true });
  }
  function importBackup(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, { type: "array", cellDates: true });
        onImport(importExcelBackup(workbook, account, data));
      } catch (error) {
        alert(error?.message || "File Excel cadangan tidak valid.");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  }
  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="Profil" />
      <div style={{ padding: "0 18px" }}>
        <Card onClick={() => setProfileModal(true)} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, cursor: "pointer" }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: T.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17 }}>
            {account?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{account?.name}</div>
            <div style={{ fontSize: 12.5, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account?.email}</div>
            {(account?.phone || account?.occupation) && <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 2 }}>{account?.phone || account?.occupation}</div>}
          </div>
          <button type="button" aria-label="Edit data diri" onClick={(e) => { e.stopPropagation(); setProfileModal(true); }} style={{ width: 34, height: 34, borderRadius: 11, border: "none", background: T.primaryLight, color: T.primary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Edit2 size={16} />
          </button>
        </Card>

        <button type="button" onClick={() => onNav("rewards")} aria-label={`Buka level dan reward, level ${game.current.title}`} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, border: `1px solid ${T.border}`, borderRadius: 14, padding: "11px 13px", background: T.surface, color: T.text, fontFamily: fontStack, textAlign: "left", cursor: "pointer", marginBottom: 18 }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: T.goldLight, color: T.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Sparkles size={18} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>Level: {game.current.title}</span>
            <span style={{ display: "block", fontSize: 11, color: T.textFaint, marginTop: 2 }}>Buka reward dengan mengumpulkan poin</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: T.gold, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 800 }}>{game.points} poin</span>
            <ChevronRight size={17} />
          </span>
        </button>

        <div style={{ fontSize: 12, fontWeight: 800, color: T.textFaint, textTransform: "uppercase", margin: "4px 0 8px" }}>Pengaturan</div>
        {items.map((it) => (
          <div key={it.nav} onClick={() => onNav(it.nav)} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 4px", cursor: "pointer", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <it.icon size={18} color={T.primary} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{it.label}</div>
              <div style={{ fontSize: 11.5, color: T.textFaint }}>{it.desc}</div>
            </div>
            <ChevronRight size={17} color={T.textFaint} />
          </div>
        ))}

        <div onClick={() => onNav("security")} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 4px", cursor: "pointer", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldCheck size={18} color={T.primary} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Keamanan & Privasi</div>
            <div style={{ fontSize: 11.5, color: T.textFaint }}>Atur password, PIN, dan biometrik</div>
          </div>
          <ChevronRight size={17} color={T.textFaint} />
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: T.textFaint, textTransform: "uppercase", margin: "0 0 5px" }}>Cadangan Data (Excel)</div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 9 }}>Simpan dan pulihkan data lewat workbook Excel yang rapi.</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <Button variant="secondary" icon={FileDown} onClick={exportBackup} full>Ekspor Excel</Button>
          <Button variant="outline" icon={RefreshCw} onClick={() => fileRef.current.click()} full>Impor Excel</Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style={{ display: "none" }} onChange={importBackup} />
        </div>

        <Button variant="danger" icon={LogOut} full onClick={onLogout}>Keluar Akun</Button>
      </div>

      <Modal open={profileModal} onClose={() => setProfileModal(false)} title="Edit Data Diri">
        <ProfileEditor account={account} onSave={(nextAccount) => { onUpdateAccount(nextAccount); setProfileModal(false); }} />
      </Modal>
    </div>
  );
}

function SecurityPrivacyPage({ security, account, onBack, onSetPin, onDisablePin, onToggleBiometric, onUpdateAccount }) {
  const [secModal, setSecModal] = useState(null); // null | 'setpin' | 'disablepin' | 'password'
  const [bioErr, setBioErr] = useState("");
  const [bioSupported, setBioSupported] = useState(true);
  useEffect(() => { isBiometricAvailable().then(setBioSupported); }, []);

  const rowStyle = (last = false) => ({
    display: "flex",
    alignItems: "center",
    gap: 13,
    padding: "13px 4px",
    borderBottom: last ? "none" : `1px solid ${T.border}`,
  });

  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Keamanan & Privasi" onBack={onBack} />
      <div style={{ padding: "4px 18px 0" }}>
        <Card style={{ padding: "4px 10px" }}>
          <div onClick={() => setSecModal("password")} style={{ ...rowStyle(), cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Lock size={17} color={T.primary} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Password</div>
              <div style={{ fontSize: 11.5, color: T.textFaint }}>Ubah password untuk menjaga akun</div>
            </div>
            <ChevronRight size={17} color={T.textFaint} />
          </div>

          <div style={rowStyle()}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Lock size={17} color={T.primary} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Kunci dengan PIN</div>
              <div style={{ fontSize: 11.5, color: T.textFaint }}>PIN 6-digit saat membuka aplikasi</div>
            </div>
            <ToggleSwitch
              on={security.pinEnabled}
              onChange={(next) => { if (next) setSecModal("setpin"); else setSecModal("disablepin"); }}
            />
          </div>

          <div style={rowStyle(true)}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Fingerprint size={17} color={T.primary} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Kunci dengan Sidik Jari</div>
              <div style={{ fontSize: 11.5, color: T.textFaint }}>
                {bioSupported ? "Gunakan biometrik perangkat" : "Tidak didukung di perangkat ini"}
              </div>
            </div>
            <ToggleSwitch
              on={security.biometricEnabled}
              disabled={!bioSupported}
              onChange={async (next) => {
                setBioErr("");
                if (next) {
                  try {
                    const credId = await registerBiometric(account);
                    onToggleBiometric(true, credId);
                  } catch (e) {
                    setBioErr("Pendaftaran sidik jari gagal atau dibatalkan.");
                  }
                } else {
                  onToggleBiometric(false, null);
                }
              }}
            />
          </div>
        </Card>

        {bioErr && <div style={{ color: T.danger, fontSize: 12, fontWeight: 600, margin: "10px 4px 0" }}>{bioErr}</div>}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: T.infoLight, borderRadius: 12, padding: "10px 12px", marginTop: 14 }}>
          <ShieldCheck size={16} color={T.info} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11.5, color: T.info, margin: 0, lineHeight: 1.45 }}>Password, PIN, dan data biometrik hanya disimpan di perangkat ini.</p>
        </div>
      </div>

      <Modal open={secModal === "setpin"} onClose={() => setSecModal(null)} title="Aktifkan Kunci PIN">
        <SetPinModal onSave={(pin) => { onSetPin(pin); setSecModal(null); }} onClose={() => setSecModal(null)} />
      </Modal>
      <Modal open={secModal === "disablepin"} onClose={() => setSecModal(null)} title="Nonaktifkan Kunci PIN">
        <VerifyPinModal security={security} title="Masukkan PIN untuk menonaktifkan" onSuccess={() => { onDisablePin(); setSecModal(null); }} />
      </Modal>
      <Modal open={secModal === "password"} onClose={() => setSecModal(null)} title="Ubah Password">
        <PasswordEditor account={account} onSave={(newPassword) => { onUpdateAccount({ ...account, password: newPassword }); setSecModal(null); }} />
      </Modal>
    </div>
  );
}

function NotificationsPage({ notifications, notificationsEnabled, onBack, onMarkAll, onToggle }) {
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Notifikasi" onBack={onBack} right={
        notifications.length > 0 && <span onClick={onMarkAll} style={{ fontSize: 12, color: T.primary, fontWeight: 700, cursor: "pointer" }}>Tandai dibaca</span>
      } />
      <div style={{ padding: "0 18px" }}>
        <Card style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", marginBottom: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Bell size={18} color={T.primary} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Notifikasi aplikasi</div>
            <div style={{ fontSize: 11.5, color: T.textFaint }}>{notificationsEnabled ? "Peringatan anggaran dan pengingat aktif" : "Peringatan baru sedang dimatikan"}</div>
          </div>
          <ToggleSwitch on={notificationsEnabled} onChange={onToggle} ariaLabel="Notifikasi aplikasi" />
        </Card>
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={notificationsEnabled ? "Belum ada notifikasi" : "Notifikasi dimatikan"}
            desc={notificationsEnabled ? "Peringatan anggaran dan pengingat akan muncul di sini." : "Aktifkan kembali untuk menerima peringatan anggaran dan pengingat."}
          />
        ) : notifications.slice().reverse().map((n) => (
          <div key={n.id} style={{ display: "flex", gap: 12, padding: "12px 4px", borderBottom: `1px solid ${T.border}`, opacity: n.read ? 0.6 : 1 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: n.tone === "danger" ? T.dangerLight : n.tone === "gold" ? T.goldLight : T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {n.tone === "danger" ? <AlertTriangle size={16} color={T.danger} /> : n.tone === "gold" ? <Target size={16} color={T.gold} /> : <Bell size={16} color={T.primary} />}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{n.message}</div>
              <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>{shortDate(n.date)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickAddMenu({ open, onClose, onSelect }) {
  const actions = [
    { id: "scan", title: "Scan Nota", icon: Camera, color: T.gold },
    { id: "manual", title: "Isi sendiri", icon: Edit2, color: T.primary },
  ];
  if (!open) return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 65 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(20,25,22,0.03)" }} />
      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: "50%", bottom: 102, transform: "translateX(-50%)", display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
        {actions.map((action, index) => (
          <div key={action.id} style={{ animation: "kxUp .18s ease both", animationDelay: `${index * 35}ms` }}>
            <button type="button" aria-label={action.title} title={action.title} onClick={() => onSelect(action.id)} style={{ width: 48, height: 48, borderRadius: "50%", border: "none", background: action.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 8px 18px ${action.color}55` }}>
              <action.icon size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================= BOTTOM NAV ============================= */
function BottomNav({ tab, onTab, onQuickAdd }) {
  const items = [
    { key: "dashboard", icon: Home, label: "Beranda" },
    { key: "transactions", icon: Receipt, label: "Transaksi" },
    { key: "quickadd", icon: Plus, label: "" },
    { key: "gallery", icon: ImageIcon, label: "Galeri" },
    { key: "profile", icon: UserIcon, label: "Profil" },
  ];
  return (
    <nav aria-label="Navigasi utama" style={{
      position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.98)",
      borderTop: `1px solid ${T.border}`, display: "flex", gap: 3,
      padding: "8px 8px calc(env(safe-area-inset-bottom, 0px) + 8px)",
      alignItems: "center", zIndex: 40, boxShadow: "0 -8px 24px rgba(31,42,36,0.08)",
      minHeight: 76, boxSizing: "border-box",
    }}>
      {items.map((it) => {
        if (it.key === "quickadd") {
          return (
            <div key="fab" style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
              <button type="button" aria-label="Tambah transaksi cepat" onClick={onQuickAdd} style={{
                width: 58, height: 58, borderRadius: "50%", background: T.primary, border: "none",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                boxShadow: `0 8px 18px ${T.primary}55`, marginTop: -24, flexShrink: 0,
              }}>
                <Plus size={24} color="#fff" />
              </button>
            </div>
          );
        }
        const active = tab === it.key;
        return (
          <button key={it.key} type="button" aria-current={active ? "page" : undefined} onClick={() => onTab(it.key)} style={{
            flex: 1, minWidth: 0, minHeight: 52, background: active ? T.primaryLight : "transparent",
            border: "none", borderRadius: 14, cursor: "pointer", display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
            padding: "5px 2px", fontFamily: fontStack, transition: "background .16s ease, transform .12s ease",
          }}>
            <it.icon size={20} color={active ? T.primary : T.textFaint} strokeWidth={active ? 2.5 : 2} />
            <span style={{ fontSize: 10.5, lineHeight: 1, fontWeight: active ? 800 : 700, color: active ? T.primary : T.textFaint, whiteSpace: "nowrap" }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ============================= ROOT APP ============================= */
export default function App() {
  useGoogleFont();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [data, setData] = useState(emptyData());
  const [authed, setAuthed] = useState(false);
  const [authScreen, setAuthScreen] = useState("login");
  const [tab, setTab] = useState("dashboard");
  const [subpage, setSubpage] = useState(null); // categories/budget/goals/notifications/more-sub
  const [txModal, setTxModal] = useState(null); // null | 'new' | tx object
  const [quickAddPocketId, setQuickAddPocketId] = useState("");
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [quickMode, setQuickMode] = useState("manual");
  const [toast, setToast] = useState(null);
  const undoRef = useRef(null);
  const [security, setSecurity] = useState({ pinEnabled: false, pinHash: null, biometricEnabled: false, biometricCredentialId: null });
  const [appLocked, setAppLocked] = useState(false);

  useEffect(() => {
    (async () => {
      const { account: acc, data: d, session } = await loadAll();
      setAccount(acc); setData(d);
      const sec = await loadSecurity();
      setSecurity(sec);
      if (acc && session?.loggedIn) setAuthed(true);
      if (sec.pinEnabled || sec.biometricEnabled) setAppLocked(true);
      setLoading(false);
    })();
  }, []);

  function persistSecurity(next) { setSecurity(next); saveSecurity(next); }
  function handleSetPin(pin) { persistSecurity({ ...security, pinEnabled: true, pinHash: simpleHash(pin) }); }
  function handleDisablePin() { persistSecurity({ ...security, pinEnabled: false, pinHash: null }); }
  function handleToggleBiometric(enabled, credId) { persistSecurity({ ...security, biometricEnabled: enabled, biometricCredentialId: enabled ? credId : null }); }

  const persist = useCallback((next) => { setData(next); saveData(next); }, []);

  function showToast(message, onUndo) {
    setToast({ message, onUndo });
    clearTimeout(undoRef.current);
    undoRef.current = setTimeout(() => setToast(null), 4000);
  }

  function openQuickMenu(pocketId = "") {
    setQuickAddPocketId(pocketId === "main" ? "" : pocketId || "");
    setQuickMenuOpen(true);
  }
  function chooseQuickMode(mode) {
    setQuickMenuOpen(false);
    setQuickMode(mode);
    setTxModal("new");
  }

  function addNotification(message, tone = "primary") {
    if (data.notificationsEnabled === false) return;
    persist({ ...data, notifications: [...data.notifications, { id: uid(), message, tone, date: todayISO(), read: false }] });
  }

  /* ----- AUTH HANDLERS ----- */
  async function handleSignUpDone(acc) {
    await saveAccount(acc); setAccount(acc);
    await saveSession({ loggedIn: true }); setAuthed(true);
  }
  async function handleLogin(remember) {
    if (remember) await saveSession({ loggedIn: true });
    setAuthed(true);
  }
  async function handleReset(newPw) {
    const updated = { ...account, password: newPw };
    await saveAccount(updated); setAccount(updated);
  }
  async function handleUpdateAccount(updated) {
    await saveAccount(updated);
    setAccount(updated);
  }
  async function handleLogout() {
    await saveSession(null); setAuthed(false); setAuthScreen("login"); setTab("dashboard"); setSubpage(null);
    if (security.pinEnabled || security.biometricEnabled) setAppLocked(true);
  }

  /* ----- DATA HANDLERS ----- */
  const catMap = useMemo(() => Object.fromEntries(data.categories.map((c) => [c.id, c])), [data.categories]);

  function saveTransaction(tx) {
    const exists = data.transactions.find((t) => t.id === tx.id);
    const nextTx = exists ? data.transactions.map((t) => (t.id === tx.id ? tx : t)) : [...data.transactions, tx];
    persist({ ...data, transactions: nextTx });
    setTxModal(null); setQuickAddPocketId(""); setQuickMode("manual");
    const bstat = budgetStatus(data.categories, data.budgets, nextTx).find((b) => b.categoryId === tx.categoryId);
    if (bstat && bstat.pct >= 100) addNotification(`Anggaran "${catMap[tx.categoryId]?.name}" telah melewati batas bulan ini.`, "danger");
    else if (bstat && bstat.pct >= 80) addNotification(`Anggaran "${catMap[tx.categoryId]?.name}" mendekati batas (${Math.round(bstat.pct)}%).`, "warn");
  }
  function savePocket(pocket) {
    const currentPockets = data.pockets || [];
    const exists = currentPockets.find((item) => item.id === pocket.id);
    const nextPockets = exists ? currentPockets.map((item) => item.id === pocket.id ? pocket : item) : [...currentPockets, pocket];
    persist({ ...data, pockets: nextPockets });
  }
  function deletePocket(id) {
    const currentPockets = data.pockets || [];
    persist({ ...data, pockets: currentPockets.filter((item) => item.id !== id), transactions: data.transactions.map((t) => t.pocketId === id ? { ...t, pocketId: null } : t) });
  }
  function savePocketLimit(id, limit) {
    const currentPockets = data.pockets || [];
    persist({ ...data, pockets: currentPockets.map((item) => item.id === id ? { ...item, limit } : item) });
  }
  function allocateToPocket(id, amount) {
    const pocket = (data.pockets || []).find((item) => item.id === id);
    const available = getPocketStats(data.transactions, "main").balance;
    if (!pocket || amount <= 0 || amount > available) { showToast("Nominal melebihi saldo Kantong Utama."); return; }
    const expenseCategory = data.categories.find((category) => category.kind === "expense")?.id || data.categories[0]?.id;
    const incomeCategory = data.categories.find((category) => category.kind === "income")?.id || data.categories[0]?.id;
    const transferId = uid();
    const base = { date: todayISO(), photo: null, recurring: null, deleted: false, createdAt: Date.now(), isPocketTransfer: true, transferId };
    const outgoing = { ...base, id: uid(), type: "expense", amount, categoryId: expenseCategory, pocketId: null, note: `Tabungan ke ${pocket.name}` };
    const incoming = { ...base, id: uid(), type: "income", amount, categoryId: incomeCategory, pocketId: id, note: "Tambahan dari Kantong Utama" };
    persist({ ...data, transactions: [...data.transactions, outgoing, incoming] });
    showToast(`${rupiah(amount)} ditambahkan ke ${pocket.name}.`);
  }
  function deleteTransaction(id) {
    const tx = data.transactions.find((t) => t.id === id);
    const nextTx = data.transactions.map((t) => (t.id === id ? { ...t, deleted: true } : t));
    persist({ ...data, transactions: nextTx });
    setTxModal(null);
    showToast("Transaksi dihapus.", () => {
      const restored = data.transactions.map((t) => (t.id === id ? { ...t, deleted: false } : t));
      persist({ ...data, transactions: restored }); setToast(null);
    });
  }
  function saveCategory(cat) {
    const exists = data.categories.find((c) => c.id === cat.id);
    const next = exists ? data.categories.map((c) => (c.id === cat.id ? cat : c)) : [...data.categories, cat];
    persist({ ...data, categories: next });
  }
  function deleteCategory(id) {
    persist({ ...data, categories: data.categories.filter((c) => c.id !== id), budgets: data.budgets.filter((b) => b.categoryId !== id) });
  }
  function saveBudget(categoryId, limit) {
    const exists = data.budgets.find((b) => b.categoryId === categoryId);
    const next = exists ? data.budgets.map((b) => (b.categoryId === categoryId ? { ...b, limit } : b)) : [...data.budgets, { categoryId, limit, period: "monthly" }];
    persist({ ...data, budgets: next });
  }
  function saveGoal(goal) {
    const exists = data.goals.find((g) => g.id === goal.id);
    const next = exists ? data.goals.map((g) => (g.id === goal.id ? goal : g)) : [...data.goals, goal];
    persist({ ...data, goals: next });
  }
  function deleteGoal(id) { persist({ ...data, goals: data.goals.filter((g) => g.id !== id) }); }
  function contributeGoal(id, amt) {
    persist({ ...data, goals: data.goals.map((g) => (g.id === id ? { ...g, current: g.current + amt } : g)) });
  }
  function markAllRead() { persist({ ...data, notifications: data.notifications.map((n) => ({ ...n, read: true })) }); }
  function importBackup(parsed) {
    if (parsed.account) { setAccount(parsed.account); saveAccount(parsed.account); }
    if (parsed.data) { persist(parsed.data); }
    showToast("Data berhasil dipulihkan dari file Excel.");
  }
  function finishOnboarding(budgetVals) {
    const budgets = Object.entries(budgetVals).filter(([, v]) => v).map(([categoryId, v]) => ({ categoryId, limit: parseFloat(v), period: "monthly" }));
    persist({ ...data, budgets, onboarded: true });
  }

  const shellStyle = {
    width: 390, maxWidth: "100%", height: 780, maxHeight: "100vh", margin: "0 auto",
    background: T.bg, position: "relative", overflow: "hidden", fontFamily: fontStack,
    borderRadius: 28, boxShadow: "0 0 0 1px rgba(0,0,0,0.04), 0 20px 60px rgba(20,40,30,0.15)",
    display: "flex", flexDirection: "column",
  };

  if (loading) {
    return (
      <div style={{ ...shellStyle, alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: T.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Wallet size={22} color="#fff" />
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div style={shellStyle}>
        <style>{`@keyframes kxUp { from { transform: translateY(16px); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>
        <div style={{ flex: 1, overflow: "hidden" }}>
          {authScreen === "login" && <LoginScreen account={account} onSwitch={setAuthScreen} onLogin={handleLogin} />}
          {authScreen === "signup" && <SignUpScreen existing={account} onSwitch={setAuthScreen} onDone={handleSignUpDone} />}
          {authScreen === "forgot" && <ForgotPasswordScreen account={account} onSwitch={setAuthScreen} onReset={handleReset} />}
        </div>
      </div>
    );
  }

  if (!data.onboarded) {
    return (
      <div style={shellStyle}>
        <style>{`@keyframes kxUp { from { transform: translateY(16px); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>
        <Onboarding categories={data.categories} onFinish={finishOnboarding} />
      </div>
    );
  }

  if (appLocked && (security.pinEnabled || security.biometricEnabled)) {
    return (
      <div style={shellStyle}>
        <style>{`@keyframes kxUp { from { transform: translateY(16px); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>
        <AppLockScreen security={security} account={account} onUnlock={() => setAppLocked(false)} />
      </div>
    );
  }

  function nav(dest, arg) {
    if (["categories", "budget", "goals", "notifications", "rewards", "pockets", "security"].includes(dest)) setSubpage(dest);
    else if (dest === "txdetail") { const t = data.transactions.find((x) => x.id === arg); setTxModal(t); }
    else if (dest === "transactions") setTab("transactions");
    else if (dest === "report") setTab("report");
  }

  return (
    <div style={shellStyle}>
      <style>{`@keyframes kxUp { from { transform: translateY(16px); opacity:0 } to { transform: translateY(0); opacity:1 } }
        ::-webkit-scrollbar{width:0;height:0}`}</style>
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {subpage === "categories" && <CategoriesPage categories={data.categories} onSave={saveCategory} onDelete={deleteCategory} onBack={() => setSubpage(null)} />}
        {subpage === "budget" && <BudgetPage data={data} onSaveBudget={saveBudget} onBack={() => setSubpage(null)} />}
        {subpage === "goals" && <GoalsPage goals={data.goals} onSave={saveGoal} onDelete={deleteGoal} onContribute={contributeGoal} onBack={() => setSubpage(null)} />}
        {subpage === "notifications" && <NotificationsPage notifications={data.notifications} notificationsEnabled={data.notificationsEnabled !== false} onBack={() => setSubpage(null)} onMarkAll={markAllRead} onToggle={(enabled) => persist({ ...data, notificationsEnabled: enabled })} />}
        {subpage === "rewards" && <RewardsPage data={data} onBack={() => setSubpage(null)} />}
        {subpage === "pockets" && <PocketsPage data={data} onBack={() => setSubpage(null)} onSavePocket={savePocket} onDeletePocket={deletePocket} onSavePocketLimit={savePocketLimit} onAllocate={allocateToPocket} onQuickAdd={(pocketId) => openQuickMenu(pocketId)} onEditTransaction={(t) => setTxModal(t)} />}
        {subpage === "security" && <SecurityPrivacyPage security={security} account={account} onBack={() => setSubpage(null)} onSetPin={handleSetPin} onDisablePin={handleDisablePin} onToggleBiometric={handleToggleBiometric} onUpdateAccount={handleUpdateAccount} />}

        {!subpage && tab === "dashboard" && <Dashboard data={data} account={account} onNav={nav} onQuickAdd={() => openQuickMenu()} />}
        {!subpage && tab === "transactions" && <TransactionsPage data={data} catMap={catMap} onNav={nav} onEdit={(t) => setTxModal(t)} />}
        {!subpage && tab === "report" && <ReportsPage data={data} catMap={catMap} />}
        {!subpage && tab === "gallery" && <GalleryPage data={data} catMap={catMap} onOpenTx={(t) => setTxModal(t)} />}
        {!subpage && tab === "profile" && <MorePage onNav={nav} onLogout={handleLogout} account={account} data={data} onImport={importBackup} onUpdateAccount={handleUpdateAccount} />}
      </div>

      {!subpage && <BottomNav tab={tab} onTab={setTab} onQuickAdd={() => openQuickMenu()} />}

      <QuickAddMenu open={quickMenuOpen} onClose={() => setQuickMenuOpen(false)} onSelect={chooseQuickMode} />

      <Modal open={!!txModal} onClose={() => setTxModal(null)} title={txModal && txModal !== "new" ? "Detail Transaksi" : "Transaksi Baru"}>
        {txModal && (
          <TransactionForm
            initial={txModal !== "new" ? txModal : null}
            defaultPocketId={quickAddPocketId}
            startWithCamera={quickMode === "scan"}
            categories={data.categories}
            pockets={data.pockets || []}
            onSave={saveTransaction}
            onClose={() => setTxModal(null)}
            onDelete={txModal !== "new" ? deleteTransaction : null}
          />
        )}
      </Modal>

      <Toast toast={toast} onUndo={() => { toast.onUndo && toast.onUndo(); }} onClose={() => setToast(null)} />
    </div>
  );
}
