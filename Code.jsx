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
      .filter((t) => !t.deleted && t.categoryId === b.ca
