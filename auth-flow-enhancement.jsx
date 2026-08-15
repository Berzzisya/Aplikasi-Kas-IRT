/* ============================= AUTH FLOW ENHANCEMENT ============================= */
/* Flow: Login -> OTP Verify -> PIN/Biometric Setup -> App -> Logout -> Quick Unlock with PIN */

/* Storage untuk auth state baru */
async function saveAuthState(authState) {
  try {
    await window.storage.set("auth-state", JSON.stringify(authState));
  } catch (e) {
    console.error("Failed to save auth state:", e);
  }
}

async function getAuthState() {
  try {
    const result = await window.storage.get("auth-state");
    return result ? JSON.parse(result.value) : null;
  } catch (e) {
    console.error("Failed to load auth state:", e);
    return null;
  }
}

async function savePinHash(email, pinHash) {
  try {
    await window.storage.set(`pin-${email}`, pinHash);
  } catch (e) {
    console.error("Failed to save PIN:", e);
  }
}

async function getPinHash(email) {
  try {
    const result = await window.storage.get(`pin-${email}`);
    return result ? result.value : null;
  } catch (e) {
    console.error("Failed to load PIN:", e);
    return null;
  }
}

async function saveBiometricState(email, enabled) {
  try {
    await window.storage.set(`biometric-${email}`, JSON.stringify({ enabled, timestamp: Date.now() }));
  } catch (e) {
    console.error("Failed to save biometric state:", e);
  }
}

async function getBiometricState(email) {
  try {
    const result = await window.storage.get(`biometric-${email}`);
    return result ? JSON.parse(result.value) : { enabled: false };
  } catch (e) {
    console.error("Failed to load biometric state:", e);
    return { enabled: false };
  }
}

/* Simple hash function untuk PIN (dalam produksi gunakan crypto library) */
function hashPin(pin) {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString();
}

/* Generate OTP 6-digit */
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* ============================= LOGIN SCREEN WITH OTP ============================= */
function LoginScreenWithOTP({ onSwitch, onLogin, account }) {
  const [stage, setStage] = useState("login"); // login -> otp-verify -> success
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpAttempts, setOtpAttempts] = useState(0);

  function submitLogin() {
    if (lockedUntil && Date.now() < lockedUntil) {
      setErr("Akun terkunci sementara. Coba lagi dalam beberapa saat.");
      return;
    }
    if (!account) {
      setErr("Belum ada akun terdaftar. Silakan daftar terlebih dahulu.");
      return;
    }
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
    // Generate dan "kirim" OTP
    const otp = generateOTP();
    setGeneratedOTP(otp);
    setStage("otp-verify");
    setOtpInput("");
    setOtpAttempts(0);
  }

  function submitOTP() {
    if (otpInput !== generatedOTP) {
      const next = otpAttempts + 1;
      setOtpAttempts(next);
      if (next >= 3) {
        setErr("Terlalu banyak percobaan. Silakan coba login kembali.");
        setStage("login");
      } else {
        setErr(`Kode OTP salah. (${next}/3 percobaan)`);
      }
      return;
    }

    setErr("");
    // Simpan authenticated state
    saveAuthState({
      email: email.toLowerCase(),
      authenticated: true,
      timestamp: Date.now(),
      needsPinSetup: !account.hasPin,
    });
    setStage("success");
    onLogin(remember);
  }

  return (
    <AuthShell>
      {stage === "login" && (
        <>
          <h1 style={{ fontSize: 25, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>
            Selamat datang kembali
          </h1>
          <p style={{ color: T.textMuted, fontSize: 14, margin: "0 0 22px" }}>
            Masuk untuk melanjutkan pencatatan keuangan.
          </p>
          <Field label="Alamat email">
            <TextInput
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Kata sandi">
            <div style={{ position: "relative" }}>
              <TextInput
                type={showPw ? "text" : "password"}
                placeholder="Kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 44 }}
              />
              <button
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 13,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                {showPw ? (
                  <EyeOff size={18} color={T.textMuted} />
                ) : (
                  <Eye size={18} color={T.textMuted} />
                )}
              </button>
            </div>
          </Field>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 13,
                color: T.textMuted,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Ingat saya
            </label>
            <span
              onClick={() => onSwitch("forgot")}
              style={{
                fontSize: 13,
                color: T.primary,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Lupa kata sandi?
            </span>
          </div>
          {err && (
            <div style={{ color: T.danger, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              {err}
            </div>
          )}
          <Button full size="lg" onClick={submitLogin}>
            Masuk
          </Button>
          <p style={{ textAlign: "center", fontSize: 13, color: T.textMuted, marginTop: 18 }}>
            Belum punya akun?{" "}
            <span
              onClick={() => onSwitch("signup")}
              style={{ color: T.primary, fontWeight: 700, cursor: "pointer" }}
            >
              Daftar sekarang
            </span>
          </p>
        </>
      )}

      {stage === "otp-verify" && (
        <>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 20,
                background: T.primaryLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
              }}
            >
              <ShieldCheck size={30} color={T.primary} />
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: T.text, margin: "0 0 8px" }}>
              Verifikasi Email
            </h2>
            <p style={{ color: T.textMuted, fontSize: 14, margin: "0 0 26px" }}>
              Kami telah mengirim kode OTP ke{" "}
              <b style={{ color: T.text }}>{email}</b>
              . Kode berlaku 10 menit.
            </p>
          </div>

          <div style={{ background: T.goldLight, color: T.gold, borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 18 }}>
            Kode demo: {generatedOTP}
          </div>

          <Field label="Masukkan kode OTP">
            <TextInput
              placeholder="000000"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              style={{ fontSize: 20, letterSpacing: 8, textAlign: "center" }}
            />
          </Field>

          {err && (
            <div style={{ color: T.danger, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              {err}
            </div>
          )}

          <Button full size="lg" onClick={submitOTP} disabled={otpInput.length !== 6}>
            Verifikasi OTP
          </Button>

          <p style={{ textAlign: "center", fontSize: 13, color: T.textMuted, marginTop: 18 }}>
            Tidak menerima kode?{" "}
            <span
              onClick={() => {
                const otp = generateOTP();
                setGeneratedOTP(otp);
                setErr("");
              }}
              style={{ color: T.primary, fontWeight: 700, cursor: "pointer" }}
            >
              Kirim ulang
            </span>
          </p>
        </>
      )}

      {stage === "success" && (
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: 20,
              background: T.primaryLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
            }}
          >
            <Check size={30} color={T.primary} />
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: T.text, margin: "0 0 8px" }}>
            Login Berhasil
          </h2>
          <p style={{ color: T.textMuted, fontSize: 14, marginBottom: 26 }}>
            Anda akan dialihkan ke aplikasi...
          </p>
        </div>
      )}
    </AuthShell>
  );
}

/* ============================= PIN SETUP SCREEN ============================= */
function PinSetupScreen({ email, onComplete, onSkip }) {
  const [stage, setStage] = useState("choice"); // choice -> create-pin -> biometric -> done
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [err, setErr] = useState("");
  const [useBiometric, setUseBiometric] = useState(false);

  async function submitPin() {
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setErr("PIN harus 4 digit angka.");
      return;
    }
    if (pin !== pinConfirm) {
      setErr("Konfirmasi PIN tidak cocok.");
      return;
    }

    const pinHash = hashPin(pin);
    await savePinHash(email, pinHash);
    setErr("");
    setStage("biometric");
  }

  async function submitBiometric() {
    if (useBiometric) {
      // Dalam implementasi nyata, gunakan WebAuthn API
      // Untuk demo, cukup simpan preference
      await saveBiometricState(email, true);
    }
    const pinHash = hashPin(pin);
    await savePinHash(email, pinHash);
    onComplete({ pin, useBiometric });
  }

  return (
    <AuthShell>
      {stage === "choice" && (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>
            Amankan akun Anda
          </h1>
          <p style={{ color: T.textMuted, fontSize: 14, margin: "0 0 22px" }}>
            Buat PIN atau gunakan sidik jari untuk akses lebih cepat.
          </p>

          <Card
            onClick={() => setStage("create-pin")}
            style={{
              marginBottom: 12,
              cursor: "pointer",
              border: `2px solid ${T.primary}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  background: T.primaryLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={22} color={T.primary} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Buat PIN</div>
                <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
                  4 digit untuk akses cepat
                </div>
              </div>
              <ChevronRight size={20} color={T.textMuted} style={{ marginLeft: "auto" }} />
            </div>
          </Card>

          <Button
            full
            size="lg"
            variant="secondary"
            onClick={onSkip}
            style={{ marginTop: 18 }}
          >
            Lewati untuk sekarang
          </Button>
        </>
      )}

      {stage === "create-pin" && (
        <>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>
            Buat PIN 4 Digit
          </h2>
          <p style={{ color: T.textMuted, fontSize: 14, margin: "0 0 22px" }}>
            Gunakan kombinasi angka yang mudah diingat.
          </p>

          <Field label="Masukkan PIN">
            <div style={{ position: "relative" }}>
              <TextInput
                type={showPin ? "text" : "password"}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                style={{ fontSize: 24, letterSpacing: 10, textAlign: "center" }}
              />
              <button
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 13,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                {showPin ? (
                  <EyeOff size={18} color={T.textMuted} />
                ) : (
                  <Eye size={18} color={T.textMuted} />
                )}
              </button>
            </div>
          </Field>

          <Field label="Konfirmasi PIN">
            <TextInput
              type={showPin ? "text" : "password"}
              placeholder="••••"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              style={{ fontSize: 24, letterSpacing: 10, textAlign: "center" }}
            />
          </Field>

          {err && (
            <div style={{ color: T.danger, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              {err}
            </div>
          )}

          <Button full size="lg" onClick={submitPin} disabled={pin.length !== 4 || pinConfirm.length !== 4}>
            Lanjut
          </Button>
        </>
      )}

      {stage === "biometric" && (
        <>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                background: T.primaryLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
              }}
            >
              <Sparkles size={36} color={T.primary} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "0 0 8px" }}>
              Gunakan Sidik Jari?
            </h2>
            <p style={{ color: T.textMuted, fontSize: 14, margin: "0 0 26px" }}>
              Akses aplikasi lebih cepat dengan sidik jari.
            </p>
          </div>

          <Card
            style={{
              marginBottom: 16,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              background: useBiometric ? T.primaryLight : T.surface,
              border: `2px solid ${useBiometric ? T.primary : T.border}`,
            }}
            onClick={() => setUseBiometric(!useBiometric)}
          >
            <input
              type="checkbox"
              checked={useBiometric}
              onChange={() => setUseBiometric(!useBiometric)}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontWeight: 600, color: T.text }}>Aktifkan sidik jari</span>
          </Card>

          <Button full size="lg" onClick={submitBiometric}>
            Selesai
          </Button>
        </>
      )}
    </AuthShell>
  );
}

/* ============================= QUICK UNLOCK SCREEN ============================= */
function QuickUnlockScreen({ email, onSuccess, onSwitchLogin }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [showPin, setShowPin] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    // Check if biometric is available
    getBiometricState(email).then((state) => {
      setBiometricAvailable(state.enabled);
    });
  }, [email]);

  async function submitPin() {
    if (pin.length !== 4) {
      setErr("PIN harus 4 digit.");
      return;
    }

    const storedHash = await getPinHash(email);
    const inputHash = hashPin(pin);

    if (inputHash !== storedHash) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 3) {
        setErr("Terlalu banyak percobaan. Silakan login kembali.");
        onSwitchLogin();
      } else {
        setErr(`PIN salah. (${next}/3 percobaan)`);
      }
      return;
    }

    setErr("");
    onSuccess();
  }

  async function attemptBiometric() {
    // Dalam implementasi nyata, gunakan WebAuthn API
    // Untuk demo, langsung berhasil
    console.log("Attempting biometric unlock...");
    onSuccess();
  }

  return (
    <AuthShell>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: 20,
            background: T.primaryLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
          }}
        >
          <Lock size={30} color={T.primary} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "0 0 8px" }}>
          Selamat datang kembali
        </h2>
        <p style={{ color: T.textMuted, fontSize: 14 }}>
          Masukkan PIN untuk melanjutkan
        </p>
      </div>

      {biometricAvailable && (
        <Button
          full
          size="md"
          variant="secondary"
          onClick={attemptBiometric}
          icon={Sparkles}
          style={{ marginBottom: 16 }}
        >
          Gunakan Sidik Jari
        </Button>
      )}

      <Field label="Masukkan PIN">
        <div style={{ position: "relative" }}>
          <TextInput
            type={showPin ? "text" : "password"}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            maxLength={4}
            style={{ fontSize: 24, letterSpacing: 10, textAlign: "center" }}
          />
          <button
            onClick={() => setShowPin(!showPin)}
            style={{
              position: "absolute",
              right: 12,
              top: 13,
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
            }}
          >
            {showPin ? (
              <EyeOff size={18} color={T.textMuted} />
            ) : (
              <Eye size={18} color={T.textMuted} />
            )}
          </button>
        </div>
      </Field>

      {err && (
        <div style={{ color: T.danger, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          {err}
        </div>
      )}

      <Button full size="lg" onClick={submitPin} disabled={pin.length !== 4}>
        Buka Aplikasi
      </Button>

      <p style={{ textAlign: "center", fontSize: 13, color: T.textMuted, marginTop: 18 }}>
        <span
          onClick={onSwitchLogin}
          style={{ color: T.primary, fontWeight: 700, cursor: "pointer" }}
        >
          Login dengan akun lain
        </span>
      </p>
    </AuthShell>
  );
}

export {
  LoginScreenWithOTP,
  PinSetupScreen,
  QuickUnlockScreen,
  saveAuthState,
  getAuthState,
  hashPin,
  generateOTP,
};
