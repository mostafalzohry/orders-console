import { ValuePlaceholder } from "@/components/ui/value-placeholder";

export function HeadlineTile({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold whitespace-nowrap text-slate-900 tabular-nums sm:text-2xl">
        {value ?? <ValuePlaceholder />}
      </dd>
    </div>
  );
}
