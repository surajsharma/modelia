import React, { useState } from "react";
import { signup } from "../services/auth";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await signup(email, password);
      nav("/");
    } catch (err: any) {
      alert(err.message || "Signup failed");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-10">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Create Account</h1>
        <form onSubmit={onSubmit} className="space-y-5">
          <label className="block">
            <div className="text-sm font-semibold text-gray-700 mb-2">Email</div>
            <input 
              type="email"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="Enter your email"
              required 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all" 
            />
          </label>
          <label className="block">
            <div className="text-sm font-semibold text-gray-700 mb-2">Password</div>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter your password"
              minLength={6}
              required 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all" 
            />
          </label>
          <div className="pt-4">
            <button 
              disabled={busy} 
              className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          </div>
          <div className="text-center pt-3">
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium">
              Already have an account? Log in
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}