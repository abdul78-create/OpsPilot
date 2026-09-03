'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  Organization, UserProfile, AiStatusResponse,
  getCurrentOrganization, fetchCurrentUser, fetchAiStatus, getUser
} from '@/lib/apiClient';

import { useApp } from '@/context/AppContext';

import { SettingsHeader } from './components/SettingsHeader';
import { SettingsNavigation, SettingsTab } from './components/SettingsNavigation';
import { AccountSettings } from './components/AccountSettings';
import { OrganizationSettings } from './components/OrganizationSettings';
import { TeamSettings } from './components/TeamSettings';
import { IntegrationsSettings } from './components/IntegrationsSettings';
import { SecuritySettings } from './components/SecuritySettings';
import { NotificationsSettings } from './components/NotificationsSettings';
import { AiSettings } from './components/AiSettings';
import { BillingSettings } from './components/BillingSettings';
import { PreferencesSettings } from './components/PreferencesSettings';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const { user, organization, aiStatus, updateUser, updateOrganization } = useApp();

  return (
    <DeveloperShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Settings 2.0 Header */}
        <SettingsHeader
          organization={organization}
          aiStatus={aiStatus}
        />

        {/* Settings 2.0 Body: Left Nav + Right Active Section */}
        <div className="flex flex-col md:flex-row items-start gap-8">
          <SettingsNavigation
            activeTab={activeTab}
            onSelectTab={setActiveTab}
          />

          <main className="flex-1 w-full min-w-0">
            {activeTab === 'account' && (
              <AccountSettings
                user={user}
                onUserUpdated={(updated) => updateUser(updated)}
              />
            )}

            {activeTab === 'organization' && (
              <OrganizationSettings
                organization={organization}
                onOrganizationUpdated={(updated) => updateOrganization(updated)}
              />
            )}

            {activeTab === 'team' && (
              <TeamSettings
                organizationId={organization?.id || ''}
              />
            )}

            {activeTab === 'integrations' && (
              <IntegrationsSettings
                aiStatus={aiStatus}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'security' && (
              <SecuritySettings
                organizationId={organization?.id || ''}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsSettings
                organizationId={organization?.id || ''}
              />
            )}

            {activeTab === 'ai' && (
              <AiSettings
                aiStatus={aiStatus}
              />
            )}

            {activeTab === 'billing' && (
              <BillingSettings
                organizationId={organization?.id || ''}
              />
            )}

            {activeTab === 'preferences' && (
              <PreferencesSettings />
            )}
          </main>
        </div>
      </div>
    </DeveloperShell>
  );
}
