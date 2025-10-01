const nodemailer = require('nodemailer');

// Configuração do transporter de email
const createTransporter = () => {
  // Para desenvolvimento, usar Ethereal Email (serviço de teste)
  // Para produção, usar serviço real (Gmail, SendGrid, etc.)

  if (process.env.NODE_ENV === 'production') {
    // Configuração para produção (exemplo com Gmail)
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    // Para desenvolvimento, retornar transporter que será configurado com Ethereal
    return false;
  }
};

// Função para criar transporter de teste (desenvolvimento)
const createTestAccount = async () => {
  const testAccount = await nodemailer.createTestAccount();

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

// Função para enviar email
const sendEmail = async (options) => {
  try {
    let transporter = createTransporter();

    // Se não há transporter (desenvolvimento), criar conta de teste
    if (!transporter) {
      transporter = await createTestAccount();
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@api.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const info = await transporter.sendMail(mailOptions);

    // Em desenvolvimento, mostrar URL de preview
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw new Error('Falha ao enviar email');
  }
};

module.exports = {
  sendEmail
};
