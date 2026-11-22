import { DiagnosisFlow } from '../components/DiagnosisFlow';

// 初回の診断。保存すると love_type がセットされ、ルートのガードでタブ画面へ移動する
export default function FirstDiagnosis() {
  return <DiagnosisFlow firstTime onDone={() => {}} />;
}
