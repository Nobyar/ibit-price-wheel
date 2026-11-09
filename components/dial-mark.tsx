export function DialMark({ size }: { size: number }) {
  const stroke = Math.max(2, Math.round(size * 0.045));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#121416",
        borderRadius: Math.round(size * 0.22),
      }}
    >
      <div
        style={{
          width: Math.round(size * 0.72),
          height: Math.round(size * 0.72),
          borderRadius: "50%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#1c2126",
          border: `${stroke}px solid #8b949e`,
          paddingTop: Math.round(size * 0.08),
        }}
      >
        <div
          style={{
            width: Math.max(3, Math.round(size * 0.1)),
            height: Math.round(size * 0.22),
            borderRadius: size,
            background: "#3dff9a",
          }}
        />
      </div>
    </div>
  );
}
