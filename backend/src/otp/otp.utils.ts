
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export const getOtpHtml = (otp: string): string => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>One-Time Password (OTP)</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f4f5f7;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 500px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .header {
          background-color: #2563eb;
          color: #ffffff;
          padding: 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .content {
          padding: 32px 24px;
          text-align: center;
          color: #334155;
        }
        .content p {
          margin-top: 0;
          font-size: 15px;
          line-height: 1.5;
        }
        .otp-code {
          display: inline-block;
          font-family: 'Courier New', Courier, monospace;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 6px;
          color: #1e293b;
          background-color: #f1f5f9;
          padding: 12px 24px;
          border-radius: 6px;
          margin: 24px 0;
          border: 1px dashed #cbd5e1;
        }
        .footer {
          padding: 16px 24px;
          background-color: #f8fafc;
          border-top: 1px solid #f1f5f9;
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verification Code</h1>
        </div>
        <div class="content">
          <p>Please use the following One-Time Password (OTP) to complete your verification:</p>
          <div class="otp-code">${otp}</div>
          <p>This code is valid for 10 minutes. Do not share this code with anyone.</p>
        </div>
        <div class="footer">
          If you did not request this code, please ignore this email.
        </div>
      </div>
    </body>
    </html>
  `;
};