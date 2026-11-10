// ads.txt (served at /ads.txt): declares Google as an authorised seller of
// Debatle's ad space, which AdSense requires. Built from the publisher id in
// NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-… → pub-…). 404 until that's set.

export const dynamic = "force-static";

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const pub = client?.replace(/^ca-/, "");
  if (!pub || !/^pub-\d+$/.test(pub)) return new Response("Not found", { status: 404 });
  // f08c47fec0942fa0 is Google's published certification authority id.
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
