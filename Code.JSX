import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  ArrowUpRight, ArrowDownRight, MoreHorizontal, LogOut, Settings as SettingsIcon,
  BadgeCheck, Zap, FileDown, RefreshCw,
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
  budgets: [],
  goals: [],
  notifications: [],
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

function Modal({ open, onClose, title, children }) {
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
          <button onClick={onClose} style={{ background: T.surfaceAlt, border: "none", borderRadius: 10, padding: 6, cursor: "pointer", display: "flex" }}>
            <X size={18} color={T.textMuted} />
          </button>
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
  const [step, setStep] = useState("form"); // form -> verify
  const pwRules = {
    len: form.password.length >= 8,
    num: /\d/.test(form.password),
    upper: /[A-Z]/.test(form.password),
  };
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && pwRules.len && pwRules.num && pwRules.upper && form.password === form.confirm;

  function submit() {
    setErr("");
    if (!form.name.trim()) return setErr("Nama lengkap wajib diisi.");
    if (!/\S+@\S+\.\S+/.test(form.email)) return setErr("Format email tidak valid.");
    if (existing && existing.email === form.email.toLowerCase()) return setErr("Email sudah terdaftar. Silakan masuk.");
    if (!pwRules.len || !pwRules.num || !pwRules.upper) return setErr("Password belum memenuhi syarat keamanan.");
    if (form.password !== form.confirm) return setErr("Konfirmasi password tidak cocok.");
    setStep("verify");
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
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div style={{ width: 70, height: 70, borderRadius: 20, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <Mail size={30} color={T.primary} />
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: T.text, margin: "0 0 8px" }}>Verifikasi email Anda</h2>
          <p style={{ color: T.textMuted, fontSize: 14, lineHeight: 1.6, margin: "0 0 26px" }}>
            Kami mengirim tautan verifikasi ke <b style={{ color: T.text }}>{form.email}</b>. Buka email tersebut untuk mengaktifkan akun.
          </p>
          <Button full size="lg" icon={BadgeCheck} onClick={() => onDone({ name: form.name.trim(), email: form.email.toLowerCase(), password: form.password })}>
            Simulasikan verifikasi berhasil
          </Button>
          <p style={{ fontSize: 12, color: T.textFaint, marginTop: 14 }}>Tidak menerima email? <span style={{ color: T.primary, fontWeight: 700, cursor: "pointer" }}>Kirim ulang</span></p>
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
  transactions.filter((t) => !t.deleted).forEach((t) => {
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
      .filter((t) => !t.deleted && t.categoryId === b.categoryId && t.type === "expense" && inPeriod(t.date))
      .reduce((s, t) => s + t.amount, 0);
    const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
    return { ...b, cat, spent, pct };
  });
}

function Dashboard({ data, account, onNav, onQuickAdd }) {
  const { bersih, kotor, income, expense } = useMemo(() => computeBalances(data.transactions, data.categories), [data]);
  const budgets = useMemo(() => budgetStatus(data.categories, data.budgets, data.transactions), [data]);
  const overBudget = budgets.filter((b) => b.pct >= 100);
  const nearBudget = budgets.filter((b) => b.pct >= 80 && b.pct < 100);
  const recent = useMemo(() => data.transactions.filter((t) => !t.deleted).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5), [data]);
  const catMap = Object.fromEntries(data.categories.map((c) => [c.id, c]));

  const pieData = useMemo(() => {
    const now = new Date();
    const byCat = {};
    data.transactions.filter((t) => !t.deleted && t.type === "expense" && new Date(t.date).getMonth() === now.getMonth()).forEach((t) => {
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
        <button onClick={() => onNav("notifications")} style={{ position: "relative", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 9, cursor: "pointer", display: "flex" }}>
          <Bell size={18} color={T.text} />
          {data.notifications.some((n) => !n.read) && <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 4, background: T.danger }} />}
        </button>
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

function TransactionForm({ initial, categories, onSave, onClose, onDelete }) {
  const [type, setType] = useState(initial?.type || "expense");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId || categories.find((c) => c.kind === "expense")?.id || "");
  const [date, setDate] = useState(initial?.date || todayISO());
  const [note, setNote] = useState(initial?.note || "");
  const [photo, setPhoto] = useState(initial?.photo || null);
  const [recurring, setRecurring] = useState(initial?.recurring?.freq || "");
  const fileRef = useRef(null);

  const filteredCats = categories.filter((c) => c.kind === type);
  useEffect(() => { if (!filteredCats.find((c) => c.id === categoryId)) setCategoryId(filteredCats[0]?.id || ""); /* eslint-disable-next-line */ }, [type]);

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    try { setPhoto(await fileToCompressedDataUrl(file)); } catch { /* ignore */ }
  }

  function submit() {
    const num = parseFloat(amount.replace(/[^\d]/g, ""));
    if (!num || num <= 0 || !categoryId) return;
    onSave({
      id: initial?.id || uid(),
      type, amount: num, categoryId, date, note: note.trim(), photo,
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filteredCats.map((c) => (
            <button key={c.id} onClick={() => setCategoryId(c.id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12,
              border: `1.5px solid ${categoryId === c.id ? c.color : T.border}`,
              background: categoryId === c.id ? c.color + "18" : T.surface, cursor: "pointer", fontFamily: fontStack,
            }}>
              <CatIcon name={c.icon} size={15} color={c.color} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{c.name}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Tanggal">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <Field label="Catatan (opsional)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="cth. Belanja bulanan di pasar" />
      </Field>

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
          <button onClick={() => fileRef.current.click()} style={{
            width: 100, height: 100, borderRadius: 12, border: `1.5px dashed ${T.border}`, background: T.surfaceAlt,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer",
          }}>
            <Camera size={20} color={T.textMuted} />
            <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 700 }}>Tambah foto</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
      </Field>

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
  const [filterCat, setFilterCat] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const list = useMemo(() => {
    return data.transactions.filter((t) => !t.deleted)
      .filter((t) => (filterType === "all" ? true : t.type === filterType))
      .filter((t) => (filterCat === "all" ? true : t.categoryId === filterCat))
      .filter((t) => (t.note || "").toLowerCase().includes(query.toLowerCase()) || (catMap[t.categoryId]?.name || "").toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data, query, filterCat, filterType]);

  const grouped = useMemo(() => {
    const g = {};
    list.forEach((t) => { const k = shortDate(t.date); (g[k] = g[k] || []).push(t); });
    return g;
  }, [list]);

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="Transaksi" />
      <div style={{ padding: "0 18px 10px", display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={16} color={T.textFaint} style={{ position: "absolute", left: 12, top: 13 }} />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari transaksi..." style={{ paddingLeft: 36 }} />
        </div>
      </div>
      <div style={{ padding: "0 18px 12px", display: "flex", gap: 8, overflowX: "auto" }}>
        {[["all", "Semua"], ["income", "Pemasukan"], ["expense", "Pengeluaran"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilterType(v)} style={{
            padding: "7px 13px", borderRadius: 999, whiteSpace: "nowrap", fontFamily: fontStack, cursor: "pointer",
            border: `1.5px solid ${filterType === v ? T.primary : T.border}`, background: filterType === v ? T.primary : T.surface,
            color: filterType === v ? "#fff" : T.textMuted, fontSize: 12.5, fontWeight: 700,
          }}>{l}</button>
        ))}
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 12.5, fontWeight: 700, borderRadius: 999 }}>
          <option value="all">Semua kategori</option>
          {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
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
  const [zoom, setZoom] = useState(null);
  const items = useMemo(() =>
    data.transactions.filter((t) => !t.deleted && t.photo && (filterCat === "all" || t.categoryId === filterCat))
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [data, filterCat]);

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="Galeri Nota" />
      <div style={{ padding: "0 18px 12px", display: "flex", gap: 8, overflowX: "auto" }}>
        <button onClick={() => setFilterCat("all")} style={{ padding: "7px 13px", borderRadius: 999, whiteSpace: "nowrap", cursor: "pointer", fontFamily: fontStack, fontSize: 12.5, fontWeight: 700, border: `1.5px solid ${filterCat === "all" ? T.primary : T.border}`, background: filterCat === "all" ? T.primary : T.surface, color: filterCat === "all" ? "#fff" : T.textMuted }}>Semua</button>
        {data.categories.map((c) => (
          <button key={c.id} onClick={() => setFilterCat(c.id)} style={{ padding: "7px 13px", borderRadius: 999, whiteSpace: "nowrap", cursor: "pointer", fontFamily: fontStack, fontSize: 12.5, fontWeight: 700, border: `1.5px solid ${filterCat === c.id ? c.color : T.border}`, background: filterCat === c.id ? c.color + "18" : T.surface, color: filterCat === c.id ? c.color : T.textMuted }}>{c.name}</button>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={ImageIcon} title="Belum ada nota" desc="Foto nota yang Anda lampirkan pada transaksi akan tampil di sini." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, padding: "0 3px" }}>
          {items.map((t) => (
            <div key={t.id} onClick={() => setZoom(t)} style={{ aspectRatio: "1", position: "relative", cursor: "pointer", overflow: "hidden" }}>
              <img src={t.photo} alt="nota" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.65))", padding: "12px 6px 5px", fontSize: 10, color: "#fff", fontWeight: 700 }}>
                {rupiah(t.amount)}
              </div>
            </div>
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
      if (t.deleted) return false;
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
    data.transactions.filter((t) => !t.deleted).forEach((t) => {
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
function MorePage({ onNav, onLogout, account, data, onImport }) {
  const fileRef = useRef(null);
  const items = [
    { icon: Tag, label: "Kelola Kategori", desc: "Tambah, ubah, atau hapus kategori", nav: "categories" },
    { icon: Target, label: "Target Tabungan", desc: "Kelola tujuan menabung Anda", nav: "goals" },
    { icon: AlertTriangle, label: "Anggaran Bulanan", desc: "Atur batas pengeluaran per kategori", nav: "budget" },
    { icon: Bell, label: "Notifikasi", desc: "Peringatan anggaran & pengingat", nav: "notifications" },
  ];
  function exportBackup() {
    const blob = new Blob([JSON.stringify({ account, data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `backup-keuangan-${todayISO()}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function importBackup(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const parsed = JSON.parse(reader.result); onImport(parsed); } catch { alert("File backup tidak valid."); } };
    reader.readAsText(file);
  }
  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="Lainnya" />
      <div style={{ padding: "0 18px" }}>
        <Card style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: T.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17 }}>
            {account?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{account?.name}</div>
            <div style={{ fontSize: 12.5, color: T.textMuted }}>{account?.email}</div>
          </div>
        </Card>

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

        <div style={{ fontSize: 12, fontWeight: 800, color: T.textFaint, textTransform: "uppercase", margin: "20px 0 8px" }}>Cadangan Data (Cloud Backup)</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <Button variant="secondary" icon={Cloud} onClick={exportBackup} full>Ekspor Cadangan</Button>
          <Button variant="outline" icon={RefreshCw} onClick={() => fileRef.current.click()} full>Impor Cadangan</Button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={importBackup} />
        </div>

        <Button variant="danger" icon={LogOut} full onClick={onLogout}>Keluar Akun</Button>
      </div>
    </div>
  );
}

function NotificationsPage({ notifications, onBack, onMarkAll }) {
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Notifikasi" onBack={onBack} right={
        notifications.length > 0 && <span onClick={onMarkAll} style={{ fontSize: 12, color: T.primary, fontWeight: 700, cursor: "pointer" }}>Tandai dibaca</span>
      } />
      <div style={{ padding: "0 18px" }}>
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="Belum ada notifikasi" desc="Peringatan anggaran dan pengingat akan muncul di sini." />
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

/* ============================= BOTTOM NAV ============================= */
function BottomNav({ tab, onTab, onQuickAdd }) {
  const items = [
    { key: "dashboard", icon: Home, label: "Beranda" },
    { key: "transactions", icon: Receipt, label: "Transaksi" },
    { key: "quickadd", icon: Plus, label: "" },
    { key: "report", icon: PieIcon, label: "Laporan" },
    { key: "gallery", icon: ImageIcon, label: "Galeri" },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, background: T.surface,
      borderTop: `1px solid ${T.border}`, display: "flex", padding: "8px 10px calc(env(safe-area-inset-bottom, 0px) + 8px)",
      alignItems: "center", zIndex: 40,
    }}>
      {items.map((it) => {
        if (it.key === "quickadd") {
          return (
            <div key="fab" style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <button onClick={onQuickAdd} style={{
                width: 50, height: 50, borderRadius: "50%", background: T.primary, border: "none",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                boxShadow: `0 6px 16px ${T.primary}55`, marginTop: -22,
              }}>
                <Plus size={24} color="#fff" />
              </button>
            </div>
          );
        }
        const active = tab === it.key;
        return (
          <button key={it.key} onClick={() => onTab(it.key)} style={{
            flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 0", fontFamily: fontStack,
          }}>
            <it.icon size={20} color={active ? T.primary : T.textFaint} strokeWidth={active ? 2.4 : 2} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: active ? T.primary : T.textFaint }}>{it.label}</span>
          </button>
        );
      })}
      <button onClick={() => onTab("more")} style={{
        flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex",
        flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 0", fontFamily: fontStack,
      }}>
        <Menu size={20} color={tab === "more" ? T.primary : T.textFaint} strokeWidth={tab === "more" ? 2.4 : 2} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: tab === "more" ? T.primary : T.textFaint }}>Lainnya</span>
      </button>
    </div>
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
  const [toast, setToast] = useState(null);
  const undoRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { account: acc, data: d, session } = await loadAll();
      setAccount(acc); setData(d);
      if (acc && session?.loggedIn) setAuthed(true);
      setLoading(false);
    })();
  }, []);

  const persist = useCallback((next) => { setData(next); saveData(next); }, []);

  function showToast(message, onUndo) {
    setToast({ message, onUndo });
    clearTimeout(undoRef.current);
    undoRef.current = setTimeout(() => setToast(null), 4000);
  }

  function addNotification(message, tone = "primary") {
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
  async function handleLogout() {
    await saveSession(null); setAuthed(false); setAuthScreen("login"); setTab("dashboard"); setSubpage(null);
  }

  /* ----- DATA HANDLERS ----- */
  const catMap = useMemo(() => Object.fromEntries(data.categories.map((c) => [c.id, c])), [data.categories]);

  function saveTransaction(tx) {
    const exists = data.transactions.find((t) => t.id === tx.id);
    const nextTx = exists ? data.transactions.map((t) => (t.id === tx.id ? tx : t)) : [...data.transactions, tx];
    persist({ ...data, transactions: nextTx });
    setTxModal(null);
    const bstat = budgetStatus(data.categories, data.budgets, nextTx).find((b) => b.categoryId === tx.categoryId);
    if (bstat && bstat.pct >= 100) addNotification(`Anggaran "${catMap[tx.categoryId]?.name}" telah melewati batas bulan ini.`, "danger");
    else if (bstat && bstat.pct >= 80) addNotification(`Anggaran "${catMap[tx.categoryId]?.name}" mendekati batas (${Math.round(bstat.pct)}%).`, "warn");
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
    showToast("Data berhasil dipulihkan dari cadangan.");
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

  function nav(dest, arg) {
    if (["categories", "budget", "goals", "notifications"].includes(dest)) setSubpage(dest);
    else if (dest === "txdetail") { const t = data.transactions.find((x) => x.id === arg); setTxModal(t); }
    else if (dest === "transactions") setTab("transactions");
  }

  return (
    <div style={shellStyle}>
      <style>{`@keyframes kxUp { from { transform: translateY(16px); opacity:0 } to { transform: translateY(0); opacity:1 } }
        ::-webkit-scrollbar{width:0;height:0}`}</style>
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {subpage === "categories" && <CategoriesPage categories={data.categories} onSave={saveCategory} onDelete={deleteCategory} onBack={() => setSubpage(null)} />}
        {subpage === "budget" && <BudgetPage data={data} onSaveBudget={saveBudget} onBack={() => setSubpage(null)} />}
        {subpage === "goals" && <GoalsPage goals={data.goals} onSave={saveGoal} onDelete={deleteGoal} onContribute={contributeGoal} onBack={() => setSubpage(null)} />}
        {subpage === "notifications" && <NotificationsPage notifications={data.notifications} onBack={() => setSubpage(null)} onMarkAll={markAllRead} />}

        {!subpage && tab === "dashboard" && <Dashboard data={data} account={account} onNav={nav} onQuickAdd={() => setTxModal("new")} />}
        {!subpage && tab === "transactions" && <TransactionsPage data={data} catMap={catMap} onNav={nav} onEdit={(t) => setTxModal(t)} />}
        {!subpage && tab === "report" && <ReportsPage data={data} catMap={catMap} />}
        {!subpage && tab === "gallery" && <GalleryPage data={data} catMap={catMap} onOpenTx={(t) => setTxModal(t)} />}
        {!subpage && tab === "more" && <MorePage onNav={nav} onLogout={handleLogout} account={account} data={data} onImport={importBackup} />}
      </div>

      {!subpage && <BottomNav tab={tab} onTab={setTab} onQuickAdd={() => setTxModal("new")} />}

      <Modal open={!!txModal} onClose={() => setTxModal(null)} title={txModal && txModal !== "new" ? "Detail Transaksi" : "Transaksi Baru"}>
        {txModal && (
          <TransactionForm
            initial={txModal !== "new" ? txModal : null}
            categories={data.categories}
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
