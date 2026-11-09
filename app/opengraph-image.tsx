import { ImageResponse } from "next/og";

export const alt =
  "IBIT Price Wheel, a charcoal dial with green readouts for a Bitcoin and IBIT what-if.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#121416",
          color: "#ebe6dc",
          padding: "64px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
          }}
        >
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, color: "#d9c7a6" }}>
            WHAT-IF ESTIMATOR
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 78 }}>IBIT Price Wheel</div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 32, color: "#3dff9a" }}>
              Hypothetical Bitcoin on a dial. IBIT follows your baseline ratio.
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#c4beb2" }}>
            Not a quote, a forecast, or an order.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 280,
          }}
        >
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: "#1c2126",
              border: "12px solid #6a737c",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingTop: 28,
            }}
          >
            <div
              style={{
                width: 22,
                height: 78,
                borderRadius: 20,
                background: "#3dff9a",
              }}
            />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
