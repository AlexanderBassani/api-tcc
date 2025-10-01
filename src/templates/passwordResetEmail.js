/**
 * Template de email para reset de senha
 * @param {string} name - Nome do usuário
 * @param {string} resetUrl - URL para reset de senha
 * @returns {object} Objeto com subject, html e text
 */
const passwordResetEmail = (name, resetUrl) => {
  const subject = 'Recuperação de Senha';

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f9f9f9;
          border-radius: 10px;
          padding: 30px;
          border: 1px solid #ddd;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #2c3e50;
          margin: 0;
        }
        .content {
          background-color: white;
          padding: 20px;
          border-radius: 5px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #3498db;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .button:hover {
          background-color: #2980b9;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Recuperação de Senha</h1>
        </div>

        <div class="content">
          <p>Olá, <strong>${name}</strong>!</p>

          <p>Recebemos uma solicitação para redefinir a senha da sua conta. Se você fez essa solicitação, clique no botão abaixo:</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Redefinir Senha</a>
          </div>

          <p>Ou copie e cole o seguinte link no seu navegador:</p>
          <p style="word-break: break-all; color: #3498db;">${resetUrl}</p>

          <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
              <li>Este link expira em <strong>30 minutos</strong></li>
              <li>Por segurança, use o link apenas uma vez</li>
              <li>Após redefinir sua senha, este link ficará inválido</li>
            </ul>
          </div>

          <p>Se você <strong>não solicitou</strong> essa redefinição de senha, ignore este email. Sua senha permanecerá inalterada.</p>

          <p>Por segurança, recomendamos:</p>
          <ul>
            <li>Usar uma senha forte e única</li>
            <li>Não compartilhar sua senha com ninguém</li>
            <li>Ativar autenticação de dois fatores quando disponível</li>
          </ul>
        </div>

        <div class="footer">
          <p>Este é um email automático, por favor não responda.</p>
          <p>Se você tiver dúvidas, entre em contato com nosso suporte.</p>
          <p>&copy; ${new Date().getFullYear()} Sistema API. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Olá, ${name}!

Recebemos uma solicitação para redefinir a senha da sua conta.

Para redefinir sua senha, acesse o link abaixo:
${resetUrl}

IMPORTANTE:
- Este link expira em 30 minutos
- Use o link apenas uma vez
- Após redefinir sua senha, este link ficará inválido

Se você não solicitou essa redefinição de senha, ignore este email. Sua senha permanecerá inalterada.

---
Este é um email automático, por favor não responda.
© ${new Date().getFullYear()} Sistema API. Todos os direitos reservados.
  `;

  return { subject, html, text };
};

module.exports = passwordResetEmail;
