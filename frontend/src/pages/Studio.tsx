import React, { useEffect, useState } from "react";
import Upload from "../components/Upload";
import { useGenerate } from "../hooks/useGenerate";
import { useRetry } from "../hooks/useRetry";
import { api } from "../services/api";
import { logout } from "../services/auth";

type GenItem = { id: number; prompt: string; style: string; imageUrl: string; createdAt: string; status: string };

export default function Studio() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Classic");
  const [imageUpload, setImageUpload] = useState<string | null>(null);
  const [history, setHistory] = useState<GenItem[]>([]);
  const { loading, generate, abort } = useGenerate();
  const { run } = useRetry(3, 400);

  useEffect(() => { 
    fetchHistory(); 
  }, []);

  async function fetchHistory() {
    try {
      const items = await api<GenItem[]>("/generations?limit=5");
      setHistory(items);
    } catch (e) {
      console.warn("failed to fetch history", e);
    }
  }

  async function onGenerate() {
    if (!imageUpload) return alert("Upload an image first");
    try {
      const result = await run(async () => {
        const r = await generate({ prompt, style, imageUpload });
        if ((r as any).aborted) throw new Error("aborted");
        return r;
      }, (attempt) => {
        console.log("retry attempt", attempt);
      });
      setHistory(h => [result as GenItem, ...h].slice(0, 5));
    } catch (err: any) {
      if (err.message === "aborted") {
        alert("Generation aborted");
        return;
      }
      if (err?.status === 503 || err?.message?.includes("Model overloaded")) {
        alert("Model overloaded. We tried a few times — please try again later.");
        return;
      }
      alert(err.message || "Failed to generate");
    } finally {
      fetchHistory();
    }
  }

  function onRestore(item: GenItem) {
    setPrompt(item.prompt);
    setStyle(item.style);
    setImageUpload(item.imageUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">AI Studio</h1>
          <button 
            onClick={() => { logout(); window.location.href = "/login"; }} 
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Generation Section */}
          <section className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Create Generation</h2>
            
            <div className="mb-5">
              <div className="text-sm font-semibold text-gray-700 mb-2">Upload Image</div>
              <Upload onChange={setImageUpload} />
            </div>
            
            <label className="block mt-5">
              <div className="text-sm font-semibold text-gray-700 mb-2">Prompt</div>
              <input 
                aria-label="Prompt" 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)} 
                placeholder="Describe your vision..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all" 
              />
            </label>

            <label className="block mt-5">
              <div className="text-sm font-semibold text-gray-700 mb-2">Style</div>
              <select 
                value={style} 
                onChange={e => setStyle(e.target.value)} 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all"
              >
                <option>Classic</option>
                <option>Editorial</option>
                <option>Avant-garde</option>
                <option>Casual</option>
              </select>
            </label>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={onGenerate} 
                disabled={loading} 
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md" 
                aria-disabled={loading}
              >
                {loading ? "Generating…" : "Generate"}
              </button>
              <button 
                onClick={() => abort()} 
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Abort
              </button>
            </div>
          </section>

          {/* History Section */}
          <aside className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Recent Generations</h2>
            <div className="space-y-3">
              {history.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm">No generations yet.</p>
                  <p className="text-xs mt-1">Your creations will appear here</p>
                </div>
              )}
              {history.map(h => (
                <button 
                  key={h.id} 
                  onClick={() => onRestore(h)} 
                  className="w-full text-left p-4 border border-gray-200 rounded-lg flex items-center gap-4 hover:bg-gray-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <img 
                    src={h.imageUrl} 
                    alt={h.prompt} 
                    className="w-16 h-16 rounded-lg object-cover shadow-sm" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{h.style}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(h.createdAt).toLocaleString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}