export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('activityId');
  if (!id || id.length > 128 || id.includes('/')) return new Response(null,{status:400});
  try {
    const res = await fetch('https://dtntnqnu.vercel.app/api/public/registration-count?activityId=' + encodeURIComponent(id), {next:{revalidate:30}});
    if (!res.ok) return new Response(null,{status:res.status});
    const {count} = await res.json();
    return Response.json({count});
  } catch { return new Response(null,{status:503}); }
}
