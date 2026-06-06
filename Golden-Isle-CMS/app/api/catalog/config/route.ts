import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force dynamic execution since we are dealing with file reading and env variables
export const dynamic = 'force-dynamic';

const ENV_PATH = path.resolve(process.cwd(), '.env.local');

// Helper to parse .env.local
function readEnvLocal(): Record<string, string> {
  const config: Record<string, string> = {};
  try {
    if (fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          config[key] = value;
        }
      });
    }
  } catch (err) {
    console.error('❌ Error reading .env.local:', err);
  }
  return config;
}

// Helper to write to .env.local and update process.env
function writeEnvLocal(updates: Record<string, string>) {
  let content = '';
  try {
    if (fs.existsSync(ENV_PATH)) {
      content = fs.readFileSync(ENV_PATH, 'utf8');
    }
  } catch (err) {
    console.warn('⚠️ No existing .env.local found, creating new.');
  }

  const lines = content.split(/\r?\n/);
  const updatedKeys = new Set<string>();

  const newLines = lines.map((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      if (key in updates) {
        updatedKeys.add(key);
        // Update the value in process.env in memory
        process.env[key] = updates[key];
        return `${key}=${updates[key]}`;
      }
    }
    return line;
  });

  // Append any keys that weren't already in .env.local
  Object.entries(updates).forEach(([key, val]) => {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${val}`);
      process.env[key] = val;
    }
  });

  try {
    fs.writeFileSync(ENV_PATH, newLines.join('\n'), 'utf8');
    console.log('✅ Updated .env.local file and in-memory process.env successfully.');
    return true;
  } catch (err) {
    console.error('❌ Failed to write to .env.local:', err);
    return false;
  }
}

export async function GET() {
  const fileConfig = readEnvLocal();

  const metaCatalogId = fileConfig.META_CATALOG_ID || process.env.META_CATALOG_ID || '';
  const whatsappCatalogId = fileConfig.WHATSAPP_CATALOG_ID || process.env.WHATSAPP_CATALOG_ID || '';
  const isWhatsAppTokenConfigured = !!(fileConfig.WHATSAPP_TOKEN || process.env.WHATSAPP_TOKEN);

  return NextResponse.json({
    metaCatalogId,
    whatsappCatalogId,
    isWhatsAppTokenConfigured,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { metaCatalogId, whatsappCatalogId } = body;

    const updates: Record<string, string> = {};
    if (metaCatalogId !== undefined) {
      updates.META_CATALOG_ID = metaCatalogId.trim();
    }
    if (whatsappCatalogId !== undefined) {
      updates.WHATSAPP_CATALOG_ID = whatsappCatalogId.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No configuration provided' }, { status: 400 });
    }

    const success = writeEnvLocal(updates);
    if (success) {
      return NextResponse.json({ success: true, message: 'Settings saved successfully' });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to write configurations' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('❌ Error updating config:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
