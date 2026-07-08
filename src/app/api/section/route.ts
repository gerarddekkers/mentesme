import { handleMutation } from "@/lib/auth/api";

export async function POST(req: Request) {
  const { clientId, sectionKey, data } = await req.json();
  return handleMutation((c, uid) =>
    c.query(
      `insert into section_data (client_id, section_key, data, updated_by, updated_at)
       values ($1, $2, $3, $4, now())
       on conflict (client_id, section_key)
       do update set data = excluded.data, updated_by = excluded.updated_by, updated_at = now()`,
      [clientId, sectionKey, data, uid]
    )
  );
}
