import { router } from 'expo-router';
import { DiagnosisFlow } from '../components/DiagnosisFlow';

export default function Retake() {
  return <DiagnosisFlow firstTime={false} onDone={() => router.back()} />;
}
