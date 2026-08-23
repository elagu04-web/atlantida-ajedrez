export function TextoBrillante({
  children,
  className = "",
  oscuro = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Para usar sobre fondos oscuros — el gradiente por defecto está pensado para fondo claro. */
  oscuro?: boolean;
}) {
  return (
    <span className={`${oscuro ? "texto-brillante-oscuro" : "texto-brillante"} ${className}`}>
      {children}
    </span>
  );
}
