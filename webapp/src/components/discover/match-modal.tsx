"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Avatar } from "@/components/photo";

export type MatchInfo = { matchId: string; name: string; partnerPhoto: string | null; myPhoto: string | null; myName: string; score: number };

export function MatchModal({ match, onClose }: { match: MatchInfo | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {match && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_50%_30%,#d4536e_0%,#7a2d55_60%,#2b1b3a_100%)] p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="マッチング成立"
        >
          <div className="w-full max-w-sm text-center text-white">
            <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-xs font-bold tracking-[0.4em] text-gold-soft">
              IT&apos;S A MATCH
            </motion.p>
            <motion.h2 initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: "spring" }} className="mt-3 font-display text-4xl font-bold">
              マッチング成立
            </motion.h2>
            <div className="my-10 flex items-center justify-center">
              <motion.div initial={{ x: -60, rotate: -20, opacity: 0 }} animate={{ x: 10, rotate: -8, opacity: 1 }} transition={{ delay: 0.25, type: "spring" }}>
                <Avatar path={match.myPhoto} name={match.myName} size={120} className="ring-4 ring-white" />
              </motion.div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }} className="z-10 grid size-16 place-items-center rounded-full bg-white text-brand-deep shadow-xl">
                <div className="leading-none">
                  <div className="text-[9px] font-bold text-mute">AI相性</div>
                  <div className="font-display text-xl font-bold">{match.score}%</div>
                </div>
              </motion.div>
              <motion.div initial={{ x: 60, rotate: 20, opacity: 0 }} animate={{ x: -10, rotate: 8, opacity: 1 }} transition={{ delay: 0.25, type: "spring" }}>
                <Avatar path={match.partnerPhoto} name={match.name} size={120} className="ring-4 ring-white" />
              </motion.div>
            </div>
            <p className="text-sm leading-relaxed text-white/90">{match.name}さんもあなたにいいねしていました。<br />さっそくメッセージを送ってみましょう。</p>
            <div className="mt-8 space-y-3">
              <Link href={`/chat/${match.matchId}`} className="flex h-13 items-center justify-center rounded-full bg-white font-bold text-brand-deep transition active:scale-95">
                メッセージを送る
              </Link>
              <button onClick={onClose} className="h-11 w-full rounded-full font-bold text-white/85 hover:text-white">さがし続ける</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
