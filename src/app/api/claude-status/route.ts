import { NextResponse } from 'next/server';
import { findClaudeBinary, getClaudeVersion } from '@/lib/platform';
import { getActiveProvider } from '@/lib/db';

export async function GET() {
  try {
    // Check if there's an active provider
    const activeProvider = getActiveProvider();

    // If there's an active non-Anthropic provider, consider it "connected"
    if (activeProvider && activeProvider.provider_type !== 'anthropic') {
      return NextResponse.json({
        connected: true,
        version: null,
        providerName: activeProvider.name,
        providerType: activeProvider.provider_type,
        usesClaudeCode: false
      });
    }

    // For Anthropic providers or no provider, check Claude Code CLI
    const claudePath = findClaudeBinary();
    if (!claudePath) {
      return NextResponse.json({
        connected: false,
        version: null,
        usesClaudeCode: true
      });
    }
    const version = await getClaudeVersion(claudePath);
    return NextResponse.json({
      connected: !!version,
      version,
      usesClaudeCode: true
    });
  } catch {
    return NextResponse.json({
      connected: false,
      version: null,
      usesClaudeCode: true
    });
  }
}
