export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Código do Discord não informado" });
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

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
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(400).json({
        error: "Não foi possível autenticar com o Discord",
        detalhes: tokenData
      });
    }

    const userResponse = await fetch(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `${tokenData.token_type} ${tokenData.access_token}`
        }
      }
    );

    const user = await userResponse.json();

    if (!userResponse.ok) {
      return res.status(400).json({
        error: "Não foi possível obter os dados do Discord"
      });
    }

    return res.status(200).json({
      id: user.id,
      username: user.username,
      global_name: user.global_name || user.username
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro interno no servidor"
    });
  }
}