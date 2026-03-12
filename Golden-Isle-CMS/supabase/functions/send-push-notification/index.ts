import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Gets a Google OAuth2 Access Token using a Service Account
 */
async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  // Ensure the private key is properly formatted (it might come with escaped newlines)
  const formattedKey = privateKey.replace(/\\n/g, '\n');
  
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const scope = 'https://www.googleapis.com/auth/firebase.messaging';
  
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600; // 1 hour expiry

  const jwt = await new jose.SignJWT({
    iss: clientEmail,
    sub: clientEmail,
    aud: tokenUrl,
    iat,
    exp,
    scope,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .sign(await jose.importPKCS8(formattedKey, 'RS256'));

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Failed to get access token: ${data.error_description || data.error}`);
  }
  
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const bodyText = await req.text();
    let payload: NotificationPayload;
    
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { token, title, body, data: customData } = payload;

    if (!token || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: token, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
    const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
    const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Missing Firebase environment variables');
      throw new Error('Server configuration error: Missing Firebase credentials');
    }

    // 1. Get OAuth2 Access Token
    const accessToken = await getAccessToken(clientEmail, privateKey);

    // 2. Send FCM Message
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    
    const fcmResponse = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title,
            body,
          },
          data: customData, // Optional data payload
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              click_action: 'TOP_STORY_ACTIVITY',
            },
          },
        },
      }),
    });

    const result = await fcmResponse.json();

    if (!fcmResponse.ok) {
      console.error('FCM Error Response:', result);
      return new Response(
        JSON.stringify({ error: 'FCM delivery failed', details: result }),
        { status: fcmResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Function Runtime Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
