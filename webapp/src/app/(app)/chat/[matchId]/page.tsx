import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatRoom } from "./chat-room";

export const metadata: Metadata = { title: "メッセージ" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ChatPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  if (!UUID.test(matchId)) notFound();
  return <ChatRoom matchId={matchId} />;
}
