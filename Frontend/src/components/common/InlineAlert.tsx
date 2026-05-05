import Link from "next/link";

type InlineAlertVariant = "success" | "error" | "warning" | "info";

export function InlineAlert({
  variant,
  title,
  children,
  actions,
}: {
  variant: InlineAlertVariant;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const styles: Record<
    InlineAlertVariant,
    { wrap: string; iconWrap: string; icon: string }
  > = {
    success: {
      wrap: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-50",
      iconWrap: "bg-emerald-600 text-white",
      icon: "check_circle",
    },
    error: {
      wrap: "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-50",
      iconWrap: "bg-rose-600 text-white",
      icon: "error",
    },
    warning: {
      wrap: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-50",
      iconWrap: "bg-amber-600 text-white",
      icon: "warning",
    },
    info: {
      wrap: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-50",
      iconWrap: "bg-sky-600 text-white",
      icon: "info",
    },
  };

  const s = styles[variant];

  return (
    <div className={`w-full border rounded-[2rem] p-5 md:p-6 ${s.wrap}`}>
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${s.iconWrap}`}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined material-symbols-filled text-[22px]">
            {s.icon}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold tracking-tight text-base md:text-lg">
            {title}
          </p>
          {children ? (
            <div className="mt-1 text-sm md:text-[15px] font-semibold opacity-90 leading-relaxed">
              {children}
            </div>
          ) : null}
          {actions ? <div className="mt-4 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function InlineAlertButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-extrabold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

export function InlineAlertLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-4 py-2 rounded-2xl border border-slate-300/70 dark:border-white/15 bg-white/60 dark:bg-white/5 font-extrabold text-sm hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
    >
      {children}
    </Link>
  );
}

