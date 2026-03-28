export default function Introduction() {
  const pronouns = [
    {
      label: "A. Pronoms sujets",
      forms: "je, tu, il/elle/on, nous, vous, ils/elles",
      explanation: "Font l'action. Sont placés devant le verbe.",
      example: "Tu étudies le français.",
    },
    {
      label: "B. Pronoms toniques",
      forms: "moi, toi, lui/elle, nous, vous, eux/elles",
      explanation: "Pour insister, après « c'est », ou après une préposition (avec, pour, chez, sans…).",
      example: "Viens chez moi ce soir !",
    },
    {
      label: "C. Pronoms COD",
      forms: "me, te, le / la / l', nous, vous, les",
      explanation: "Remplace un COD (sans préposition). Répond à : quoi ? qui ?",
      example: "Tu lis ce livre ? → Oui, je le lis.",
    },
    {
      label: "D. Pronoms COI",
      forms: "me, te, lui, nous, vous, leur",
      explanation: "Remplace un complément introduit par « à » (souvent une personne). Répond à : à qui ?",
      example: "Tu parles à Marie ? → Je lui parle.",
    },
    {
      label: "E. Pronoms adverbiaux — Y",
      forms: "y",
      explanation: "Remplace un lieu (préposition à, en, dans, sur…).",
      example: "Tu vas à Lausanne ? → J'y vais.",
    },
    {
      label: "E. Pronoms adverbiaux — EN",
      forms: "en",
      explanation: "Remplace une quantité ou un complément introduit par « de ».",
      example: "Tu veux du café ? → Oui, j'en veux.",
    },
  ];

  const labelColor = {
    "A": "#2563eb",
    "B": "#7c3aed",
    "C": "#0891b2",
    "D": "#059669",
    "E": "#d97706",
  };

  return (
    <div style={{ fontFamily: "Calibri, 'Segoe UI', sans-serif", fontSize: 15, maxWidth: 860, margin: "36px auto", padding: "0 24px", color: "#1a1a1a", lineHeight: 1.6 }}>

      <h1 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 4, letterSpacing: 0.2 }}>
        Les pronoms personnels en français
      </h1>
      <div style={{ height: 1, background: "#d1d5db", marginBottom: 20 }} />

      <Row label="Définition">
        Un pronom est un mot qui remplace un nom ou un groupe nominal.
      </Row>

      <Spacer />

      <Row label="Place">
        <div>Ordre général : Sujet + <em>(ne)</em> + Pronom(s) + Verbe.</div>
        <div style={{ marginTop: 3 }}>Avec un infinitif : Sujet + <em>(ne)</em> + verbe + <em>(pas)</em> + Pronom(s) + infinitif.</div>
      </Row>

      <Row label="Exemple">
        <span style={{ fontStyle: "italic", color: "#374151" }}>Nous ne le lui donnons pas.</span>
      </Row>

      <Spacer />

      <div style={{ fontWeight: "bold", fontSize: 15, marginBottom: 10, color: "#111" }}>
        Les pronoms personnels
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: "0 16px", borderBottom: "1px solid #9ca3af", paddingBottom: 5, marginBottom: 2 }}>
        <span style={{ color: "#6b7280", fontSize: 13 }}>Catégorie &amp; formes</span>
        <span style={{ color: "#6b7280", fontSize: 13 }}>Explication</span>
        <span style={{ color: "#6b7280", fontSize: 13 }}>Exemple</span>
      </div>

      {pronouns.map((p, i) => {
        const letter = p.label.split(".")[0];
        const color = labelColor[letter] || "#374151";
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr 1fr",
              gap: "0 16px",
              borderBottom: "1px solid #f0f0f0",
              padding: "9px 0",
              alignItems: "start",
            }}
          >
            <div>
              <div style={{ fontWeight: "bold", color, fontSize: 13, marginBottom: 2 }}>{p.label}</div>
              <div style={{ fontStyle: "italic", color: "#374151", fontSize: 14 }}>{p.forms}</div>
            </div>
            <div style={{ fontSize: 14, color: "#1f2937" }}>{p.explanation}</div>
            <div style={{ fontSize: 14, color: "#4b5563", fontStyle: "italic" }}>{p.example}</div>
          </div>
        );
      })}

      <Spacer />

      <Row label="Ordre des pronoms">
        <span style={{ fontFamily: "monospace", fontSize: 14, background: "#f3f4f6", padding: "3px 8px", borderRadius: 4, display: "inline-block" }}>
          me/te/se/nous/vous → le/la/les → lui/leur → y → en
        </span>
      </Row>

      <Spacer />

      <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6, padding: "10px 14px", display: "flex", gap: 10 }}>
        <span style={{ fontWeight: "bold", color: "#92400e", minWidth: 60 }}>Conseil</span>
        <span style={{ color: "#78350f", fontSize: 14 }}>
          Pour savoir s'il faut utiliser <em>le/la</em> ou <em>lui</em>, regarde toujours le verbe.
          Est-ce qu'on dit « appeler quelqu'un » (COD) ou « parler à quelqu'un » (COI) ?
        </span>
      </div>

    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 6, alignItems: "flex-start" }}>
      <span style={{ minWidth: 140, fontWeight: "bold", color: "#374151", fontSize: 14, paddingTop: 1 }}>{label}</span>
      <span style={{ color: "#1f2937", fontSize: 14 }}>{children}</span>
    </div>
  );
}

function Spacer() {
  return <div style={{ height: 16 }} />;
}
