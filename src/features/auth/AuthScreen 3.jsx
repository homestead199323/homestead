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
import { signUpEmail, signInEmail } from "../../lib/auth";

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

  // Google sign-in — hidden until a Google Cloud OAuth client is configured
  // in Supabase. Re-enable by uncommenting this, restoring the signInGoogle
  // import, and uncommenting the divider + Google button in the JSX below.
  // async function handleGoogle() {
  //   setErr("");
  //   setNotice("");
  //   setBusy(true);
  //   try {
  //     const { error } = await signInGoogle();
  //     if (error) {
  //       setErr(error.message || "Could not start Google sign-in.");
  //       setBusy(false);
  //     }
  //     // On success the browser redirects to Google — no further code runs here.
  //   } catch (e) {
  //     setErr(String(e && e.message ? e.message : e));
  //     setBusy(false);
  //   }
  // }

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

          {/* Phase 8.3 — legal consent line, shown on the signup form only */}
          {isSignup && (
            <div style={{textAlign:"center",marginTop:12,fontSize:11.5,color:C.t2,lineHeight:1.5}}>
              By creating an account you agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener" style={{color:C.green,fontWeight:600}}>Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" target="_blank" rel="noopener" style={{color:C.green,fontWeight:600}}>Privacy Policy</a>.
            </div>
          )}

          {/* Google sign-in hidden until OAuth is configured in Supabase.
              To restore: uncomment handleGoogle + its import above, then
              re-add the OR divider and the Google <button> here. */}

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
