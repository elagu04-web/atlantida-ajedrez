/**
 * Barras horizontales simples (divs proporcionales, sin SVG) — para
 * rankings y distribuciones donde alcanza con comparar longitudes.
 */
export function GraficoBarras({
  datos,
  formatoValor = (v: number) => String(v),
  colorBarra = "#3b82f6",
}: {
  datos: { etiqueta: string; valor: number }[];
  formatoValor?: (v: number) => string;
  colorBarra?: string;
}) {
  if (datos.length === 0) {
    return <p className="text-sm text-zinc-400">Sin datos todavía.</p>;
  }
  const maximo = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <div className="flex flex-col gap-2">
      {datos.map((d) => (
        <div key={d.etiqueta} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate text-zinc-300" title={d.etiqueta}>
            {d.etiqueta}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-white/5">
            <div
              className="h-full rounded"
              style={{ width: `${Math.max(2, (d.valor / maximo) * 100)}%`, background: colorBarra }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-mono text-xs text-zinc-400">
            {formatoValor(d.valor)}
          </span>
        </div>
      ))}
    </div>
  );
}
