import { handleMutation } from "@/lib/auth/api";

export async function POST(req: Request) {
  const { clientId, sectionKey, body, authorInitials } = await req.json();
  return handleMutation(async (c, uid) => {
    const { rows } = await c.query(
      `insert into log_entries (client_id, section_key, body, author_initials, created_by)
       values ($1, $2, $3, $4, $5)
       returning id, body, author_initials, created_at`,
      [clientId, sectionKey, body, authorInitials, uid]
    );
    return rows[0];
  });
}
