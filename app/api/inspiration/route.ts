import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(req: Request) {
  const form = await req.formData();
  const image = form.get('image') as File | null;
  const prompt = (form.get('prompt') as string | null)
    ?? 'What travel destinations or experiences does this inspire?';

  if (!image) return Response.json({ error: 'No image provided' }, { status: 400 });

  const bytes = await image.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const mediaType = (image.type || 'image/jpeg') as
    'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: 'You are GeKnee AI Genie, a travel inspiration expert. Analyze images to identify travel destinations, vibes, and experiences. Be specific, enthusiastic, and actionable. Always suggest 2-3 real destinations.',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
