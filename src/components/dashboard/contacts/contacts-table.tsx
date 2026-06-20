"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDistanceToNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ContactListItem } from "@/lib/data/contacts";
import { ContactDetailSheet } from "./contact-detail-sheet";

export function ContactsTable({ contacts }: { contacts: ContactListItem[] }) {
  const [query, setQuery] = useState("");
  const [openContact, setOpenContact] = useState<ContactListItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.name, c.email, c.phone, ...c.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [contacts, query]);

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      {/* Search */}
      <div className="relative min-w-0 sm:max-w-xs lg:sm:max-w-[20vw]">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 lg:left-[0.833vw] top-1/2 size-4 lg:size-[1.111vw] -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts…"
          className="h-9 lg:h-[2.5vw] w-full rounded-md lg:rounded-[0.556vw] border border-input bg-card pl-9 lg:pl-[2.5vw] pr-3 lg:pr-[0.833vw] text-sm lg:text-[0.903vw] outline-none focus-visible:border-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          size="sm"
          icon="search"
          title="No contacts match your search"
          description={`Nothing matches "${query.trim()}". Try a different name, tag, or email.`}
        />
      ) : (
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[44rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-xs lg:text-[0.764vw] uppercase tracking-wide text-muted-foreground">
                <Th className="pl-5 lg:pl-[1.528vw]">Name</Th>
                <Th>Contact</Th>
                <Th>Tags</Th>
                <Th>Jobs</Th>
                <Th>Last activity</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <Row key={c.id} contact={c} onOpen={setOpenContact} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ContactDetailSheet
        contact={openContact}
        open={openContact !== null}
        onOpenChange={(o) => !o && setOpenContact(null)}
      />
    </div>
  );
}

function Row({
  contact,
  onOpen,
}: {
  contact: ContactListItem;
  onOpen: (contact: ContactListItem) => void;
}) {
  return (
    <tr
      onClick={() => onOpen(contact)}
      className="group cursor-pointer text-sm lg:text-[0.903vw] transition-colors hover:bg-muted/40"
    >
      <td className="py-3 lg:py-[0.833vw] pl-5 lg:pl-[1.528vw] align-middle font-medium text-foreground">
        {contact.name ?? "Homeowner"}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle text-muted-foreground">
        {contact.email ?? contact.phone ?? "—"}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle">
        {contact.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 lg:gap-[0.278vw]">
            {contact.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex rounded-full bg-muted px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] text-foreground/70"
              >
                {t}
              </span>
            ))}
            {contact.tags.length > 3 ? (
              <span className="text-xs lg:text-[0.764vw] text-muted-foreground">
                +{contact.tags.length - 3}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle tabular-nums text-muted-foreground">
        {contact.jobCount}
      </td>
      <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] align-middle whitespace-nowrap text-muted-foreground">
        {formatDistanceToNow(new Date(contact.lastActivityAt))}
      </td>
    </tr>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw] font-medium", className)}>
      {children}
    </th>
  );
}
