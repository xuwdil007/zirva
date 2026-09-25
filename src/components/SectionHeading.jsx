export default function SectionHeading({
  number,
  label,
  children,
  className = "",
}) {
  return (
    <div className={`section-heading ${className}`}>
      <div className="eyebrow">
        <span>{number} /</span> {label}
      </div>
      {children && <h2>{children}</h2>}
    </div>
  );
}
