export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Código OAuth2 não informado" });
  }

  const {
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
  } = process.env;

  const redirectUri =
    "https://cidade-alta.github.io/elei-o-cidade-alta/callback.html";

  try {
    const tokenResponse = await fetch(
      "https://discord.com/api/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri
        })
      }
    );

    const token = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(400).json({
        error: "Falha ao entrar com Discord"
      });
    }

    const userResponse = await fetch(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`
        }
      }
    );

    const user = await userResponse.json();

    if (!userResponse.ok) {
      return res.status(400).json({
        error: "Não foi possível obter sua conta do Discord"
      });
    }

    const headers = {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SECRET_KEY,
      "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`
    };

    const verificarResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/eleitores?discord_id=eq.${encodeURIComponent(user.id)}&select=id,discord,votou`,
      {
        headers
      }
    );

    const existentes = await verificarResponse.json();

    if (!verificarResponse.ok) {
      return res.status(500).json({
        error: "Erro ao consultar o cadastro"
      });
    }

    if (existentes.length > 0) {
      return res.status(200).json({
        existente: true,
        id: existentes[0].id,
        discord: existentes[0].discord,
        votou: existentes[0].votou
      });
    }

    let codigo;
    let criado = false;

    while (!criado) {
      codigo =
        "CA-" + Math.floor(100000 + Math.random() * 900000);

      const verificarCodigo = await fetch(
        `${SUPABASE_URL}/rest/v1/eleitores?id=eq.${codigo}&select=id`,
        {
          headers
        }
      );

      const dadosCodigo = await verificarCodigo.json();

      if (!verificarCodigo.ok) {
        return res.status(500).json({
          error: "Erro ao verificar código"
        });
      }

      if (dadosCodigo.length === 0) {
        criado = true;
      }
    }

    const nomeDiscord =
      user.global_name ||
      user.username ||
      "Usuário do Discord";

    const inserirResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/eleitores`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          id: codigo,
          discord: nomeDiscord,
          discord_id: user.id,
          votou: false
        })
      }
    );

    const novo = await inserirResponse.json();

    if (!inserirResponse.ok) {
      if (inserirResponse.status === 409) {
        return res.status(409).json({
          error: "Esta conta do Discord já possui um cadastro."
        });
      }

      return res.status(500).json({
        error: "Não foi possível criar seu cadastro"
      });
    }

    return res.status(200).json({
      existente: false,
      id: novo[0].id,
      discord: novo[0].discord,
      votou: novo[0].votou
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro interno no servidor"
    });
  }
}