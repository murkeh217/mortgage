export const config = { runtime: 'edge' };

export default async function handler() {
  try {
    const res = await fetch(
      'https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MortgageAdvisorBot/1.0)',
          Accept: 'text/html',
        },
      }
    );

    if (!res.ok) throw new Error(`BoE returned HTTP ${res.status}`);

    const html = await res.text();

    const patterns = [
      /Bank Rate (?:maintained|increased|reduced|cut) at (\d+\.\d+)%/i,
      /Bank Rate at (\d+\.\d+)%/i,
      /held Bank Rate at (\d+\.\d+)%/i,
      /Current Bank Rate.*?(\d+\.\d+)%/is,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const rate = parseFloat(match[1]);
        if (!isNaN(rate) && rate > 0 && rate < 30) {
          return new Response(
            JSON.stringify({ rate, cached: false, fetchedAt: new Date().toISOString() }),
            {
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }
      }
    }

    throw new Error('Could not parse Bank Rate from BoE page');
  } catch (err) {
    return new Response(
      JSON.stringify({ rate: 3.75, fallback: true, error: String(err) }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
