"use client";

/* Eng yuqori darajadagi xato chegarasi (root layout ham yiqilsa ishlaydi).
   Bu komponent root layout O'RNIGA render bo'ladi — shuning uchun i18n/provider
   kontekstiga kira olmaydi va o'z <html>/<body> ini beradi. globals.css yuklanmasligi
   mumkin, shu bois brend ranglar inline yozilgan (Suzani Light palitrasi). */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#FFFFFF",
          color: "#0C1F16",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 420,
            textAlign: "center",
            background: "#FFFFFF",
            border: "1px solid #DDEAE3",
            boxShadow: "0 16px 40px rgba(12,31,22,.10)",
            borderRadius: 14,
            padding: "40px 28px",
          }}
        >
          {/* Suzani chok — imzo element */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 24,
              right: 24,
              height: 3,
              background:
                "repeating-linear-gradient(90deg,#15803D 0 7px,transparent 7px 13px)",
            }}
          />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 10px" }}>
            Something went wrong
          </h1>
          <p
            style={{
              color: "#4C6156",
              fontSize: 14,
              lineHeight: 1.6,
              margin: "0 0 24px",
            }}
          >
            An unexpected error occurred. Please try again.
            <br />
            Kutilmagan xatolik yuz berdi. Qayta urinib ko&apos;ring.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#15803D",
              color: "#FFFFFF",
              border: 0,
              borderRadius: 10,
              padding: "12px 26px",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 3px 0 0 #0E5C2C",
            }}
          >
            Try again · Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
