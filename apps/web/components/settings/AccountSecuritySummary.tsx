import { SettingsSection } from './ui/SettingsSection';
import { SettingsRow } from './ui/SettingsRow';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AccountSecuritySummary({ initialData }: { initialData: Record<string, any> }) {
  return (
    <SettingsSection 
      title="Account Security Summary" 
      description="Details about your authentication and account access."
    >
      <div className="space-y-0">
        <SettingsRow title="Authentication Provider">
          <div className="w-full bg-settings-bg/50 border border-settings-border p-3 rounded-xl font-bold text-sm text-settings-text-muted">
            {initialData?.provider || 'Email'}
          </div>
        </SettingsRow>
        
        <SettingsRow title="Last Sign In">
          <div className="w-full bg-settings-bg/50 border border-settings-border p-3 rounded-xl font-bold text-sm text-settings-text-muted">
            {initialData?.last_sign_in_at ? new Date(initialData.last_sign_in_at).toLocaleString() : 'Unknown'}
          </div>
        </SettingsRow>
      </div>
    </SettingsSection>
  );
}
