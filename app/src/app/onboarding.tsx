import { ProfileForm } from '../components/ProfileForm';

export default function Onboarding() {
  // 保存後は profile がセットされ、ルートのガードで自動的にタブ画面へ移動する
  return <ProfileForm />;
}
