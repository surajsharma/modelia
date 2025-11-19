import { useEffect, useState } from "react";
import Upload from "../components/Upload";
import { useGenerate } from "../hooks/useGenerate";
import { useRetry } from "../hooks/useRetry";
import { api, getCurrentUser } from "../services/api";
import { logout } from "../services/auth";
import DarkModeToggle from "../components/DarkModeToggle";

type GenItem = {
  id: number;
  prompt: string;
  style: string;
  imageUrl: string;
  createdAt: string;
  status: string;
};

export default function Studio() {
  const [user, setUser] = useState<{ id: number; email: string } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Classic");
  const [imageUpload, setImageUpload] = useState<string | null>(null);
  const [history, setHistory] = useState<GenItem[]>([]);
  const { loading, generate, abort } = useGenerate();
  const { run } = useRetry(3, 400);

  useEffect(() => {
    fetchUser();
    fetchHistory();
  }, []);

  async function fetchUser() {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (e) {
      console.error("Failed to fetch user", e);
    }
  }

  async function fetchHistory() {
    try {
      const items = await api<GenItem[]>("/generations?limit=5");
      setHistory(items);
    } catch (e) {
      console.warn("failed to fetch history", e);
    }
  }

  async function onGenerate() {
    if (!imageUpload) {
      alert("Please upload an image first");
      return;
    }
    if (!prompt.trim()) {
      alert("Please enter a prompt");
      return;
    }

    try {
      const result = await run(
        async () => {
          return await generate({ prompt, style, imageUpload });
        },
        (attempt) => {
          console.log("retry attempt", attempt);
        }
      );
      setHistory((h) => [result as GenItem, ...h].slice(0, 5));
    } catch (err: any) {
      if (err.message === "aborted" || err.name === "AbortError") {
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
    const fullImageUrl = item.imageUrl.startsWith('/api')
      ? item.imageUrl
      : `/api${item.imageUrl}`;
    setImageUpload(fullImageUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 transition-colors">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 flex justify-between items-center transition-colors">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">
              Modelia AI Studio
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 transition-colors">
              {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <DarkModeToggle />
            <button
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Generation */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-colors">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 transition-colors">
              Create Generation
            </h2>

            <div className="mb-5">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Upload Image
              </div>
              <Upload value={imageUpload} onChange={setImageUpload} />
            </div>

            <label className="block mt-5">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Prompt
              </div>
              <input
                aria-label="Prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:bg-white dark:focus:bg-gray-600 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </label>

            <label className="block mt-5">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                Style
              </div>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:bg-white dark:focus:bg-gray-600 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-white"
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
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 dark:bg-blue-500 text-white font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md"
                aria-disabled={loading}
              >
                {loading ? "Generating…" : "Generate"}
              </button>
              <button
                onClick={abort}
                disabled={!loading}
                className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Abort
              </button>
            </div>
          </section>

          {/* Recent Generations */}
          <aside className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-colors">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 transition-colors">
              Recent Generations
            </h2>
            <div className="space-y-3">
              {history.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 transition-colors">
                  <p className="text-sm">No generations yet.</p>
                  <p className="text-xs mt-1">Your creations will appear here</p>
                </div>
              )}
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => onRestore(h)}
                  className="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                >
                  <img
                    src={"/api" + h.imageUrl}
                    alt={h.prompt}
                    className="w-16 h-16 rounded-lg object-cover shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 dark:text-white truncate transition-colors">
                      {h.style}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate transition-colors">
                      {h.prompt}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 transition-colors">
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