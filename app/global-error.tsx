"use client";

/* Eng yuqori darajadagi xato chegarasi (root layout ham yiqilsa ishlaydi).
   Bu komponent root layout O'RNIGA render bo'ladi — shuning uchun i18n/provider
   kontekstiga kira olmaydi va o'z <html>/<body> ini beradi. globals.css yuklanmasligi
   mumkin, shu bois brend ranglar inline yozilgan (Suzani palitrasi). */
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
          background: "#08211A",
          color: "#F5EFE0",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 420,
            textAlign: "center",
            background: "#0E2E24",
            border: "1px solid rgba(214,74,52,.4)",
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
                "repeating-linear-gradient(90deg,#D64A34 0 7px,transparent 7px 13px)",
            }}
          />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 10px" }}>
            Something went wrong
          </h1>
          <p
            style={{
              color: "#9CB6A6",
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
              background: "#FFC53D",
              color: "#08211A",
              border: 0,
              borderRadius: 10,
              padding: "12px 26px",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 3px 0 0 #D64A34",
            }}
          >
            Try again · Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
