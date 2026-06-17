// The persistent ThreadView (in the messages layout) renders the inbox empty
// state and the active conversation. This route exists only so /messages and
// /messages/[id] resolve; it renders nothing itself.
export default function HomeownerMessagesIndex() {
  return null
}
