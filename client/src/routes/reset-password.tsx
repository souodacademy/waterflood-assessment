import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/reset-password")({
  head: () => pageHead("Reset password", "Securely set a new password for your workspace account."),
  component: ResetPassword,
});
function ResetPassword() {
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password !== f.get("confirm")) {
      setMessage("The passwords do not match.");
      setBusy(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    setMessage(error ? error.message : "Your password has been updated.");
    setDone(!error);
  };
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <section className="panel w-full max-w-[420px]">
        <div className="panel-heading">
          <h1 className="panel-title">Reset password</h1>
        </div>
        <form onSubmit={submit} className="detail-section auth-form">
          {ready && !done ? (
            <>
              <div className="form-field">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              <div className="form-field">
                <label htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Update password"}
              </Button>
            </>
          ) : !done ? (
            <p className="text-muted-foreground text-sm">
              Open the reset link from your email to continue.
            </p>
          ) : null}
          {message && <p className={done ? "success-message" : "error-message"}>{message}</p>}
          <Button asChild variant="outline">
            <Link to="/">Back to workspace</Link>
          </Button>
        </form>
      </section>
    </main>
  );
}
