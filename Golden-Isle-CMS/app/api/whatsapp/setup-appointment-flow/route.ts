import { NextResponse } from 'next/server';

// ONE-TIME SETUP: Create & Publish WhatsApp Appointment Flow
// Visit: GET /api/whatsapp/setup-appointment-flow?secret=golden_isle_secret_token
// Store the returned flow_id as WHATSAPP_APPOINTMENT_FLOW_ID.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== (process.env.WHATSAPP_VERIFY_TOKEN || 'golden_isle_secret_token')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!waToken || !waPhoneId) {
    return NextResponse.json({ error: 'Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID' }, { status: 500 });
  }

  const phoneRes = await fetch(
    `https://graph.facebook.com/v20.0/${waPhoneId}?fields=whatsapp_business_account`,
    { headers: { Authorization: `Bearer ${waToken}` } }
  );
  const phoneData = await phoneRes.json();
  const wabaId = phoneData?.whatsapp_business_account?.id || process.env.WHATSAPP_WABA_ID;

  if (!wabaId) {
    return NextResponse.json({
      error: 'Could not detect WABA ID. Please set WHATSAPP_WABA_ID env var manually.',
      phone_response: phoneData,
    }, { status: 500 });
  }

  const flowJson = {
    version: '6.1',
    screens: [
      {
        id: 'APPOINTMENT_FORM',
        title: 'Book Appointment',
        terminal: true,
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'TextHeading',
              text: 'Golden Isle Appointment',
            },
            {
              type: 'TextBody',
              text: 'Choose a date and time. Our team will confirm your appointment shortly.',
            },
            {
              type: 'Form',
              name: 'appointment_form',
              children: [
                {
                  type: 'TextInput',
                  label: 'Full Name',
                  name: 'appointment_name',
                  'input-type': 'text',
                  required: true,
                },
                {
                  type: 'TextInput',
                  label: 'Phone Number',
                  name: 'appointment_phone',
                  'input-type': 'phone',
                  required: true,
                },
                {
                  type: 'TextInput',
                  label: 'Email',
                  name: 'appointment_email',
                  'input-type': 'email',
                  required: false,
                },
                {
                  type: 'DatePicker',
                  label: 'Preferred Date',
                  name: 'appointment_date',
                  required: true,
                },
                {
                  type: 'Dropdown',
                  label: 'Preferred Time',
                  name: 'appointment_time',
                  required: true,
                  'data-source': [
                    { id: '10:00 AM', title: '10:00 AM' },
                    { id: '11:00 AM', title: '11:00 AM' },
                    { id: '2:00 PM', title: '2:00 PM' },
                    { id: '3:00 PM', title: '3:00 PM' },
                    { id: '4:00 PM', title: '4:00 PM' },
                  ],
                },
                {
                  type: 'Dropdown',
                  label: 'Purpose',
                  name: 'appointment_purpose',
                  required: true,
                  'data-source': [
                    { id: 'Shop stock', title: 'Shop stock' },
                    { id: 'Restaurant / bar', title: 'Restaurant / bar' },
                    { id: 'Event / party', title: 'Event / party' },
                    { id: 'Gift / premium', title: 'Gift / premium' },
                    { id: 'Other', title: 'Other' },
                  ],
                },
                {
                  type: 'TextInput',
                  label: 'Notes',
                  name: 'appointment_notes',
                  'input-type': 'text',
                  required: false,
                  'helper-text': 'Optional: budget, product type, or event size',
                },
                {
                  type: 'Footer',
                  label: 'Submit Appointment',
                  'on-click-action': {
                    name: 'complete',
                    payload: {},
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };

  const flowName = `GI Appointment Form v${Date.now()}`.slice(0, 60);
  const createRes = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/flows`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${waToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: flowName,
      categories: ['OTHER'],
    }),
  });

  const createData = await createRes.json();
  if (!createData.id) {
    return NextResponse.json({ error: 'Failed to create appointment flow', meta_response: createData }, { status: 500 });
  }

  const flowId: string = createData.id;
  const flowJsonBuffer = Buffer.from(JSON.stringify(flowJson), 'utf-8');
  const formData = new FormData();
  formData.append('file', new Blob([flowJsonBuffer], { type: 'application/json' }), 'flow.json');
  formData.append('name', 'flow.json');
  formData.append('asset_type', 'FLOW_JSON');

  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${flowId}/assets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${waToken}` },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (!uploadData.success) {
    return NextResponse.json({
      error: 'Appointment flow created but JSON upload failed. Flow is in DRAFT.',
      flow_id: flowId,
      upload_response: uploadData,
      action_required: `Set WHATSAPP_APPOINTMENT_FLOW_ID=${flowId} and test in draft mode.`,
    }, { status: 207 });
  }

  const publishRes = await fetch(`https://graph.facebook.com/v20.0/${flowId}/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${waToken}`,
      'Content-Type': 'application/json',
    },
  });

  const publishData = await publishRes.json();

  return NextResponse.json({
    success: true,
    flow_id: flowId,
    published: publishData.success === true,
    waba_id: wabaId,
    next_step: `Add this to env vars:\n\nWHATSAPP_APPOINTMENT_FLOW_ID=${flowId}\nWHATSAPP_WABA_ID=${wabaId}`,
    publish_response: publishData,
  });
}
