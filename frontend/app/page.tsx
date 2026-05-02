"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Upload, FileText, CheckCircle, XCircle, Zap, Lock,
  ArrowRight, Loader2, Download, RefreshCw, Briefcase,
  AlertTriangle, ChevronRight
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [rewritten, setRewritten] = useState<string[]>([]);
  const [jdText, setJdText] = useState("");
  const [jdResult, setJdResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"problems" | "rewrite" | "jd">("problems");
  const [showPayment, setShowPayment] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) {
      setToken(t);
      axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
        .then(r => setUser(r.data))
        .catch(() => { localStorage.removeItem("token"); setToken(null); });
    }
  }, []);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = { email: fd.get("email"), password: fd.get("password") };
    try {
      const ep = authMode === "login" ? "/auth/login" : "/auth/register";
      const res = await axios.post(`${API}${ep}`, data);
      setToken(res.data.access_token);
      setUser(res.data.user);
      localStorage.setItem("token", res.data.access_token);
      setShowAuth(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Auth failed");
    }
  };

  const doUpload = async () => {
    if (!file) return;
    if (!token) { setShowAuth(true); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await axios.post(`${API}/api/upload`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResumeId(res.data.resume_id);
      setUploading(false);
      doAnalyze(res.data.resume_id);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Upload failed");
      setUploading(false);
    }
  };

  const doAnalyze = async (id: number) => {
    setAnalyzing(true);
    try {
      const res = await axios.post(`${API}/api/analyze/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalysis(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Analysis failed");
    }
    setAnalyzing(false);
  };

  const doRewrite = async () => {
    if (!analysis?.weak_bullets?.length) return;
    try {
      const res = await axios.post(`${API}/api/rewrite`, analysis.weak_bullets, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRewritten(res.data.rewritten);
    } catch (err: any) {
      if (err.response?.status === 403) setShowPayment(true);
      else alert(err.response?.data?.detail || "Rewrite failed");
    }
  };

  const doJdMatch = async () => {
    if (!resumeId || !jdText.trim()) return;
    try {
      const fd = new FormData();
      fd.append("jd_text", jdText);
      const res = await axios.post(`${API}/api/jd-match?resume_id=${resumeId}`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJdResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "JD match failed");
    }
  };

  const doDownload = async () => {
    if (!resumeId) return;
    try {
      const res = await axios.post(
        `${API}/api/download/${resumeId}`,
        { rewritten_bullets: rewritten },
        { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `nextstep_resume_${resumeId}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch { alert("Download failed"); }
  };

  const initPayment = async () => {
    setPayLoading(true);
    try {
      const order = await axios.post(`${API}/api/payment/create-order?amount=4900`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.data.amount,
        currency: "INR",
        name: "NextStep Resume",
        description: "24 Hours Full Access",
        order_id: order.data.order_id,
        handler: async (response: any) => {
          await axios.post(`${API}/api/payment/verify`, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }, { headers: { Authorization: `Bearer ${token}` } });
          setShowPayment(false);
          setUser({ ...user, is_paid: true });
          alert("Payment successful! Full access unlocked.");
        },
        theme: { color: "#6366F1" },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch { alert("Payment init failed"); }
    setPayLoading(false);
  };

  const resetAll = () => {
    setResumeId(null); setAnalysis(null); setRewritten([]); setJdResult(null);
    setFile(null); setJdText(""); setActiveTab("problems");
  };

  const scrollToUpload = () => {
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
  };

  const isPaid = user?.is_paid && user?.paid_until && new Date(user.paid_until) > new Date();

  return (
    <main className="min-h-screen bg-dark-bg">
      {/* Nav */}
      <nav className="border-b border-dark-border bg-dark-bg/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-brand" />
            <span className="font-bold text-xl tracking-tight">NextStep</span>
          </div>
          {token ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 hidden sm:inline">{user?.email}</span>
              {isPaid && <span className="text-xs bg-brand/20 text-brand px-2 py-1 rounded-full">PRO</span>}
              <button onClick={() => { setToken(null); setUser(null); localStorage.removeItem("token"); }} className="text-sm text-gray-400 hover:text-white">Logout</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className="text-sm font-medium text-brand hover:text-brand-hover">Login</button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
          Not getting interview calls?<br />
          <span className="text-brand">Fix your resume in 5 minutes.</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-8">
          Upload your resume. See exactly why recruiters reject it. Get an improved version that gets responses.
        </p>
        <button onClick={scrollToUpload} className="btn-primary max-w-xs mx-auto flex items-center justify-center gap-2">
          Check My Resume Free <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-gray-500">
          <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> Takes &lt; 5 min</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> No signup required</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> ATS-friendly</span>
        </div>
      </section>

      {/* Fake Preview */}
      {!analysis && (
        <section className="max-w-2xl mx-auto px-4 mb-12">
          <div className="card p-8 text-center opacity-50 hover:opacity-90 transition-opacity cursor-default">
            <div className="text-6xl font-bold text-red-500 mb-2">52<span className="text-2xl text-gray-500">/100</span></div>
            <p className="text-gray-400 mb-6">Most resumes we see score below 60. Yours might too.</p>
            <div className="space-y-3 text-left max-w-md mx-auto text-sm">
              <div className="flex items-center gap-3 text-red-400"><XCircle className="w-5 h-5 shrink-0" /> Weak bullet points</div>
              <div className="flex items-center gap-3 text-red-400"><XCircle className="w-5 h-5 shrink-0" /> No measurable impact</div>
              <div className="flex items-center gap-3 text-red-400"><XCircle className="w-5 h-5 shrink-0" /> Missing keywords</div>
            </div>
          </div>
        </section>
      )}

      {/* Upload & Analysis */}
      <section id="upload" className="max-w-2xl mx-auto px-4 mb-16">
        <div className="card p-6 md:p-8">
          {!resumeId ? (
            <div className="text-center">
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-dark-border hover:border-brand rounded-xl p-12 cursor-pointer transition-colors">
                <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-lg font-medium mb-1">Upload your resume</p>
                <p className="text-sm text-gray-500">PDF or DOCX only</p>
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              {file && <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-300"><FileText className="w-4 h-4" /> {file.name}</div>}
              <button onClick={doUpload} disabled={!file || uploading || analyzing} className="btn-primary mt-6 max-w-xs mx-auto disabled:opacity-50">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : analyzing ? "Analyzing..." : "Analyze Resume"}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2 mb-6 border-b border-dark-border pb-2 overflow-x-auto">
                {(["problems", "rewrite", "jd"] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${activeTab === t ? "bg-brand text-white" : "text-gray-400 hover:text-white"}`}>
                    {t === "problems" ? "Problems" : t === "rewrite" ? "AI Rewrite" : "JD Match"}
                  </button>
                ))}
              </div>

              {activeTab === "problems" && analysis && (
                <div>
                  <div className="text-center mb-6">
                    <div className={`text-5xl font-bold mb-2 ${analysis.score >= 70 ? "text-green-500" : analysis.score >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                      {analysis.score}<span className="text-2xl text-gray-500">/100</span>
                    </div>
                    <p className="text-gray-400 text-sm">Your Resume Score</p>
                  </div>
                  <div className="space-y-3 mb-6">
                    <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-500" /> Top Issues</h3>
                    {analysis.problems.map((p: string, i: number) => (
                      <div key={i} className="bg-dark-bg border border-dark-border rounded-lg p-4 flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-300">{p}</span>
                      </div>
                    ))}
                  </div>
                  {analysis.suggestions.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <h3 className="font-semibold flex items-center gap-2"><Zap className="w-5 h-5 text-brand" /> Suggestions</h3>
                      {analysis.suggestions.map((s: string, i: number) => (
                        <div key={i} className="text-sm text-gray-400 pl-4 border-l-2 border-brand">{s}</div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setActiveTab("rewrite")} className="btn-primary">Fix My Resume Now</button>
                </div>
              )}

              {activeTab === "rewrite" && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">AI Bullet Rewriter</h3>
                  {analysis?.weak_bullets?.length > 0 ? (
                    <div className="space-y-4 mb-6">
                      {analysis.weak_bullets.map((b: string, i: number) => (
                        <div key={i} className="bg-dark-bg border border-dark-border rounded-lg p-4">
                          <p className="text-sm text-red-400 line-through mb-2">{b}</p>
                          {rewritten[i] ? <p className="text-sm text-green-400 font-medium">{rewritten[i]}</p> : <p className="text-sm text-gray-500 italic">Will be rewritten...</p>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 mb-6">No weak bullets detected.</p>}
                  <div className="flex gap-3">
                    <button onClick={doRewrite} className="btn-primary flex-1">{rewritten.length > 0 ? "Regenerate" : "Rewrite Bullets"}</button>
                    {rewritten.length > 0 && (
                      <button onClick={doDownload} className="btn-secondary flex-1 flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download</button>
                    )}
                  </div>
                  {!isPaid && <p className="text-xs text-gray-500 mt-3 text-center"><Lock className="w-3 h-3 inline mr-1" />Upgrade to unlock rewrites and watermark-free download</p>}
                </div>
              )}

              {activeTab === "jd" && (
                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5" /> JD Matcher</h3>
                  <textarea value={jdText} onChange={e => setJdText(e.target.value)} placeholder="Paste job description here..." className="w-full h-40 bg-dark-bg border border-dark-border rounded-lg p-4 text-sm text-gray-300 focus:border-brand focus:outline-none resize-none mb-4" />
                  <button onClick={doJdMatch} className="btn-primary mb-6">Calculate Match</button>
                  {jdResult && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${jdResult.match_percentage >= 70 ? "text-green-500" : jdResult.match_percentage >= 50 ? "text-yellow-500" : "text-red-500"}`}>{jdResult.match_percentage}%</div>
                        <p className="text-sm text-gray-400 mt-1">Match Score</p>
                      </div>
                      {jdResult.missing_keywords.length > 0 && (
                        <div className="bg-dark-bg border border-dark-border rounded-lg p-4">
                          <p className="text-sm font-medium text-red-400 mb-2">Missing Keywords:</p>
                          <div className="flex flex-wrap gap-2">
                            {jdResult.missing_keywords.map((k: string, i: number) => (
                              <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded border border-red-500/20">{k}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button onClick={resetAll} className="mt-6 text-sm text-gray-500 hover:text-white flex items-center gap-1 mx-auto">
                <RefreshCw className="w-4 h-4" /> Analyze another resume
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Pricing */}
      {!analysis && (
        <section className="max-w-5xl mx-auto px-4 mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Simple Pricing</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card flex flex-col">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Start Free</h3>
              <div className="text-3xl font-bold mb-6">₹0</div>
              <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-400">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 3 Resume Scans</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 1 JD Match</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Basic Suggestions</li>
                <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /> Watermarked Export</li>
              </ul>
              <button onClick={scrollToUpload} className="btn-secondary">Try Free</button>
            </div>

            <div className="card flex flex-col border-brand relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
              <h3 className="text-lg font-semibold text-white mb-2">1-Day Full Access</h3>
              <div className="text-3xl font-bold mb-6 text-brand">₹49</div>
              <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-300">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Unlimited Improvements</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> JD Optimization</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> AI Bullet Rewriter</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> No Watermark</li>
              </ul>
              <button onClick={() => { if (!token) setShowAuth(true); else setShowPayment(true); }} className="btn-primary">Unlock for ₹49</button>
            </div>

            <div className="card flex flex-col">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">7-Day Access</h3>
              <div className="text-3xl font-bold mb-6">₹99</div>
              <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-400">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Everything in 1-Day</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Use for 7 Days</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Best for Job Weeks</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Multiple Resumes</li>
              </ul>
              <button onClick={() => { if (!token) setShowAuth(true); else setShowPayment(true); }} className="btn-secondary">Get 7 Days</button>
            </div>
          </div>
        </section>
      )}

      {/* Before / After */}
      {!analysis && (
        <section className="max-w-4xl mx-auto px-4 mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Before vs After</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card border-red-500/30">
              <div className="flex items-center gap-2 mb-4 text-red-400 font-semibold"><XCircle className="w-5 h-5" /> Weak Resume</div>
              <div className="space-y-3 text-sm text-gray-400">
                <p>• Worked on a project using Python</p>
                <p>• Helped team with deployment</p>
                <p>• Made website faster</p>
              </div>
            </div>
            <div className="card border-green-500/30">
              <div className="flex items-center gap-2 mb-4 text-green-400 font-semibold"><CheckCircle className="w-5 h-5" /> Improved Resume</div>
              <div className="space-y-3 text-sm text-gray-300">
                <p>• Built a Python-based data pipeline reducing computation time by 40%</p>
                <p>• Led CI/CD automation using Docker and GitHub Actions, cutting release time by 60%</p>
                <p>• Optimized React frontend performance, improving Lighthouse score from 45 to 92</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      {!analysis && (
        <section className="max-w-2xl mx-auto px-4 mb-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Still applying with a weak resume?</h2>
          <p className="text-gray-400 mb-8">Most rejections happen because of small mistakes. Fix yours now.</p>
          <button onClick={scrollToUpload} className="btn-primary max-w-xs mx-auto">Check My Resume Free</button>
        </section>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{authMode === "login" ? "Welcome Back" : "Create Account"}</h3>
              <button onClick={() => setShowAuth(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input name="email" type="email" required className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-white focus:border-brand focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input name="password" type="password" required minLength={6} className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-white focus:border-brand focus:outline-none" />
              </div>
              <button type="submit" className="btn-primary">{authMode === "login" ? "Login" : "Register"}</button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-400">
              {authMode === "login" ? "No account? " : "Have an account? "}
              <button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")} className="text-brand hover:underline">{authMode === "login" ? "Register" : "Login"}</button>
            </p>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Unlock Full Access</h3>
              <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center p-4 bg-dark-bg rounded-lg border border-brand/30">
                <div>
                  <p className="font-semibold">1-Day Full Access</p>
                  <p className="text-sm text-gray-400">Unlimited rewrites & downloads</p>
                </div>
                <div className="text-xl font-bold text-brand">₹49</div>
              </div>
            </div>
            <button onClick={initPayment} disabled={payLoading} className="btn-primary">
              {payLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Pay ₹49 via Razorpay"}
            </button>
            <p className="mt-4 text-xs text-center text-gray-500">Secure payment by Razorpay. 24-hour access.</p>
          </div>
        </div>
      )}

      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </main>
  );
}
