import { router } from 'expo-router';
import { ProfileForm } from '../components/ProfileForm';
import { useAuth } from '../lib/auth';

export default function EditProfile() {
  const { profile } = useAuth();
  return <ProfileForm existing={profile} onSaved={() => router.back()} />;
}
