// Fonction serveur Netlify — appelle l'API Anthropic avec la clé gardée secrète côté serveur.
// La clé ANTHROPIC_API_KEY doit être ajoutée dans Netlify : Site configuration > Environment variables.

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { dominant, secondary, open1, open2 } = JSON.parse(event.body);

    const systemPrompt = `Tu écris pour Other Format, un bureau de coaching de managers et dirigeants. Tu rédiges une courte synthèse personnalisée (180 à 250 mots) qui conclut un quiz "Quel type de manager êtes-vous ?", à partir du profil dominant de la personne et de ce qu'elle a écrit à deux questions ouvertes.

Règles de ton, à respecter strictement :
- Vouvoiement uniquement.
- Valide ce que la personne vit, sans jamais la juger, sans poser de terme clinique ou psychologique sur elle.
- Reformule ce qu'elle a écrit avec tes propres mots, ne recopie jamais une phrase entière telle quelle.
- Reste positif et tourné vers l'avenir, sans minimiser une vraie difficulté.
- Rappelle si pertinent qu'être à l'écoute ne veut pas dire tout supporter, et qu'un bon manager sait aussi poser une limite claire, sans être moralisateur.
- N'utilise jamais le mot "rare", jamais de tiret cadratin (—).
- Ne mentionne jamais que tu es une IA.
- Ne termine pas par une phrase d'appel à l'action ou une ouverture commerciale vers un accompagnement : ça sera géré ailleurs sur la page, juste après ton texte. Termine simplement ta réflexion.
- Réponds uniquement avec le texte final, sans titre ni guillemets englobants.`;

    const userContent = `Profil dominant : ${dominant.name}
Description du profil : ${dominant.description}
${secondary ? `Profil secondaire : ${secondary.name}` : ''}

Réponse à "repensez à une situation récente où votre rôle de manager vous a mis en difficulté" :
${open1 || "(pas de réponse)"}

Réponse à "si vous pouviez changer une seule chose dans votre façon de manager aujourd'hui, ce serait quoi ?" :
${open2 || "(pas de réponse)"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, headers, body: JSON.stringify({ error: errText }) };
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n")
      .trim();

    return { statusCode: 200, headers, body: JSON.stringify({ text }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
