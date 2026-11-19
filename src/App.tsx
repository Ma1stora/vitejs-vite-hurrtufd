
import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { signInAnonymously } from "firebase/auth";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  increment
} from "firebase/firestore";

type Idea = {
  id: string;
  idea: string;
  votes: number;
};

export default function App() {
  const [lang, setLang] = useState("de");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [food, setFood] = useState("Burger");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);

  const bg = lang === "bg";

  const dishes = [
    { name: "Burger", icon: "🍔" },
    { name: "Pizza", icon: "🍕" },
    { name: "Spaghetti", icon: "🍝" },
    { name: "Salat", icon: "🥗" }
  ];

  const choices: Record<string, string[]> = {
    Burger: ["Хляб", "Телешко", "Пилешко", "Кашкавал", "Салата", "Домат", "Лук", "BBQ сос"],
    Pizza: ["Моцарела", "Салам", "Шунка", "Гъби", "Маслини", "Чушки", "Домати"],
    Spaghetti: ["Болонезе", "Карбонара", "Доматен сос", "Пармезан", "Гъби"],
    Salat: ["Домати", "Краставици", "Сирене", "Маслини", "Царевица", "Маруля"]
  };

  const t = (de: string, b: string) => bg ? b : de;

  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((error) => {
        console.error("Firebase login error:", error);
      });
    }
  }, []);

  async function joinFamily() {
    if (!name.trim() || !code.trim()) {
      alert(t("Bitte Name und Familiencode eingeben.", "Моля, въведи име и семеен код."));
      return;
    }

    if (!auth.currentUser) {
      alert(t("Verbindung wird hergestellt. Bitte erneut versuchen.", "Свързването се извършва. Опитай отново."));
      return;
    }

    setLoading(true);

    try {
      const familyRef = doc(db, "families", code.trim());

      await setDoc(familyRef, {
        createdAt: serverTimestamp()
      }, { merge: true });

      setJoined(true);
    } catch (error) {
      console.error("Family error:", error);
      alert(t("Familie konnte nicht geöffnet werden.", "Семейството не може да бъде отворено."));
    } finally {
      setLoading(false);
    }
  }

  function toggleIngredient(item: string) {
    setIngredients(old =>
      old.includes(item)
        ? old.filter(x => x !== item)
        : [...old, item]
    );
  }

  async function addIdea() {
    if (!joined || ingredients.length === 0) {
      alert(t("Bitte Zutaten auswählen.", "Моля, избери съставки."));
      return;
    }

    const idea = `${name}: ${food} – ${ingredients.join(", ")}`;

    try {
      await addDoc(collection(db, "families", code.trim(), "ideas"), {
        idea,
        name,
        food,
        ingredients,
        votes: 0,
        createdAt: serverTimestamp()
      });

      setIngredients([]);
      alert(t("Vorschlag gesendet!", "Предложението е изпратено!"));
    } catch (error) {
      console.error("Write error:", error);
      alert(t("Vorschlag konnte nicht gespeichert werden.", "Предложението не може да бъде записано."));
    }
  }

  async function voteIdea(id: string) {
    try {
      await updateDoc(
        doc(db, "families", code.trim(), "ideas", id),
        { votes: increment(1) }
      );
    } catch (error) {
      console.error("Vote error:", error);
      alert(t("Abstimmung fehlgeschlagen.", "Гласуването не бе успешно."));
    }
  }

  useEffect(() => {
    if (!joined || !code.trim()) return;

    const q = query(
      collection(db, "families", code.trim(), "ideas"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIdeas(snapshot.docs.map(d => ({
        id: d.id,
        idea: d.data().idea as string,
        votes: d.data().votes || 0
      })));
    }, (error) => {
      console.error("Firestore read error:", error);
    });

    return () => unsubscribe();
  }, [joined, code]);

  return (
    <main style={{
      fontFamily: "Arial, sans-serif",
      maxWidth: 650,
      margin: "auto",
      padding: 18,
      color: "#263238",
      background: "#fffaf2",
      minHeight: "100vh"
    }}>
      <header style={{
        background: "#f59e0b",
        padding: 22,
        borderRadius: 18,
        textAlign: "center",
        color: "#38220b"
      }}>
        <div style={{ fontSize: 38 }}>🍽️</div>
        <h1>Was essen wir heute?</h1>
        <p>{t("Unser Familien-Dinner", "Нашата семейна вечеря")}</p>
        <button onClick={() => setLang(bg ? "de" : "bg")}>
          {bg ? "Deutsch 🇩🇪" : "Български 🇧🇬"}
        </button>
      </header>

      {!joined ? (
        <section style={{ marginTop: 25 }}>
          <h2>{t("Willkommen!", "Добре дошли!")}</h2>
          <p>{t("Gib deinen Namen und den Familiencode ein.", "Въведи името си и семейния код.")}</p>

          <input
            placeholder={t("Dein Name", "Твоето име")}
            value={name}
            onChange={e => setName(e.target.value)}
            style={field}
          />

          <input
            placeholder={t("Familiencode", "Семеен код")}
            value={code}
            onChange={e => setCode(e.target.value)}
            style={field}
          />

          <button style={primary} onClick={joinFamily} disabled={loading}>
            {loading
              ? t("Bitte warten...", "Моля, изчакай...")
              : t("Familie betreten", "Влез в семейството")}
          </button>
        </section>
      ) : (
        <>
          <h2>👋 {t("Hallo", "Здравей")}, {name}!</h2>
          <p>{t("Was möchtest du essen?", "Какво ти се яде?")}</p>

          <div style={grid}>
            {dishes.map(d => (
              <button
                key={d.name}
                onClick={() => {
                  setFood(d.name);
                  setIngredients([]);
                }}
                style={{
                  ...dishButton,
                  background: food === d.name ? "#fbbf24" : "white"
                }}
              >
                <span style={{ fontSize: 30 }}>{d.icon}</span>
                <br />{d.name}
              </button>
            ))}
          </div>

          <h3>{t("Wähle Zutaten", "Избери съставки")}</h3>

          <div style={grid}>
            {choices[food].map(item => (
              <button
                key={item}
                onClick={() => toggleIngredient(item)}
                style={{
                  ...dishButton,
                  background: ingredients.includes(item) ? "#bbf7d0" : "white"
                }}
              >
                {ingredients.includes(item) ? "✓ " : "+ "}{item}
              </button>
            ))}
          </div>

          <div style={panel}>
            <h3>{t("Dein Gericht", "Твоето ястие")}</h3>
            <p>{food}: {ingredients.join(", ") || "..."}</p>
            <button style={primary} onClick={addIdea}>
              {t("Vorschlag senden", "Изпрати предложение")}
            </button>
          </div>

          <h2>🗳️ {t("Familien-Abstimmung", "Семейно гласуване")}</h2>

          {ideas.length === 0 && (
            <p>{t("Noch keine Vorschläge.", "Все още няма предложения.")}</p>
          )}

          {ideas.map(item => (
            <div key={item.id} style={panel}>
              <p>{item.idea}</p>
              <button onClick={() => voteIdea(item.id)}>
                ❤️ {t("Abstimmen", "Гласувай")} ({item.votes})
              </button>
            </div>
          ))}
        </>
      )}

      <footer style={{ textAlign: "center", marginTop: 30, color: "#888" }}>
        ❤️ Made for family
      </footer>
    </main>
  );
}

const field: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: 14,
  margin: "12px 0",
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 16
};

const primary: React.CSSProperties = {
  background: "#e99516",
  color: "white",
  border: 0,
  padding: 14,
  borderRadius: 10,
  width: "100%",
  fontSize: 16,
  fontWeight: "bold",
  cursor: "pointer"
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 10,
  marginBottom: 20
};

const dishButton: React.CSSProperties = {
  border: "1px solid #ead9bd",
  borderRadius: 12,
  padding: 14,
  fontSize: 15,
  cursor: "pointer"
};

const panel: React.CSSProperties = {
  background: "#fff1d6",
  borderRadius: 12,
  padding: 15,
  margin: "14px 0"
};
