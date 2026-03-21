import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase, hasSupabaseEnv } from "../lib/supabase";

type FeedbackTag = "general" | "bug" | "idea" | "calculation" | "ux";
type FeedbackStatus = "new" | "reviewed" | "resolved";

type FeedbackRow = {
  id: string;
  created_at: string;
  message: string;
  email: string | null;
  tag: FeedbackTag;
  page: string | null;
  source_url: string | null;
  status: FeedbackStatus;
};

const ADMIN_EMAIL = "pressurecalapp@gmail.com";

const tagOptions = [
  "all",
  "general",
  "bug",
  "idea",
  "calculation",
  "ux",
] as const;

const statusOptions = ["all", "new", "reviewed", "resolved"] as const;

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] =
    useState<(typeof tagOptions)[number]>("all");
  const [statusFilter, setStatusFilter] =
    useState<(typeof statusOptions)[number]>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginEmail, setLoginEmail] = useState(ADMIN_EMAIL);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const hasLoadedRef = useRef(false);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    async function checkAuth() {
      if (!hasSupabaseEnv || !supabase) {
        setError("Supabase is not configured.");
        setAuthChecked(true);
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const allowed =
        !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      setIsAuthorized(allowed);
      setAuthChecked(true);

      if (allowed) {
        await loadFeedback();
      } else {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      return;
    }

    if (rows.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [rows]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!supabase) return;

    setLoggingIn(true);
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    if (error) {
      setLoginError(error.message);
      setLoggingIn(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const allowed =
      !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (!allowed) {
      setLoginError("This account is not allowed to access the dashboard.");
      await supabase.auth.signOut();
      setLoggingIn(false);
      return;
    }

    setIsAuthorized(true);
    setLoggingIn(false);
    await loadFeedback();
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setIsAuthorized(false);
    setRows([]);
    setLoginPassword("");
  }

  async function loadFeedback(showRefreshing = false) {
    if (!supabase) return;

    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    const { data, error } = await supabase
      .from("feedback")
      .select("id, created_at, message, email, tag, page, source_url, status")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setRows((data ?? []) as FeedbackRow[]);
    setLoading(false);
    setRefreshing(false);
  }

  async function updateStatus(id: string, status: FeedbackStatus) {
    if (!supabase) return;

    setUpdatingId(id);

    const { error } = await supabase
      .from("feedback")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Failed to update status:", error);
      setUpdatingId(null);
      return;
    }

    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, status } : row))
    );

    setUpdatingId(null);
  }

  async function handleCopyMessage(row: FeedbackRow) {
    try {
      await navigator.clipboard.writeText(row.message);
      setCopiedId(row.id);

      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }

      copiedTimerRef.current = window.setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesTag = tagFilter === "all" || row.tag === tagFilter;
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      const matchesSearch =
        q.length === 0 ||
        row.message.toLowerCase().includes(q) ||
        (row.email ?? "").toLowerCase().includes(q) ||
        (row.page ?? "").toLowerCase().includes(q) ||
        row.tag.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q);

      return matchesTag && matchesStatus && matchesSearch;
    });
  }, [rows, search, tagFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      new: rows.filter((r) => r.status === "new").length,
      reviewed: rows.filter((r) => r.status === "reviewed").length,
      resolved: rows.filter((r) => r.status === "resolved").length,
      bugs: rows.filter((r) => r.tag === "bug").length,
      ideas: rows.filter((r) => r.tag === "idea").length,
      calculation: rows.filter((r) => r.tag === "calculation").length,
      ux: rows.filter((r) => r.tag === "ux").length,
    };
  }, [rows]);

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          Checking access...
        </div>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <>
        <Helmet>
          <title>Admin Login | PressureCal</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>

        <main className="min-h-screen bg-slate-100 px-4 py-8">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Internal
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Admin Login
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in with your admin account to view feedback.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                  required
                />
              </div>

              {loginError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loggingIn ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Feedback | PressureCal</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Internal
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Feedback Dashboard
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Review user feedback, spot trends, and track progress.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadFeedback(true)}
                disabled={refreshing}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total feedback" value={stats.total} />
            <StatCard label="New" value={stats.new} />
            <StatCard label="Reviewed" value={stats.reviewed} />
            <StatCard label="Resolved" value={stats.resolved} />
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStatCard label="Bugs" value={stats.bugs} />
            <MiniStatCard label="Ideas" value={stats.ideas} />
            <MiniStatCard label="Calculation issues" value={stats.calculation} />
            <MiniStatCard label="UX issues" value={stats.ux} />
          </div>

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.35fr_0.35fr]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Search
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search message, email, page, tag..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tag
                </label>
                <select
                  value={tagFilter}
                  onChange={(e) =>
                    setTagFilter(e.target.value as (typeof tagOptions)[number])
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  {tagOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All tags" : option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as (typeof statusOptions)[number]
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All statuses" : option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="px-6 py-12 text-sm text-slate-600">
                Loading feedback...
              </div>
            ) : error ? (
              <div className="px-6 py-12 text-sm text-red-700">{error}</div>
            ) : filteredRows.length === 0 ? (
              <div className="px-6 py-12 text-sm text-slate-600">
                No matching feedback found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Tag
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Page
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Message
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row, index) => {
                      const rowBg =
                        row.tag === "bug"
                          ? "bg-red-50/60"
                          : index % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/50";

                      return (
                        <tr key={row.id} className={rowBg}>
                          <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-700">
                            <div>{new Date(row.created_at).toLocaleDateString()}</div>
                            <div className="text-xs text-slate-500">
                              {new Date(row.created_at).toLocaleTimeString()}
                            </div>
                          </td>

                          <td className="border-b border-slate-200 px-4 py-3 align-top">
                            <TagBadge tag={row.tag} />
                          </td>

                          <td className="border-b border-slate-200 px-4 py-3 align-top">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={row.status} />
                              {row.status === "new" && (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  NEW
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-700">
                            {row.page || "—"}
                          </td>

                          <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-900">
                            <div className="max-w-xl whitespace-pre-wrap leading-6">
                              {row.message}
                            </div>

                            {row.source_url && (
                              <a
                                href={row.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-block text-xs font-medium text-slate-500 underline underline-offset-4 hover:text-slate-700"
                              >
                                Open source page
                              </a>
                            )}
                          </td>

                          <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-700">
                            {row.email || "—"}
                          </td>

                          <td className="border-b border-slate-200 px-4 py-3 align-top">
                            <div className="flex min-w-[180px] flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(row)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                {copiedId === row.id ? "Copied" : "Copy message"}
                              </button>

                              <button
                                type="button"
                                disabled={updatingId === row.id}
                                onClick={() => updateStatus(row.id, "reviewed")}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                              >
                                Mark reviewed
                              </button>

                              <button
                                type="button"
                                disabled={updatingId === row.id}
                                onClick={() => updateStatus(row.id, "resolved")}
                                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                              >
                                Mark resolved
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

function MiniStatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

function TagBadge({ tag }: { tag: FeedbackTag }) {
  const classes =
    tag === "bug"
      ? "border-red-200 bg-red-50 text-red-800"
      : tag === "idea"
      ? "border-violet-200 bg-violet-50 text-violet-800"
      : tag === "calculation"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tag === "ux"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {tag}
    </span>
  );
}

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const classes =
    status === "resolved"
      ? "border-green-200 bg-green-50 text-green-800"
      : status === "reviewed"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {status}
    </span>
  );
}