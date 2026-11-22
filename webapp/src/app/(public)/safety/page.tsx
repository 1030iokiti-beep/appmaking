import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "安全に使うために" };

export default function SafetyPage() {
  return (
    <LegalDoc title="安全に使うために">
      <h2>こんな相手には注意</h2>
      <ul>
        <li>すぐに LINE など外部の連絡先を聞いてくる</li>
        <li>お金の話（投資・副業・借金・援助）をしてくる</li>
        <li>会ったことがないのに強い好意を示し、急かしてくる</li>
      </ul>
      <h2>初めて会うときは</h2>
      <ul>
        <li>昼間の人が多い場所（カフェなど）で会いましょう</li>
        <li>自宅や職場など、個人を特定できる情報はすぐに教えないようにしましょう</li>
        <li>家族や友人に、会う日時と場所を伝えておきましょう</li>
      </ul>
      <h2>困ったときは</h2>
      <p>プロフィールやトーク画面のメニューから、いつでも通報・ブロックができます。通報したことは相手に通知されません。身の危険を感じたときは、ためらわず警察（110番）に連絡してください。</p>
    </LegalDoc>
  );
}
