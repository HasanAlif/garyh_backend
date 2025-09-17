export const VERIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Verify Your Email</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>Thank you for signing up! Your verification code is:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50;">{verificationCode}</span>
    </div>
    <p>Enter this code on the verification page to complete your registration.</p>
    <p>This code will expire in 15 minutes for security reasons.</p>
    <p>If you didn't create an account with us, please ignore this email.</p>
    <p>Best regards,<br>RVnBo.com Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export const PASSWORD_RESET_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Password Reset Successful</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>We're writing to confirm that your password has been successfully reset.</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #4CAF50; color: white; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; display: inline-block; font-size: 30px;">
        ✓
      </div>
    </div>
    <p>If you did not initiate this password reset, please contact our support team immediately.</p>
    <p>For security reasons, we recommend that you:</p>
    <ul>
      <li>Use a strong, unique password</li>
      <li>Enable two-factor authentication if available</li>
      <li>Avoid using the same password across multiple sites</li>
    </ul>
    <p>Thank you for helping us keep your account secure.</p>
    <p>Best regards,<br>RVnBo.com Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Password Reset Verification</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>We received a request to reset your password. If you didn't make this request, please ignore this email.</p>
    <p>Your password reset verification code is:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50; background-color: #f0f0f0; padding: 15px 20px; border-radius: 8px; display: inline-block;">{resetCode}</span>
    </div>
    <p>Enter this code on the password reset page to proceed with resetting your password.</p>
    <p>This code will expire in 15 minutes for security reasons.</p>
    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
    <p>Best regards,<br>RVnBo.com Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export const BOOKING_VERIFICATION_CODE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Booking Verification Code</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f6f9fc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(90deg, #4CAF50, #45a049);
      color: #ffffff;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px;
      text-align: center;
      color: #333333;
    }
    .code {
      font-size: 28px;
      font-weight: bold;
      background-color: #f0f4f8;
      padding: 15px 25px;
      border-radius: 8px;
      display: inline-block;
      letter-spacing: 4px;
      margin: 20px 0;
      color: #4CAF50;
    }
    .footer {
      background-color: #f0f4f8;
      padding: 15px;
      text-align: center;
      font-size: 12px;
      color: #777777;
    }
  </style>
</head>
<body>

  <div class="container">
    <div class="header">
      <h1>Booking Verification</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Thank you for booking with <b>RVnBO.com </b>!  
         Please use the following verification code to confirm your booking:</p>
      
      <div class="code">{CODE}</div>
      
      <p>This code will expire in <b>10 minutes</b>.</p>
      <p>If you did not initiate this booking, please ignore this email.</p>
    </div>
    <div class="footer">
      &copy; 2025 RVnBO.com , All rights reserved.
    </div>
  </div>

</body>
</html>

`;

export const WELCOME_USER_MAIL = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Welcome to RVnBO.com</title>
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
          <tr>
            <td align="center" style="background:linear-gradient(135deg, #4CAF50, #4CAF50); padding:30px;">
              <h1 style="color:#ffffff; margin:0; font-size:28px;">Dear {User}, Welcome to RVnBO.com!</h1>
              <p style="color:#dce6f5; margin:10px 0 0; font-size:16px;">Your journey starts here</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <h2 style="color:#333; margin-top:0;">Hello, Explorer! 🌎</h2>
              <p style="color:#555; font-size:16px; line-height:1.6;">
                Thank you for joining <strong>RVnBO.com</strong> — the easiest way to find and book RV van parking spots on your adventures.  
              </p>
              <p style="color:#555; font-size:16px; line-height:1.6;">
                Whether you're planning a weekend getaway or a cross-country road trip, we have got the perfect spots for you to park, rest, and recharge.  
              </p>
              <div style="text-align:center; margin:30px 0;">
                <a href="https://rvnbo.onrender.com/auth/login" target="_blank"
                   style="background:#4CAF50; color:#ffffff; text-decoration:none; font-size:16px; padding:14px 30px; border-radius:8px; display:inline-block;">
                   Start Exploring
                </a>
              </div>

              <p style="color:#555; font-size:15px; line-height:1.6; text-align:center;">
                We are excited to be part of your journey. Safe travels and happy parking! 🚐✨
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9f9f9; padding:20px; text-align:center; font-size:13px; color:#999;">
              <p style="margin:0;">&copy; 2025 RVnBO.com. All rights reserved.</p>
              <p style="margin:5px 0 0;">123 Adventure Road, Wanderlust City, USA</p>
              <p style="margin:5px 0 0;">
                <a href="https://rvnbo.onrender.com/privacy-policy" style="color:#4CAF50; text-decoration:none;">Privacy Policy</a> | 
                <a href="https://rvnbo.onrender.com/terms-conditions" style="color:#4CAF50; text-decoration:none;">Terms of Service</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`