import LoginForm from "./login-form";

/**
 * If the user somehow lands on /login with an active session (e.g. typed it
 * manually), middleware already redirects them away — so we don't need a
 * second redirect() call here. Adding one creates a race: server redirect +
 * client router.push both fire, triggering the history API rate-limit error.
 *
 * The only reason to check the session here would be to avoid rendering the
 * login form for a split second before middleware kicks in. But since
 * middleware runs first on every request, an authenticated user never reaches
 * this component. The check is therefore unnecessary and harmful — removed.
 */
export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Radial vignette over grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, var(--background) 100%)",
        }}
      />

      {/* Copper glow accent */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-125 w-125 rounded-full opacity-[0.08]"
        style={{
          background:
            "radial-gradient(circle, var(--chart-3) 0%, var(--chart-5) 45%, transparent 70%)",
        }}
      />

      <CornerMarks />
      <LoginForm />
    </main>
  );
}

function CornerMarks() {
  const marks = [
    "top-6 left-6",
    "top-6 right-6 rotate-90",
    "bottom-6 left-6 -rotate-90",
    "bottom-6 right-6 rotate-180",
  ];

  return (
    <>
      {marks.map((cls, i) => (
        <svg
          key={i}
          className={`pointer-events-none absolute ${cls} text-border`}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M0 10 L0 0 L10 0" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ))}
    </>
  );
}
