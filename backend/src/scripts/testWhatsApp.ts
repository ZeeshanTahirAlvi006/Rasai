// src/scripts/testWhatsApp.ts
// Diagnostic script to verify Meta WhatsApp Cloud API credentials and send a test message.
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function runDiagnostics() {
  console.log('\n========================================');
  console.log('   Meta WhatsApp Cloud API Diagnostics  ');
  console.log('========================================\n');

  const accessToken = process.env.META_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID?.trim();
  const wabaId = process.env.META_WABA_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() || appSecret || 'ndr_webhook_token';

  console.log('Configuration Check:');
  console.log(` • META_PHONE_NUMBER_ID: ${phoneNumberId ? `✅ Present (${phoneNumberId})` : '❌ Missing'}`);
  console.log(` • META_WABA_ID:         ${wabaId ? `✅ Present (${wabaId})` : '⚠️ Missing (needed for template listing/sync)'}`);
  console.log(` • META_APP_SECRET:      ${appSecret ? '✅ Present' : '⚠️ Missing (needed for webhook signature verification)'}`);
  console.log(` • META_ACCESS_TOKEN:    ${accessToken ? `✅ Present (${accessToken.slice(0, 10)}...${accessToken.slice(-6)})` : '❌ Missing'}`);
  console.log(` • WEBHOOK_VERIFY_TOKEN: ${verifyToken ? `✅ Set to "${verifyToken}"` : '❌ Not set'}`);

  if (!phoneNumberId || !accessToken) {
    console.error('\n❌ Fatal: META_PHONE_NUMBER_ID and META_ACCESS_TOKEN are required in backend/.env.');
    console.log('\nPlease add your credentials to backend/.env and rerun:');
    console.log('  npm run test:whatsapp -- <recipient_phone_number>\n');
    process.exit(1);
  }

  // 1. Verify Phone Number ID & Token with Meta Graph API
  console.log('\nStep 1: Validating credentials with Meta Graph API...');
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data: any = await res.json();
    if (!res.ok) {
      console.error('❌ Meta Graph API Verification Failed:');
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log('✅ Credentials verified successfully!');
    console.log(` • Display Phone Number: ${data.display_phone_number || 'N/A'}`);
    console.log(` • Verified Name:         ${data.verified_name || 'N/A'}`);
    console.log(` • Quality Rating:        ${data.quality_rating || 'UNKNOWN'}`);
    console.log(` • Status:                ${data.code_verification_status || 'VERIFIED'}`);
  } catch (err: any) {
    console.error('❌ Connection error reaching Meta Graph API:', err.message);
    process.exit(1);
  }

  // 2. Optional: Send a test message
  const targetPhone = process.argv[2];
  if (!targetPhone) {
    console.log('\n💡 Tip: To send a test WhatsApp message to your phone, run:');
    console.log('   npm run test:whatsapp -- 923001234567\n');
    console.log('(Note: If using Meta Sandbox / Test Number, make sure your phone number is added to the "To" whitelist in Meta Developer Dashboard > WhatsApp > API Setup).\n');
    return;
  }

  // Clean phone number (remove +, spaces, dashes)
  const cleanPhone = targetPhone.replace(/[\s\-()+]/g, '');
  console.log(`\nStep 2: Sending test 'hello_world' template to +${cleanPhone}...`);

  const payload = {
    messaging_product: 'whatsapp',
    to: cleanPhone,
    type: 'template',
    template: {
      name: 'hello_world',
      language: {
        code: 'en_US',
      },
    },
  };

  try {
    const sendRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const sendData: any = await sendRes.json();
    if (!sendRes.ok) {
      console.error('\n❌ Message Dispatch Failed:');
      console.error(JSON.stringify(sendData, null, 2));
      if (sendData?.error?.code === 131030) {
        console.log('\n⚠️ Error 131030: Recipient phone number is not whitelisted in Meta Developer Portal.');
        console.log('   In test mode, add this number to the "To" numbers list in Meta Developer Console > WhatsApp > API Setup.');
      }
      process.exit(1);
    }

    console.log('\n🎉 SUCCESS! Test message sent to WhatsApp!');
    console.log(` • Meta Message ID (wamid): ${sendData.messages?.[0]?.id}`);
    console.log('Check your WhatsApp to view the delivered message.\n');
  } catch (err: any) {
    console.error('❌ Network error sending message:', err.message);
    process.exit(1);
  }
}

runDiagnostics().catch(console.error);
