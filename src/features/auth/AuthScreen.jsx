/* ═══════════════════════════════════════════
   AUTH SCREEN — the front door (Phase 5)
   Sign in / sign up with email+password or Google. Matches the app's
   Notion×Planta aesthetic: cream bg, forest gradient hero panel, the
   shared Btn/Inp primitives. No <form> tags — onClick handlers only.

   This component does NOT manage the session itself. On success the
   supabase auth state changes, AuthGate's onAuthChange listener fires,
   and AuthGate swaps this screen for the app. Keeps session logic in
   one place.
   ═══════════════════════════════════════════ */
import React, { useState } from "react";
import { Leaf } from "lucide-react";
import { C, F } from "../../lib/theme";
import { Btn, Inp } from "../../components/ui";
import { signUpEmail, signInEmail, signInGoogle } from "../../lib/auth";

export default function AuthScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  const isSignup = mode === "signup";

  async function handleEmail() {
    setErr("");
    setNotice("");
    if (!email || !password) {
      setErr("Enter your email and a password.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const fn = isSignup ? signUpEmail : signInEmail;
      const { data, error } = await fn(email.trim(), password);
      if (error) {
        setErr(error.message || "Something went wrong. Try again.");
        setBusy(false);
        return;
      }
      // If "Confirm email" is ON in Supabase, signUp returns a user with no
      // active session — show a check-your-email notice instead of hanging.
      if (isSignup && data && data.user && !data.session) {
        setNotice("Check your email to confirm your account, then sign in.");
        setBusy(false);
        return;
      }
      // Success with a session → AuthGate's onAuthChange takes over.
      // Leave busy=true so the button stays disabled during the swap.
    } catch (e) {
      setErr(String(e && e.message ? e.message : e));
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setErr("");
    setNotice("");
    setBusy(true);
    try {
      const { error } = await signInGoogle();
      if (error) {
        setErr(error.message || "Could not start Google sign-in.");
        setBusy(false);
      }
      // On success the browser redirects to Google — no further code runs here.
    } catch (e) {
      setErr(String(e && e.message ? e.message : e));
      setBusy(false);
    }
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:F.body,padding:20}}>
      <div style={{width:"100%",maxWidth:400,background:C.card,borderRadius:20,boxShadow:C.shL,overflow:"hidden"}}>
        {/* Hero header — matches sidebar brand gradient */}
        <div style={{background:C.grdHero,padding:"32px 28px 26px",textAlign:"center"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,color:"#fff",fontFamily:F.head,fontSize:24,fontWeight:800,letterSpacing:"-0.02em"}}>
            <Leaf size={24} strokeWidth={2}/> MyTerra
          </div>
          <div style={{color:"rgba(255,255,255,.78)",fontSize:13,marginTop:6,fontWeight:500}}>
            A farm game simulator running on real life
          </div>
        </div>

        <div style={{padding:"26px 28px 30px"}}>
          <h1 style={{fontFamily:F.head,fontSize:20,fontWeight:700,color:C.text,marginBottom:4,textAlign:"center"}}>
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p style={{fontSize:13,color:C.t2,marginBottom:20,textAlign:"center"}}>
            {isSignup ? "Start growing in 90 seconds." : "Sign in to your farm."}
          </p>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Inp label="Email" type="email" autoComplete="email" value={email}
              onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
            <Inp label="Password" type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password} onChange={e=>setPassword(e.target.value)}
              placeholder={isSignup ? "At least 6 characters" : "Your password"}/>
          </div>

          {err && (
            <div style={{marginTop:14,padding:"10px 12px",borderRadius:10,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",color:"#dc2626",fontSize:12.5,lineHeight:1.4}}>
              {err}
            </div>
          )}
          {notice && (
            <div style={{marginTop:14,padding:"10px 12px",borderRadius:10,background:C.gp,border:`1px solid ${C.green}`,color:C.green,fontSize:12.5,lineHeight:1.4}}>
              {notice}
            </div>
          )}

          <div style={{marginTop:18}}>
            <Btn onClick={handleEmail} dis={busy} style={{width:"100%"}}>
              {busy ? "Please wait…" : isSignup ? "Sign up" : "Sign in"}
            </Btn>
          </div>

          {/* Divider */}
          <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0"}}>
            <div style={{flex:1,height:1,background:C.bdr}}/>
            <span style={{fontSize:11,color:C.t2,fontWeight:600}}>OR</span>
            <div style={{flex:1,height:1,background:C.bdr}}/>
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={busy}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,
              padding:"11px 16px",borderRadius:12,border:`1.5px solid ${C.bdr}`,background:C.card,
              cursor:busy?"default":"pointer",fontSize:14,fontWeight:600,color:C.text,fontFamily:F.body,
              opacity:busy?0.6:1,minHeight:44}}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          {/* Toggle mode */}
          <div style={{textAlign:"center",marginTop:20,fontSize:13,color:C.t2}}>
            {isSignup ? "Already have an account?" : "New to MyTerra?"}{" "}
            <button onClick={()=>{setMode(isSignup?"signin":"signup");setErr("");setNotice("");}}
              style={{border:"none",background:"transparent",color:C.green,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:F.body,padding:0}}>
              {isSignup ? "Sign in" : "Sign up free"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
