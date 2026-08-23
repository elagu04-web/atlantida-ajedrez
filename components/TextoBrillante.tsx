export function TextoBrillante({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`texto-brillante ${className}`}>{children}</span>;
}
