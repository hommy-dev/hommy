import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { getContacts } from "@/lib/data/contacts"
import { ContactsTable } from "@/components/dashboard/contacts/contacts-table"
import { EmptyState } from "@/components/ui/empty-state"

export default async function ContactsPage() {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return null // layout renders <NoCompany /> in this case

  const contacts = await getContacts(contractor.id)

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Contacts
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Homeowners you&apos;ve connected with — their jobs, your tags, and private notes.
        </p>
      </header>

      {contacts.length === 0 ? (
        <EmptyState
          icon="user-3"
          title="No contacts yet"
          description="Every homeowner you start a chat with lands here, so you can keep notes and pick the relationship back up later."
        />
      ) : (
        <ContactsTable contacts={contacts} />
      )}
    </div>
  )
}
